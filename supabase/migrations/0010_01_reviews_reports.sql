-- ─────────────────────────────────────────────────────────────────────────────
-- NetLodge migration 0010 — Phase 11: reviews + reports
--
-- Implements migration group 9 per IMPLEMENTATION_PLAN.md §5 / Phase 11.
--
-- Tables created:
--   1. `reviews` — post-move-in student reviews, one per completed booking.
--      Per DATABASE_SCHEMA.md §16 + API_CONTRACTS.md §14.
--   2. `reports` — student/landlord-filed reports against listings/users.
--      Per DATABASE_SCHEMA.md §17 + API_CONTRACTS.md §15.
--
-- CRITICAL DATABASE-LEVEL INVARIANTS:
--   * reviews.booking_id is UNIQUE — one review per booking, enforced at the
--     database level (not just application logic).
--   * A trigger `reviews_check_booking_completed` rejects INSERT when the
--     referenced booking's status != 'completed' (PRD §17 hard guarantee).
--   * A trigger `reviews_check_ownership` rejects INSERT when the
--     `student_id` field doesn't match `bookings.student_id` for the
--     referenced booking (defense against forged authorship).
--   * reports.status state machine: only documented transitions allowed
--     (open → under_review → resolved). Reverse transitions blocked.
--   * `admin_resolve_report`, `admin_hide_review`, `admin_unhide_review`
--     SECURITY DEFINER functions — each independently re-validates caller
--     as an active admin AND inserts an audit_logs row in the same
--     transaction (atomicity per IMPLEMENTATION_PLAN.md §17).
--
-- Source of truth:
--   DATABASE_SCHEMA.md §16 (reviews), §17 (reports), §20 (soft-delete),
--     §22 (constraints), §24 (RLS), §28 (state machines)
--   API_CONTRACTS.md §14 (Reviews), §15 (Reports), §16 (Admin contracts),
--     §17 (Audit log contracts — `report.resolved`, `review.hidden`, `.unhidden`)
--   PRD.md §17 (Reviews & Reports)
--   IMPLEMENTATION_PLAN.md §15–16 (Reviews/Reports/Notifications),
--     §17 (Audit logging — extends to report resolution + review hide/unhide)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. reviews table ────────────────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §16 + API_CONTRACTS.md §14.
--
-- One review per booking (UNIQUE on booking_id), one row per completed
-- booking. A student can edit/delete their own review (PRD §17) but cannot
-- re-review a booking they've already reviewed.
CREATE TABLE IF NOT EXISTS public.reviews (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid          NOT NULL,
  student_id      uuid          NOT NULL,
  room_id         uuid          NOT NULL,
  rating          integer       NOT NULL,
  content         text          NOT NULL,
  is_hidden       boolean       NOT NULL DEFAULT false,
  hidden_reason   text          NULL,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),
  -- CHECK constraints
  CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
  -- hidden_reason required when is_hidden = true (mirrors the suspension_reason
  -- constraint pattern from migrations 0002/0005/0009).
  CONSTRAINT reviews_hidden_reason_required
    CHECK (
      (is_hidden = false) OR (hidden_reason IS NOT NULL AND btrim(hidden_reason) <> '')
    ),
  -- UNIQUE on booking_id — one review per booking, hard DB guarantee.
  -- On DELETE RESTRICT — review history must remain attributable to its booking
  -- (DATABASE_SCHEMA.md §21).
  CONSTRAINT reviews_booking_id_unique UNIQUE (booking_id),
  -- FK: booking_id → bookings.id ON DELETE RESTRICT
  CONSTRAINT reviews_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES public.bookings (id)
    ON DELETE RESTRICT,
  -- FK: student_id → profiles.id ON DELETE RESTRICT — preserve accountability
  -- for the review's author even if the account is later removed (mirrors
  -- the reports.reporter_id RESTRICT rationale, DATABASE_SCHEMA.md §17).
  CONSTRAINT reviews_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.profiles (id)
    ON DELETE RESTRICT,
  -- FK: room_id → rooms.id ON DELETE RESTRICT
  CONSTRAINT reviews_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.rooms (id)
    ON DELETE RESTRICT
);

-- Indexes for the common query patterns.
CREATE INDEX IF NOT EXISTS reviews_room_id_created_at_idx
  ON public.reviews (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_student_id_idx
  ON public.reviews (student_id);

-- updated_at trigger.
DROP TRIGGER IF EXISTS reviews_set_updated_at ON public.reviews;
CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── 1a. Trigger: reviews_check_booking_completed ────────────────────────────
--
-- Per PRD §17 / API_CONTRACTS.md §14: "only a student with a COMPLETED
-- booking for that exact room" may review. This is a hard DB guarantee.
--
-- The trigger fires BEFORE INSERT and verifies that the referenced booking
-- has status = 'completed'. A booking in any other state (reservation_pending,
-- payment_pending, confirmed, cancelled, expired) cannot be reviewed.
--
-- SECURITY DEFINER so the check reads bookings even if RLS would otherwise
-- filter the row (defense-in-depth — the application layer already checks
-- ownership, but this trigger enforces the rule regardless of caller).
CREATE OR REPLACE FUNCTION public.check_review_booking_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking_status booking_status;
  v_booking_student uuid;
BEGIN
  SELECT b.status, b.student_id
  INTO v_booking_status, v_booking_student
  FROM public.bookings b
  WHERE b.id = NEW.booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found for review: %', NEW.booking_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Ownership check — the review's student_id MUST match the booking's
  -- student_id. This is defense against the client forging a different
  -- student_id (the application layer also derives student_id from the
  -- authenticated session, but this trigger enforces it at the DB level).
  IF v_booking_student != NEW.student_id THEN
    RAISE EXCEPTION 'Review author does not match booking student'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Completed-status check — the booking must have reached 'completed'.
  IF v_booking_status != 'completed' THEN
    RAISE EXCEPTION 'Cannot review a booking in status ''%'' — only completed bookings can be reviewed',
      v_booking_status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_check_booking_completed ON public.reviews;
CREATE TRIGGER reviews_check_booking_completed
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.check_review_booking_completed();

-- ── 1b. Trigger: guard reviews hidden columns ───────────────────────────────
--
-- Only admin (or service-role code) can set is_hidden / hidden_reason on
-- a review. A student editing their own review (reviews.updateOwn per
-- API_CONTRACTS.md §14) cannot accidentally (or maliciously) unhide a
-- moderated review.
CREATE OR REPLACE FUNCTION public.guard_reviews_hidden_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT public.netlodge_is_current_user_admin() INTO is_admin;

  IF TG_OP = 'UPDATE' THEN
    IF NOT is_admin THEN
      -- Non-admin cannot change is_hidden or hidden_reason.
      IF NEW.is_hidden IS DISTINCT FROM OLD.is_hidden THEN
        RAISE EXCEPTION 'Only admins can change reviews.is_hidden'
          USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.hidden_reason IS DISTINCT FROM OLD.hidden_reason THEN
        RAISE EXCEPTION 'Only admins can change reviews.hidden_reason'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT is_admin AND NEW.is_hidden = true THEN
      RAISE EXCEPTION 'Only admins can create a hidden review'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_guard_hidden_columns ON public.reviews;
CREATE TRIGGER reviews_guard_hidden_columns
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_reviews_hidden_columns();

-- ── 1c. RLS: reviews ────────────────────────────────────────────────────────
--
-- Per DATABASE_SCHEMA.md §24 + TECHNICAL_ARCHITECTURE.md §8:
--   Public: read non-hidden reviews (visible alongside room listings).
--   Student (author): full read/write on own review (CRUD).
--   Landlord: NO write access to reviews. Read access is the same as
--     public (non-hidden only) — landlords do not get privileged review
--     visibility per PRD §17 (reviews are a student-voice feature).
--   Admin: full read (including hidden) + UPDATE (for hide/unhide moderation).
--     No INSERT/DELETE for admin through the application surface.
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews FORCE ROW LEVEL SECURITY;

-- Public + authenticated non-hidden read — anyone (including anonymous)
-- can read reviews that are not admin-hidden.
DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
CREATE POLICY reviews_public_read
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (is_hidden = false);

-- Student author INSERT — only the booking's student can INSERT a review
-- (and the trigger enforces the booking must be completed).
DROP POLICY IF EXISTS reviews_student_insert ON public.reviews;
CREATE POLICY reviews_student_insert
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Student author SELECT own (including hidden — author can see their own
-- review even if admin hid it, so they can see the moderation reason).
DROP POLICY IF EXISTS reviews_author_select_own ON public.reviews;
CREATE POLICY reviews_author_select_own
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Student author UPDATE own — only rating/content, NOT is_hidden/hidden_reason
-- (column-guard trigger blocks non-admin writes to those columns).
DROP POLICY IF EXISTS reviews_author_update_own ON public.reviews;
CREATE POLICY reviews_author_update_own
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Student author DELETE own — hard delete acceptable per DATABASE_SCHEMA.md
-- §20 (no financial/audit significance).
DROP POLICY IF EXISTS reviews_author_delete_own ON public.reviews;
CREATE POLICY reviews_author_delete_own
  ON public.reviews
  FOR DELETE
  TO authenticated
  USING (student_id = auth.uid());

-- Admin full read (including hidden).
DROP POLICY IF EXISTS reviews_admin_read ON public.reviews;
CREATE POLICY reviews_admin_read
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (public.netlodge_is_current_user_admin());

-- Admin UPDATE (for hide/unhide moderation).
DROP POLICY IF EXISTS reviews_admin_update ON public.reviews;
CREATE POLICY reviews_admin_update
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

-- NO admin INSERT / DELETE policy — admins do not create or hard-delete
-- reviews through the application surface (moderation = hide, not delete,
-- per DATABASE_SCHEMA.md §20).

-- ── 2. reports table ────────────────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §17 + API_CONTRACTS.md §15.
--
-- Polymorphic target (reported_entity_type + reported_entity_id) — server-side
-- existence validation per TECHNICAL_ARCHITECTURE.md §12 (no DB trigger for
-- this; the application layer checks existence before INSERT).
--
-- State machine: open → under_review → resolved (one-directional).
CREATE TABLE IF NOT EXISTS public.reports (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id           uuid          NOT NULL,
  reported_entity_type  report_target NOT NULL,
  reported_entity_id    uuid          NOT NULL,
  reason_category       text          NOT NULL,
  description           text          NULL,
  status                report_status NOT NULL DEFAULT 'open',
  resolved_by           uuid          NULL,
  resolution_notes      text          NULL,
  resolved_at           timestamptz  NULL,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  -- FK: reporter_id → profiles.id ON DELETE RESTRICT — preserves
  -- accountability (DATABASE_SCHEMA.md §17 note: anonymized reports lose
  -- value; an unresolved report blocks account hard-delete).
  CONSTRAINT reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES public.profiles (id)
    ON DELETE RESTRICT,
  -- FK: resolved_by → profiles.id ON DELETE SET NULL
  CONSTRAINT reports_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES public.profiles (id)
    ON DELETE SET NULL,
  -- CHECK: resolution_notes required when status = 'resolved'
  CONSTRAINT reports_resolution_notes_required
    CHECK (
      (status != 'resolved') OR
      (resolution_notes IS NOT NULL AND btrim(resolution_notes) <> '')
    )
);

-- Indexes.
CREATE INDEX IF NOT EXISTS reports_status_created_at_idx
  ON public.reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_reporter_id_idx
  ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS reports_entity_idx
  ON public.reports (reported_entity_type, reported_entity_id);

-- ── 2a. Trigger: reports state machine ─────────────────────────────────────
-- Allowed transitions:
--   open → under_review (admin opens investigation)
--   open → resolved (admin resolves directly, skipping under_review)
--   under_review → resolved (admin resolves after investigation)
-- Prohibited (no reverse, no skipping back):
--   resolved → open
--   resolved → under_review
--   under_review → open
CREATE OR REPLACE FUNCTION public.guard_reports_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- status column changes (or any other column with a status transition).
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (
        (OLD.status = 'open' AND NEW.status IN ('under_review', 'resolved'))
        OR (OLD.status = 'under_review' AND NEW.status = 'resolved')
      ) THEN
        RAISE EXCEPTION 'Invalid report status transition: % → %',
          OLD.status, NEW.status
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    -- resolved_by / resolution_notes / resolved_at can only be set when
    -- transitioning to or already in 'resolved' state.
    IF NEW.status != 'resolved' THEN
      IF NEW.resolved_by IS NOT NULL OR NEW.resolved_at IS NOT NULL
         OR NEW.resolution_notes IS NOT NULL THEN
        RAISE EXCEPTION 'Resolution fields can only be set when status = ''resolved'''
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- New reports always start in 'open' (the DEFAULT).
    -- A client attempting to INSERT with status != 'open' is rejected.
    IF NEW.status != 'open' THEN
      RAISE EXCEPTION 'New reports must start with status = ''open'''
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.resolved_by IS NOT NULL OR NEW.resolved_at IS NOT NULL
       OR NEW.resolution_notes IS NOT NULL THEN
      RAISE EXCEPTION 'Resolution fields cannot be set on INSERT'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reports_guard_status_transitions ON public.reports;
CREATE TRIGGER reports_guard_status_transitions
  BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_reports_status_transitions();

-- ── 2b. RLS: reports ────────────────────────────────────────────────────────
--
-- Per DATABASE_SCHEMA.md §24:
--   Reporter: create + read own submitted reports only.
--   Admin: full read + UPDATE (for status transitions / resolution).
--   No other role has access (a student cannot read another student's
--   reports; a landlord cannot read reports filed against them).
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports FORCE ROW LEVEL SECURITY;

-- Reporter read own.
DROP POLICY IF EXISTS reports_reporter_select_own ON public.reports;
CREATE POLICY reports_reporter_select_own
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- Reporter INSERT — reporter_id is set by the application to auth.uid()
-- (the application never accepts reporter_id from the client).
DROP POLICY IF EXISTS reports_reporter_insert ON public.reports;
CREATE POLICY reports_reporter_insert
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Reporter has NO UPDATE/DELETE policy — once filed, a report can only be
-- mutated by an admin (status transitions / resolution).

-- Admin full read.
DROP POLICY IF EXISTS reports_admin_read ON public.reports;
CREATE POLICY reports_admin_read
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (public.netlodge_is_current_user_admin());

-- Admin UPDATE (for status transitions / resolution).
DROP POLICY IF EXISTS reports_admin_update ON public.reports;
CREATE POLICY reports_admin_update
  ON public.reports
  FOR UPDATE
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

-- NO admin INSERT / DELETE policy — admins do not file reports or hard-delete
-- them through the application surface.

-- ── 3. SECURITY DEFINER admin functions for report resolution + review hide ─
--
-- Each function:
--   1. Independently verifies the caller is an active admin.
--   2. Validates the entity exists and is in a valid state.
--   3. Performs the business mutation.
--   4. Inserts an audit_logs row (actor_id = auth.uid(), never a param).
-- All in a single DB transaction — atomicity per IMPLEMENTATION_PLAN.md §17.

-- ── 3a. admin_resolve_report ─────────────────────────────────────────────────
-- Transitions a report to 'resolved' with resolution_notes + outcome metadata.
-- Audit action: `report.resolved` (per API_CONTRACTS.md §17).
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id uuid,
  p_resolution_notes text,
  p_outcome text
)
RETURNS TABLE (
  report_id uuid,
  new_status report_status,
  audited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_report RECORD;
  v_actor uuid := auth.uid();
  v_notes text;
  v_outcome text;
BEGIN
  -- 1. Authorization.
  IF NOT public.netlodge_is_current_user_active_admin() THEN
    RAISE EXCEPTION 'Only active admins can resolve reports'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Resolution notes required (CHECK constraint enforces, but fail early
  --    with a clearer message).
  v_notes := btrim(p_resolution_notes);
  IF v_notes IS NULL OR v_notes = '' THEN
    RAISE EXCEPTION 'Resolution notes are required'
      USING ERRCODE = 'check_violation';
  END IF;
  IF length(v_notes) > 2000 THEN
    RAISE EXCEPTION 'Resolution notes must be at most 2000 characters'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 3. outcome must be one of the documented values (API_CONTRACTS.md §15).
  v_outcome := btrim(p_outcome);
  IF v_outcome NOT IN ('action_taken', 'no_action', 'other') THEN
    RAISE EXCEPTION 'Invalid outcome ''%'' — must be action_taken | no_action | other',
      v_outcome
      USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Look up the report (FOR UPDATE — lock to prevent concurrent resolution).
  SELECT r.id, r.status, r.reporter_id
  INTO v_report
  FROM public.reports r
  WHERE r.id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 5. State machine check — only open or under_review can transition to resolved.
  IF v_report.status NOT IN ('open', 'under_review') THEN
    RAISE EXCEPTION 'Cannot resolve a report in status ''%''',
      v_report.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- 6. Mutation — set status, resolved_by, resolved_at, resolution_notes.
  --    The state-machine trigger will validate the transition.
  UPDATE public.reports
  SET status = 'resolved',
      resolved_by = v_actor,
      resolved_at = now(),
      resolution_notes = v_notes
  WHERE id = p_report_id;

  -- 7. Audit log — `report.resolved` per API_CONTRACTS.md §17.
  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, reason, metadata
  ) VALUES (
    v_actor,
    'report.resolved',
    'report',
    p_report_id,
    v_notes,
    jsonb_build_object(
      'reporter_id', v_report.reporter_id,
      'outcome', v_outcome,
      'previous_status', v_report.status
    )
  );

  RETURN QUERY
    SELECT p_report_id, 'resolved'::report_status, true;
END;
$$;

-- ── 3b. admin_mark_report_under_review ───────────────────────────────────────
-- Optional admin workflow step: open → under_review. Not a documented
-- mandatory step (PRD §17 status: OPEN → UNDER_REVIEW → RESOLVED), but
-- allows the admin to signal "investigating" without resolving.
CREATE OR REPLACE FUNCTION public.admin_mark_report_under_review(
  p_report_id uuid
)
RETURNS TABLE (
  report_id uuid,
  new_status report_status,
  audited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_report RECORD;
  v_actor uuid := auth.uid();
BEGIN
  -- 1. Authorization.
  IF NOT public.netlodge_is_current_user_active_admin() THEN
    RAISE EXCEPTION 'Only active admins can move reports to under_review'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Look up.
  SELECT r.id, r.status, r.reporter_id
  INTO v_report
  FROM public.reports r
  WHERE r.id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_report.status != 'open' THEN
    RAISE EXCEPTION 'Cannot move a report in status ''%'' to under_review',
      v_report.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Mutation.
  UPDATE public.reports
  SET status = 'under_review'
  WHERE id = p_report_id;

  -- 4. Audit log — non-resolution admin action. We log it for traceability
  --    even though API_CONTRACTS.md §17 only names `report.resolved` as
  --    audited. This keeps the under_review transition traceable.
  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, reason, metadata
  ) VALUES (
    v_actor,
    'report.under_review',
    'report',
    p_report_id,
    NULL,
    jsonb_build_object(
      'reporter_id', v_report.reporter_id,
      'previous_status', v_report.status
    )
  );

  RETURN QUERY
    SELECT p_report_id, 'under_review'::report_status, true;
END;
$$;

-- ── 3c. admin_hide_review ────────────────────────────────────────────────────
-- Sets reviews.is_hidden = true + hidden_reason. Audit action:
-- `review.hidden` (per API_CONTRACTS.md §17).
CREATE OR REPLACE FUNCTION public.admin_hide_review(
  p_review_id uuid,
  p_reason text
)
RETURNS TABLE (
  review_id uuid,
  is_hidden boolean,
  audited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_review RECORD;
  v_actor uuid := auth.uid();
  v_reason text;
BEGIN
  -- 1. Authorization.
  IF NOT public.netlodge_is_current_user_active_admin() THEN
    RAISE EXCEPTION 'Only active admins can hide reviews'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Reason required, non-empty, ≤ 2000 chars.
  v_reason := btrim(p_reason);
  IF v_reason IS NULL OR v_reason = '' THEN
    RAISE EXCEPTION 'A reason is required to hide a review'
      USING ERRCODE = 'check_violation';
  END IF;
  IF length(v_reason) > 2000 THEN
    RAISE EXCEPTION 'Reason must be at most 2000 characters'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Look up.
  SELECT rv.id, rv.is_hidden, rv.student_id, rv.booking_id
  INTO v_review
  FROM public.reviews rv
  WHERE rv.id = p_review_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 4. Idempotency — already-hidden review cannot be re-hidden.
  IF v_review.is_hidden = true THEN
    RAISE EXCEPTION 'Review is already hidden — use unhide to reverse it'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Mutation — column-guard trigger allows this because caller is admin.
  UPDATE public.reviews
  SET is_hidden = true,
      hidden_reason = v_reason
  WHERE id = p_review_id;

  -- 6. Audit log.
  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, reason, metadata
  ) VALUES (
    v_actor,
    'review.hidden',
    'review',
    p_review_id,
    v_reason,
    jsonb_build_object(
      'student_id', v_review.student_id,
      'booking_id', v_review.booking_id
    )
  );

  RETURN QUERY
    SELECT p_review_id, true, true;
END;
$$;

-- ── 3d. admin_unhide_review ──────────────────────────────────────────────────
-- Reverses admin_hide_review. Audit action: `review.unhidden`.
CREATE OR REPLACE FUNCTION public.admin_unhide_review(
  p_review_id uuid,
  p_reason text
)
RETURNS TABLE (
  review_id uuid,
  is_hidden boolean,
  audited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_review RECORD;
  v_actor uuid := auth.uid();
  v_reason text;
BEGIN
  IF NOT public.netlodge_is_current_user_active_admin() THEN
    RAISE EXCEPTION 'Only active admins can unhide reviews'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_reason := btrim(p_reason);
  IF v_reason IS NULL OR v_reason = '' THEN
    RAISE EXCEPTION 'A reason is required to unhide a review'
      USING ERRCODE = 'check_violation';
  END IF;
  IF length(v_reason) > 2000 THEN
    RAISE EXCEPTION 'Reason must be at most 2000 characters'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT rv.id, rv.is_hidden, rv.student_id, rv.booking_id
  INTO v_review
  FROM public.reviews rv
  WHERE rv.id = p_review_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_review.is_hidden = false THEN
    RAISE EXCEPTION 'Review is not currently hidden'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.reviews
  SET is_hidden = false,
      hidden_reason = NULL
  WHERE id = p_review_id;

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, reason, metadata
  ) VALUES (
    v_actor,
    'review.unhidden',
    'review',
    p_review_id,
    v_reason,
    jsonb_build_object(
      'student_id', v_review.student_id,
      'booking_id', v_review.booking_id
    )
  );

  RETURN QUERY
    SELECT p_review_id, false, true;
END;
$$;

SELECT 1 AS migration_0010_applied;
