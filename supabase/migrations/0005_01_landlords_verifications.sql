-- ─────────────────────────────────────────────────────────────────────────────
-- NetLodge migration 0005 — Phase 4: landlords + landlord_verifications
--
-- Implements the landlord verification domain per DATABASE_SCHEMA.md §4.2/§4.3
-- + TECHNICAL_ARCHITECTURE.md §7 (landlord verification state model) +
-- API_CONTRACTS.md §7 (Landlord Verification Contracts) + IMPLEMENTATION_PLAN
-- §8 stages 1–6.
--
-- Tables created:
--   1. `landlords`               — 1:1 extension of `profiles` for landlord
--                                   role only. Carries the denormalized
--                                   `current_verification_status` cache +
--                                   `verification_valid_until` + suspension
--                                   state (separate from
--                                   `profiles.account_status`).
--   2. `landlord_verifications`  — APPEND-ONLY history of every verification
--                                   submission + decision. The review
--                                   outcome (decision/reviewed_by/etc.) is
--                                   written as a one-time UPDATE to the
--                                   pending row (DATABASE_SCHEMA §4.3
--                                   "one exception to append-only").
--                                   Resubmission creates a NEW row — the
--                                   rejected row is preserved permanently.
--
-- Source of truth:
--   DATABASE_SCHEMA.md §4.2 (landlords), §4.3 (landlord_verifications),
--   §7 (verification state model), §22 (constraints), §24 (RLS)
--   TECHNICAL_ARCHITECTURE.md §20 (state machine enforcement), §8 (RLS)
--   API_CONTRACTS.md §7 (verification contracts), §19 (error model)
--   IMPLEMENTATION_PLAN.md §5 migration group 4, §8 stages 1–6, §22 Phase 4
-- ─────────────────────────────────────────────────────────────────────────────

-- ── landlords table ────────────────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §4.2: 1:1 extension of `profiles` for role='landlord'
-- only. Carries the denormalized `current_verification_status` cache for
-- fast RLS/query checks (the history table remains the source of truth).
CREATE TABLE IF NOT EXISTS public.landlords (
  profile_id                    uuid                PRIMARY KEY,
  current_verification_status   verification_status NOT NULL DEFAULT 'unsubmitted',
  verification_valid_until      timestamptz         NULL,
  is_suspended                  boolean             NOT NULL DEFAULT false,
  suspension_reason            text                NULL,
  created_at                    timestamptz         NOT NULL DEFAULT now(),
  updated_at                    timestamptz         NOT NULL DEFAULT now(),
  -- Constraint: suspension_reason required when is_suspended = true
  -- (DATABASE_SCHEMA.md §22).
  CONSTRAINT landlords_suspension_reason_required
    CHECK (
      is_suspended = false
      OR suspension_reason IS NOT NULL
    ),
  -- FK to profiles — CASCADE so deleting the profile removes the landlord
  -- record. The profile row itself cascades from auth.users (Phase 1).
  CONSTRAINT landlords_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles (id)
    ON DELETE CASCADE
);

-- updated_at trigger — same pattern as profiles (Phase 1).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS landlords_set_updated_at ON public.landlords;
CREATE TRIGGER landlords_set_updated_at
  BEFORE UPDATE ON public.landlords
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── landlord_verifications table ──────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §4.3: APPEND-ONLY. One row per submission/decision
-- event. The review outcome is a one-time UPDATE to the pending row's
-- `reviewed_by`/`reviewed_at`/`decision`/`decision_reason` columns — that's
-- the documented "one exception to append-only". Resubmission creates a
-- NEW row; the rejected row is preserved permanently.
CREATE TABLE IF NOT EXISTS public.landlord_verifications (
  id                            uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id                   uuid                NOT NULL,
  status                        verification_status NOT NULL DEFAULT 'submitted',
  submitted_id_reference        text                NOT NULL,
  submitted_ownership_reference text                NOT NULL,
  submitted_at                  timestamptz         NOT NULL DEFAULT now(),
  reviewed_by                    uuid                NULL,
  reviewed_at                   timestamptz         NULL,
  decision                      decision_type      NULL,
  decision_reason               text                NULL,
  -- Constraint: decision_reason required when decision = 'rejected'
  -- (DATABASE_SCHEMA.md §22).
  CONSTRAINT landlord_verifications_decision_reason_required
    CHECK (
      decision IS DISTINCT FROM 'rejected'
      OR decision_reason IS NOT NULL
    ),
  -- FK to landlords — CASCADE so deleting the landlord removes verifications.
  CONSTRAINT landlord_verifications_landlord_id_fkey
    FOREIGN KEY (landlord_id) REFERENCES public.landlords (profile_id)
    ON DELETE CASCADE,
  -- FK to profiles (admin reviewer) — SET NULL if the admin account is
  -- deleted (preserve the audit trail).
  CONSTRAINT landlord_verifications_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES public.profiles (id)
    ON DELETE SET NULL
);

-- Index: admin verification queue — latest-first ordering per landlord.
-- Per DATABASE_SCHEMA.md §23.
CREATE INDEX IF NOT EXISTS landlord_verifications_landlord_id_submitted_at_idx
  ON public.landlord_verifications (landlord_id, submitted_at DESC);

-- Index: admin queue of pending items specifically (partial index —
-- covers only statuses that are in the queue).
CREATE INDEX IF NOT EXISTS landlord_verifications_pending_status_idx
  ON public.landlord_verifications (status)
  WHERE status IN ('submitted', 'under_review');

-- ── Append-only protection trigger ─────────────────────────────────────────
--
-- Per Phase 4 task spec §18: enforce append-only at the database level so a
-- malicious authenticated landlord cannot use direct Supabase API access to:
--   - UPDATE landlord_verifications SET status = 'approved'
--   - UPDATE landlord_verifications SET landlord_id = '<other landlord>'
--   - UPDATE landlord_verifications SET submitted_id_reference = '<arbitrary>'
--   - DELETE FROM landlord_verifications
--   - etc.
--
-- Allowed UPDATEs (the documented "one exception to append-only"):
--   - Setting `status` from 'submitted' → 'under_review' (admin queue pickup).
--   - Setting `status` from ('submitted' OR 'under_review') → terminal
--     ('approved' OR 'rejected') by an admin (the review action).
--   - Filling `reviewed_by` / `reviewed_at` / `decision` / `decision_reason`
--     on a row that previously had NULL decision (one-time fill).
--
-- Blocked UPDATEs:
--   - Any change to `landlord_id`, `submitted_id_reference`,
--     `submitted_ownership_reference`, `submitted_at`.
--   - Any UPDATE attempted by a non-admin (the column-guard trigger checks
--     via `netlodge_is_current_user_admin()` from Phase 1).
--   - Any UPDATE that tries to set `decision` on a row that already has a
--     non-NULL decision (prevents re-deciding an already-decided row).
--   - Status transitions that skip the documented state machine.
--
-- DELETE: blocked entirely for non-admin. Admins can delete via the
-- service-role client (which bypasses RLS) — that's the manual admin-
-- triggered cleanup path (Phase 3's deleteVerificationDocumentCore pattern,
-- not exposed as a routine operation).

CREATE OR REPLACE FUNCTION public.guard_landlord_verifications_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Determine if the current call context is permitted to perform admin
  -- operations. Uses the Phase 1 helper — service-role (auth.uid() IS NULL)
  -- OR authenticated user with profiles.role = 'admin'.
  SELECT public.netlodge_is_current_user_admin() INTO is_admin;

  -- ── DELETE: block entirely for non-admin ────────────────────────────────
  IF TG_OP = 'DELETE' THEN
    IF NOT is_admin THEN
      RAISE EXCEPTION 'landlord_verifications rows cannot be deleted by non-admin (append-only audit trail)'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- ── UPDATE: enforce append-only on protected columns + admin-only on
  -- decision fields + state-machine on status transitions. ────────────────
  IF TG_OP = 'UPDATE' THEN
    -- Protected columns: NEVER changeable via UPDATE, regardless of role.
    -- These are the submission-time facts — they define what was submitted
    -- and by whom. Even admin can't rewrite history here.
    IF NEW.landlord_id IS DISTINCT FROM OLD.landlord_id THEN
      RAISE EXCEPTION 'landlord_id is not updateable (append-only)'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.submitted_id_reference IS DISTINCT FROM OLD.submitted_id_reference THEN
      RAISE EXCEPTION 'submitted_id_reference is not updateable (append-only)'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.submitted_ownership_reference IS DISTINCT FROM OLD.submitted_ownership_reference THEN
      RAISE EXCEPTION 'submitted_ownership_reference is not updateable (append-only)'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
      RAISE EXCEPTION 'submitted_at is not updateable (append-only)'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'id is not updateable (append-only)'
        USING ERRCODE = 'check_violation';
    END IF;

    -- Decision fields (reviewed_by / reviewed_at / decision / decision_reason):
    -- admin-only. A landlord cannot self-approve or change someone else's
    -- decision. Service-role (auth.uid() IS NULL) bypasses this — that's
    -- the privileged server-code path used by the admin Server Action.
    --
    -- EXCEPTION: `reviewed_by` transitioning from non-NULL to NULL is
    -- allowed (the FK ON DELETE SET NULL cascade path — when an admin's
    -- profile is deleted, the FK sets reviewed_by to NULL on existing
    -- verification rows. This preserves the audit trail per
    -- DATABASE_SCHEMA.md §4.3: "preserve the record even if the admin
    -- account is later removed".)
    IF (
         (NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
          AND NOT (OLD.reviewed_by IS NOT NULL AND NEW.reviewed_by IS NULL))
      OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
      OR NEW.decision IS DISTINCT FROM OLD.decision
      OR NEW.decision_reason IS DISTINCT FROM OLD.decision_reason
    ) THEN
      IF NOT is_admin THEN
        RAISE EXCEPTION 'decision fields can only be modified by an admin (append-only audit trail)'
          USING ERRCODE = 'check_violation';
      END IF;

      -- One-time fill: a row that already has a non-NULL decision cannot
      -- be re-decided. (You can't un-reject or un-approve — resubmission
      -- creates a NEW row, per the documented lifecycle.)
      IF OLD.decision IS NOT NULL THEN
        RAISE EXCEPTION 'decision has already been recorded on this row (append-only — resubmission creates a new row)'
          USING ERRCODE = 'check_violation';
      END IF;

      -- Status must transition to a terminal state when decision is set.
      IF NEW.decision = 'approved' AND NEW.status NOT IN ('approved') THEN
        RAISE EXCEPTION 'decision = approved requires status = approved (state machine)'
          USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.decision = 'rejected' AND NEW.status NOT IN ('rejected') THEN
        RAISE EXCEPTION 'decision = rejected requires status = rejected (state machine)'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    -- Status transitions: enforce the state machine.
    -- Allowed:
    --   submitted → under_review       (admin queue pickup)
    --   submitted → approved           (admin direct approve, skipping queue)
    --   submitted → rejected           (admin direct reject, skipping queue)
    --   under_review → approved        (admin approve after pickup)
    --   under_review → rejected        (admin reject after pickup)
    -- Blocked:
    --   approved → anything             (terminal — resubmit creates new row)
    --   rejected → anything             (terminal — resubmit creates new row)
    --   Anything not in the allowed list.
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT is_admin THEN
        RAISE EXCEPTION 'status can only be modified by an admin'
          USING ERRCODE = 'check_violation';
      END IF;

      IF NOT (
        (OLD.status = 'submitted' AND NEW.status IN ('under_review', 'approved', 'rejected'))
        OR (OLD.status = 'under_review' AND NEW.status IN ('approved', 'rejected'))
      ) THEN
        RAISE EXCEPTION 'invalid status transition: % → % (state machine)', OLD.status, NEW.status
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS landlord_verifications_guard_append_only ON public.landlord_verifications;
CREATE TRIGGER landlord_verifications_guard_append_only
  BEFORE UPDATE OR DELETE ON public.landlord_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_landlord_verifications_append_only();

-- ── Status synchronization trigger ─────────────────────────────────────────
--
-- Per Phase 4 task spec §19: `landlord_verifications.status` (per-row) and
-- `landlords.current_verification_status` (denormalized cache) must not
-- drift. The history table is the source of truth; the landlords column
-- is a maintained cache.
--
-- This trigger fires AFTER any UPDATE to landlord_verifications.status.
-- It updates the corresponding landlords.current_verification_status row
-- to match. On approval, it also sets `verification_valid_until` to
-- 6 months from now (PRODUCT_BRIEF §9).
--
-- SECURITY DEFINER + explicit search_path — same pattern as Phase 1's
-- `netlodge_is_current_user_admin()`. The function runs as the table owner
-- (superuser during migration), bypassing RLS on the landlords table so it
-- can update the cache row even when the caller is an authenticated admin
-- (whose RLS UPDATE policy on landlords doesn't grant status writes).
--
-- IMPORTANT: this trigger does NOT replace the application-layer transaction.
-- The admin Server Action should still update landlord_verifications.status
-- and landlords.current_verification_status together in a single DB
-- transaction (defense in depth). This trigger is the second-line guarantee
-- that the cache cannot drift even if the application forgets.
CREATE OR REPLACE FUNCTION public.sync_landlord_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    -- Update the landlords cache row.
    IF NEW.status = 'approved' THEN
      UPDATE public.landlords
      SET current_verification_status = 'approved',
          verification_valid_until = now() + interval '6 months'
      WHERE profile_id = NEW.landlord_id;
    ELSIF NEW.status = 'rejected' THEN
      UPDATE public.landlords
      SET current_verification_status = 'rejected'
      WHERE profile_id = NEW.landlord_id;
    ELSIF NEW.status = 'under_review' THEN
      UPDATE public.landlords
      SET current_verification_status = 'under_review'
      WHERE profile_id = NEW.landlord_id;
    ELSIF NEW.status = 'submitted' THEN
      -- Resubmission: status goes back to 'submitted'.
      UPDATE public.landlords
      SET current_verification_status = 'submitted'
      WHERE profile_id = NEW.landlord_id;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- On insert (new submission), update landlords cache to 'submitted'.
    UPDATE public.landlords
    SET current_verification_status = 'submitted'
    WHERE profile_id = NEW.landlord_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS landlord_verifications_sync_status ON public.landlord_verifications;
CREATE TRIGGER landlord_verifications_sync_status
  AFTER INSERT OR UPDATE OF status ON public.landlord_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_landlord_verification_status();

-- ── RLS: landlords ──────────────────────────────────────────────────────────
--
-- Per DATABASE_SCHEMA.md §24 + TECHNICAL_ARCHITECTURE.md §8:
--   - Landlord: read own row. Update only non-protected fields (NOT
--     current_verification_status — that's admin-controlled via the
--     sync trigger above).
--   - Admin: read all, update all (including current_verification_status
--     for manual corrections — but the sync trigger is the primary path).
--   - Student / anonymous: no access.
ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlords FORCE ROW LEVEL SECURITY;

-- Landlord self-read.
DROP POLICY IF EXISTS landlords_self_select ON public.landlords;
CREATE POLICY landlords_self_select
  ON public.landlords
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.netlodge_is_current_user_admin()
  );

-- Landlord self-update of non-protected fields (is_suspended is admin-only
-- in practice — but the trigger below also blocks it).
-- Per DATABASE_SCHEMA.md §24: "Landlord: full read/write on own" for
-- non-protected fields. current_verification_status is NOT landlord-writable.
DROP POLICY IF EXISTS landlords_self_update ON public.landlords;
CREATE POLICY landlords_self_update
  ON public.landlords
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Admin full access (read + update, including protected fields).
DROP POLICY IF EXISTS landlords_admin_all ON public.landlords;
CREATE POLICY landlords_admin_all
  ON public.landlords
  FOR ALL
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

-- NO INSERT policy — landlords rows are created ONLY by the registration
-- Server Action (Phase 4 update to Phase 2's registerLandlord) via the
-- service-role client (bypasses RLS). This closes the "client creates a
-- landlord row for someone else's profile" attack at the DB level.
-- NO DELETE policy — landlords rows cascade from profiles (Phase 1).

-- ── Column-guard trigger: protect current_verification_status on landlords ─
--
-- Per Phase 4 task spec §5: "A landlord cannot modify their own verification
-- status directly." The RLS self-update policy above allows the UPDATE on
-- the row, but this trigger blocks changes to current_verification_status
-- (and verification_valid_until + is_suspended + suspension_reason — those
-- are admin-controlled) by non-admin callers.
CREATE OR REPLACE FUNCTION public.guard_landlord_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.netlodge_is_current_user_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.current_verification_status IS DISTINCT FROM OLD.current_verification_status THEN
    RAISE EXCEPTION 'current_verification_status is not landlord-writable (admin-only)'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.verification_valid_until IS DISTINCT FROM OLD.verification_valid_until THEN
    RAISE EXCEPTION 'verification_valid_until is not landlord-writable (admin-only)'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
    RAISE EXCEPTION 'is_suspended is not landlord-writable (admin-only)'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason THEN
    RAISE EXCEPTION 'suspension_reason is not landlord-writable (admin-only)'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS landlords_guard_protected_columns ON public.landlords;
CREATE TRIGGER landlords_guard_protected_columns
  BEFORE UPDATE OF current_verification_status, verification_valid_until,
                   is_suspended, suspension_reason ON public.landlords
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_landlord_protected_columns();

-- ── RLS: landlord_verifications ────────────────────────────────────────────
--
-- Per DATABASE_SCHEMA.md §24 + TECHNICAL_ARCHITECTURE.md §8:
--   - Landlord: read own verifications (full history). Insert new
--     submission rows for themselves (with status='submitted' — the trigger
--     above enforces append-only + state machine). NO UPDATE, NO DELETE
--     (the append-only trigger blocks these for non-admins).
--   - Admin: read all. UPDATE (for the one-time review action — the trigger
--     enforces which columns can be updated). NO DELETE through the
--     application surface (only via service-role client for manual cleanup).
--   - Student / anonymous: no access.
ALTER TABLE public.landlord_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_verifications FORCE ROW LEVEL SECURITY;

-- Landlord self-read (full history).
DROP POLICY IF EXISTS landlord_verifications_self_select ON public.landlord_verifications;
CREATE POLICY landlord_verifications_self_select
  ON public.landlord_verifications
  FOR SELECT
  TO authenticated
  USING (
    landlord_id = auth.uid()
    OR public.netlodge_is_current_user_admin()
  );

-- Landlord self-insert (new submission). WITH CHECK enforces landlord_id
-- matches auth.uid() — closes Attack #2 (Landlord A submits with Landlord B's ID).
DROP POLICY IF EXISTS landlord_verifications_self_insert ON public.landlord_verifications;
CREATE POLICY landlord_verifications_self_insert
  ON public.landlord_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    landlord_id = auth.uid()
    AND status = 'submitted'
    -- submitted_at, reviewed_by, reviewed_at, decision, decision_reason
    -- must all be defaults (NULL or now()) — the landlord can't pre-fill
    -- review fields. The append-only trigger enforces this further on UPDATE.
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND decision IS NULL
    AND decision_reason IS NULL
  );

-- Admin full read.
DROP POLICY IF EXISTS landlord_verifications_admin_select ON public.landlord_verifications;
CREATE POLICY landlord_verifications_admin_select
  ON public.landlord_verifications
  FOR SELECT
  TO authenticated
  USING (public.netlodge_is_current_user_admin());

-- Landlord self-update — allows the UPDATE to pass RLS so the
-- append-only trigger can fire and produce a meaningful error message.
-- The trigger blocks all status/decision/landlord_id/document-reference
-- changes by non-admin callers. This gives defense-in-depth: even if RLS
-- were misconfigured to allow updates, the trigger still blocks them.
--
-- The policy allows UPDATE on rows owned by the landlord (id = auth.uid())
-- AND with the WITH CHECK that the landlord_id stays the same (can't move
-- the row to another landlord).
DROP POLICY IF EXISTS landlord_verifications_self_update ON public.landlord_verifications;
CREATE POLICY landlord_verifications_self_update
  ON public.landlord_verifications
  FOR UPDATE
  TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Landlord self-DELETE — allows DELETE to pass RLS so the append-only
-- trigger can fire and produce a meaningful error message. The trigger
-- blocks ALL non-admin DELETEs (the audit trail must be preserved).
DROP POLICY IF EXISTS landlord_verifications_self_delete ON public.landlord_verifications;
CREATE POLICY landlord_verifications_self_delete
  ON public.landlord_verifications
  FOR DELETE
  TO authenticated
  USING (landlord_id = auth.uid() OR public.netlodge_is_current_user_admin());

-- Admin UPDATE (for the one-time review action). The append-only trigger
-- enforces which columns can be updated and which state transitions are
-- allowed — this policy just gates the row-level authorization.
DROP POLICY IF EXISTS landlord_verifications_admin_update ON public.landlord_verifications;
CREATE POLICY landlord_verifications_admin_update
  ON public.landlord_verifications
  FOR UPDATE
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

-- NO DELETE policy — the append-only trigger blocks DELETE for non-admin.
-- Admin deletes use the service-role client (bypasses RLS) — manual cleanup
-- path, not exposed as a routine application operation.

SELECT 1 AS migration_0005_applied;
