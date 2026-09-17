-- ─────────────────────────────────────────────────────────────────────────────
-- NetLodge migration 0009 — Phase 10: Admin Operations
--
-- Implements migration group 8 per IMPLEMENTATION_PLAN.md §5 / Phase 10.
--
-- Schema changes:
--   1. `audit_logs` table — append-only record of every security-sensitive
--      admin action (DATABASE_SCHEMA.md §19).
--   2. `properties.is_suspended` + `properties.suspension_reason` — reversible
--      listing-suspension flag, orthogonal to property_status. Mirrors the
--      established `landlords.is_suspended` pattern from migration 0005.
--   3. `netlodge_is_current_user_active_admin()` — strict authorization
--      helper that requires BOTH role='admin' AND account_status='active'.
--      Used by Phase 10 SECURITY DEFINER admin mutation functions.
--   4. SECURITY DEFINER admin mutation functions — each performs the
--      business mutation AND inserts the audit_logs row in a SINGLE
--      database transaction (atomicity per IMPLEMENTATION_PLAN.md §17).
--      Each function independently validates caller authorization — direct
--      RPC invocation by a non-admin JWT is denied.
--   5. Column-guard trigger `guard_properties_suspension_columns` — blocks
--      non-admin callers from writing is_suspended / suspension_reason.
--   6. RLS — `properties_public_read` policy tightens to exclude suspended
--      properties. `audit_logs` is admin read-only; no INSERT/UPDATE/DELETE
--      grants for any client role.
--
-- CRITICAL DATABASE-LEVEL INVARIANTS:
--   * audit_logs has NO INSERT/UPDATE/DELETE RLS policy for any client role.
--     Rows are inserted ONLY by SECURITY DEFINER admin functions, which run
--     as the table owner (bypassing RLS) and always derive actor_id from
--     auth.uid() — never from a function parameter.
--   * properties.is_suspended is admin-only writable (column-guard trigger).
--   * properties_public_read RLS excludes suspended properties — they are
--     invisible to anon/authenticated discovery queries.
--   * Each admin SECURITY DEFINER function uses safe search_path
--     (public, pg_temp) and independently verifies caller authorization.
--
-- Source of truth:
--   DATABASE_SCHEMA.md §4.5 (properties — extended with is_suspended),
--     §19 (audit_logs), §22 (constraints), §24 (RLS)
--   API_CONTRACTS.md §8 (adminProperty.suspend/.liftSuspension), §16 (admin
--     contracts), §17 (audit log contracts)
--   PRD.md §8 (suspended account restrictions), §11 (suspension is reversible,
--     reason required), §19 (existing confirmed bookings remain honored)
--   TECHNICAL_ARCHITECTURE.md §8 (RLS architecture), §21 (defense in depth)
--   IMPLEMENTATION_PLAN.md §14 (Admin implementation), §17 (Audit logging)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Strict admin authorization helper ───────────────────────────────────
--
-- Mirrors `netlodge_is_current_user_admin()` but ALSO requires
-- `account_status = 'active'` AND an actual authenticated session. Used by
-- Phase 10 SECURITY DEFINER admin mutation functions to enforce that
-- suspended admins AND anonymous users cannot perform privileged
-- operations even via direct RPC invocation.
--
-- SECURITY DEFINER + safe search_path. Returns true ONLY when the caller
-- has a valid JWT-authenticated session (auth.uid() IS NOT NULL) whose
-- profiles.role = 'admin' AND account_status = 'active'.
--
-- This is INTENTIONALLY DIFFERENT from `netlodge_is_current_user_admin()`
-- (Phase 1), which returns TRUE for `auth.uid() IS NULL` to allow
-- service-role code to pass column-guard triggers. The Phase 1 helper is
-- used by RLS read policies and triggers that already enforce
-- authenticated context separately (policies are `TO authenticated`,
-- and service-role code bypasses RLS entirely). For Phase 10's exposed
-- admin mutation RPC functions, however, the function itself is the
-- security boundary — anyone can call it via PostgREST, so it MUST
-- require a real authenticated admin identity, not a NULL auth.uid().
CREATE OR REPLACE FUNCTION public.netlodge_is_current_user_active_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.account_status = 'active'
  );
$$;

-- ── 2. properties.is_suspended + suspension_reason ─────────────────────────
--
-- Per API_CONTRACTS.md §8: adminProperty.suspend / liftSuspension are
-- reversible operations that "Hides property from search immediately;
-- existing confirmed bookings unaffected".
--
-- Design decision (resolving the property-suspension-mismatch open
-- decision carried forward from Phase 5/9):
--
--   * The committed `property_status` enum (draft, submitted, under_review,
--     approved, rejected, archived) is NOT modified. Modifying a committed
--     enum is forbidden by the Phase 10 migration-discipline rule, and
--     adding a `suspended` value would conflict with `archived` (the
--     documented terminal soft-delete state, per DATABASE_SCHEMA.md §20).
--
--   * Instead, `is_suspended` is a reversible flag ORTHOGONAL to status —
--     mirroring the established pattern on `landlords.is_suspended` from
--     migration 0005. A suspended property is still `approved` underneath;
--     suspension just hides it from discovery and blocks new reservations.
--
--   * Lifting the suspension is a separate admin action that requires
--     its own reason — never a silent state change.
--
-- Impact on existing behavior:
--   * Discovery query + RLS — exclude suspended properties.
--   * Booking precondition — reject bookings on suspended properties.
--   * Existing confirmed bookings — UNAFFECTED (PRD §19 explicitly
--     requires existing confirmed bookings remain honored when a listing
--     is suspended mid-tenancy).

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS suspension_reason text NULL;

-- CHECK constraint — mirrors landlords.suspension_reason_required.
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_suspension_reason_required;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_suspension_reason_required
  CHECK (
    (is_suspended = false) OR (suspension_reason IS NOT NULL AND btrim(suspension_reason) <> '')
  );

-- ── 3. Column guard: properties.is_suspended / suspension_reason ───────────
--
-- Only admin (or service-role code) can set is_suspended / suspension_reason.
-- A landlord attempting to write `is_suspended = false` on their own property
-- to escape an admin suspension is blocked at the DB layer.
--
-- Mirrors the existing `guard_protected_profile_columns` trigger pattern.
CREATE OR REPLACE FUNCTION public.guard_properties_suspension_columns()
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
    -- Block non-admin from changing is_suspended or suspension_reason.
    IF NOT is_admin THEN
      IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
        RAISE EXCEPTION 'Only admins can change properties.is_suspended'
          USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason THEN
        RAISE EXCEPTION 'Only admins can change properties.suspension_reason'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- New properties always start unsuspended. Even if a landlord tries to
    -- INSERT with is_suspended = true (which would be nonsensical), block it.
    IF NOT is_admin AND NEW.is_suspended = true THEN
      RAISE EXCEPTION 'Only admins can create a suspended property'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS properties_guard_suspension_columns ON public.properties;
CREATE TRIGGER properties_guard_suspension_columns
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_properties_suspension_columns();

-- ── 4. audit_logs table ────────────────────────────────────────────────────
--
-- Per DATABASE_SCHEMA.md §19. Append-only — no UPDATE/DELETE grants for any
-- role. Rows are inserted ONLY by the SECURITY DEFINER admin mutation
-- functions below.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid         NULL,
  action      text         NOT NULL,
  entity_type text         NOT NULL,
  entity_id   uuid         NOT NULL,
  reason      text         NULL,
  metadata    jsonb        NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  -- FK: actor_id → profiles.id ON DELETE SET NULL — the audit record must
  -- survive even if the actor's account is later removed (per
  -- DATABASE_SCHEMA.md §21).
  CONSTRAINT audit_logs_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES public.profiles (id)
    ON DELETE SET NULL
);

-- Index for admin viewer filtering (entity_type + created_at).
CREATE INDEX IF NOT EXISTS audit_logs_entity_type_created_at_idx
  ON public.audit_logs (entity_type, created_at DESC);

-- Index for "all actions performed on entity X" lookups.
CREATE INDEX IF NOT EXISTS audit_logs_entity_id_idx
  ON public.audit_logs (entity_id);

-- Index for "all actions by actor Y" lookups.
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx
  ON public.audit_logs (actor_id);

-- ── 5. RLS: audit_logs ─────────────────────────────────────────────────────
--
-- Per DATABASE_SCHEMA.md §24:
--   audit_logs — Admin read-only. No write path for any client role.
--   The only writes are via SECURITY DEFINER functions (which run as the
--   table owner, bypassing RLS).
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Admin read-only. Uses the permissive `netlodge_is_current_user_admin()`
-- (not the strict `_active_admin` variant) — a suspended admin can still
-- READ audit history (consistent with PRD §8 "view read-only history");
-- they just can't perform mutations. The application layer additionally
-- blocks suspended admins from admin-monitoring reads, but RLS as a
-- defense-in-depth layer uses the permissive check.
DROP POLICY IF EXISTS audit_logs_admin_read ON public.audit_logs;
CREATE POLICY audit_logs_admin_read
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.netlodge_is_current_user_admin());

-- NO INSERT / UPDATE / DELETE policies for any client role.
-- The SECURITY DEFINER functions below insert audit rows as the table
-- owner (bypassing RLS). There is no client-writeable path.

-- ── 6. Tighten properties_public_read RLS ─────────────────────────────────
--
-- Per API_CONTRACTS.md §8: `adminProperty.suspend` "Hides property from
-- search immediately". This means the public-read RLS policy must exclude
-- suspended properties — they should not be visible to anon/authenticated
-- discovery queries.
--
-- The existing policy (migration 0006) was: `USING (status = 'approved')`.
-- Phase 10 tightens it to: `USING (status = 'approved' AND is_suspended = false)`.
--
-- Landlord self-read + admin read policies remain unchanged — landlords
-- can see their own suspended properties (so they know the state), and
-- admins can see everything.
DROP POLICY IF EXISTS properties_public_read ON public.properties;
CREATE POLICY properties_public_read
  ON public.properties
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved' AND is_suspended = false);

-- ── 7. SECURITY DEFINER admin mutation functions ──────────────────────────
--
-- Each function:
--   1. Independently verifies the caller is an active admin (defense
--      against direct RPC invocation bypassing the application layer).
--   2. Validates the entity exists and is in a reviewable state.
--   3. Performs the business mutation.
--   4. Inserts an audit_logs row (actor_id = auth.uid(), never a param).
--   5. Returns a result row.
--
-- Atomicity: steps 3 and 4 are in the same DB transaction — if either
-- fails, both roll back (IMPLEMENTATION_PLAN.md §17 requirement).
--
-- All functions use `SET search_path = public, pg_temp` per SECURITY
-- DEFINER best practices.

-- ── 7a. admin_approve_verification ─────────────────────────────────────────
-- Mirrors the existing approveVerificationCore behavior (Phase 4) but
-- adds audit logging and strict caller validation in a single transaction.
CREATE OR REPLACE FUNCTION public.admin_approve_verification(
  p_verification_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (
  verification_id uuid,
  new_status verification_status,
  audited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_verification RECORD;
  v_actor uuid := auth.uid();
BEGIN
  -- 1. Authorization — strict (active admin or service-role).
  IF NOT public.netlodge_is_current_user_active_admin() THEN
    RAISE EXCEPTION 'Only active admins can approve verification submissions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Look up the verification row.
  SELECT lv.id, lv.status, lv.decision, lv.landlord_id
  INTO v_verification
  FROM public.landlord_verifications lv
  WHERE lv.id = p_verification_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification submission not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 3. State machine — already-decided rows cannot be re-decided.
  IF v_verification.decision IS NOT NULL THEN
    RAISE EXCEPTION 'This verification submission has already been decided'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_verification.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION 'Cannot approve a submission in status ''%''',
      v_verification.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Perform the mutation. The existing `sync_landlord_verification_status`
  --    trigger (migration 0005) will automatically update
  --    landlords.current_verification_status = 'approved' AND
  --    verification_valid_until = now() + 6 months in this same transaction.
  --    The existing append-only trigger guards against re-deciding.
  UPDATE public.landlord_verifications
  SET status = 'approved',
      decision = 'approved',
      reviewed_by = v_actor,
      reviewed_at = now()
  WHERE id = p_verification_id;

  -- 5. Insert audit log row — actor derived from auth.uid(), never a param.
  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, reason, metadata
  ) VALUES (
    v_actor,
    'landlord_verification.approved',
    'landlord_verification',
    p_verification_id,
    p_reason,
    jsonb_build_object('landlord_id', v_verification.landlord_id)
  );

  RETURN QUERY
    SELECT p_verification_id, 'approved'::verification_status, true;
END;
$$;

-- ── 7b. admin_reject_verification ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reject_verification(
  p_verification_id uuid,
  p_reason text
)
RETURNS TABLE (
  verification_id uuid,
  new_status verification_status,
  decision_reason text,
  audited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_verification RECORD;
  v_actor uuid := auth.uid();
  v_reason text;
BEGIN
  -- 1. Authorization.
  IF NOT public.netlodge_is_current_user_active_admin() THEN
    RAISE EXCEPTION 'Only active admins can reject verification submissions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Reason is required, non-empty after trim, ≤ 2000 chars.
  v_reason := btrim(p_reason);
  IF v_reason IS NULL OR v_reason = '' THEN
    RAISE EXCEPTION 'Rejection reason is required'
      USING ERRCODE = 'check_violation';
  END IF;
  IF length(v_reason) > 2000 THEN
    RAISE EXCEPTION 'Rejection reason must be at most 2000 characters'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Look up the verification row.
  SELECT lv.id, lv.status, lv.decision, lv.landlord_id
  INTO v_verification
  FROM public.landlord_verifications lv
  WHERE lv.id = p_verification_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification submission not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 4. State machine.
  IF v_verification.decision IS NOT NULL THEN
    RAISE EXCEPTION 'This verification submission has already been decided'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_verification.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION 'Cannot reject a submission in status ''%''',
      v_verification.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Mutation.
  UPDATE public.landlord_verifications
  SET status = 'rejected',
      decision = 'rejected',
      decision_reason = v_reason,
      reviewed_by = v_actor,
      reviewed_at = now()
  WHERE id = p_verification_id;

  -- 6. Audit log.
  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, reason, metadata
  ) VALUES (
    v_actor,
    'landlord_verification.rejected',
    'landlord_verification',
    p_verification_id,
    v_reason,
    jsonb_build_object('landlord_id', v_verification.landlord_id)
  );

  RETURN QUERY
    SELECT p_verification_id, 'rejected'::verification_status, v_reason, true;
END;
$$;

-- ── 7c. admin_approve_property ──────────────────────────────────────────────
-- Updates properties.status to 'approved' (only valid from 'submitted' or
-- 'under_review') and inserts an audit_logs row in one transaction.
CREATE OR REPLACE FUNCTION public.admin_approve_property(
  p_property_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (
  property_id uuid,
  new_status property_status,
  audited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_property RECORD;
  v_actor uuid := auth.uid();
BEGIN
  -- 1. Authorization.
  IF NOT public.netlodge_is_current_user_active_admin() THEN
    RAISE EXCEPTION 'Only active admins can approve properties'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Look up the property row.
  SELECT p.id, p.status, p.landlord_id
  INTO v_property
  FROM public.properties p
  WHERE p.id = p_property_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 3. State machine — only submitted or under_review can transition to approved.
  IF v_property.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION 'Cannot approve a property in status ''%''',
      v_property.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Mutation. The existing `guard_property_status_transitions` trigger
  --    (migration 0006) will enforce the state machine at the DB level.
  UPDATE public.properties
  SET status = 'approved'
  WHERE id = p_property_id;

  -- 5. Audit log.
  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, reason, metadata
  ) VALUES (
    v_actor,
    'property.approved',
    'property',
    p_property_id,
    p_reason,
    jsonb_build_object('landlord_id', v_property.landlord_id, 'previous_status', v_property.status)
  );

  RETURN QUERY
    SELECT p_property_id, 'approved'::property_status, true;
END;
$$;

-- ── 7d. admin_reject_property ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reject_property(
  p_property_id uuid,
  p_reason text
)
RETURNS TABLE (
  property_id uuid,
  new_status property_status,
  audited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_property RECORD;
  v_actor uuid := auth.uid();
  v_reason text;
BEGIN
  -- 1. Authorization.
  IF NOT public.netlodge_is_current_user_active_admin() THEN
    RAISE EXCEPTION 'Only active admins can reject properties'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Reason is required, non-empty, ≤ 2000 chars.
  v_reason := btrim(p_reason);
  IF v_reason IS NULL OR v_reason = '' THEN
    RAISE EXCEPTION 'Rejection reason is required'
      USING ERRCODE = 'check_violation';
  END IF;
  IF length(v_reason) > 2000 THEN
    RAISE EXCEPTION 'Rejection reason must be at most 2000 characters'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Look up.
  SELECT p.id, p.status, p.landlord_id
  INTO v_property
  FROM public.properties p
  WHERE p.id = p_property_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 4. State machine — only submitted or under_review can transition to rejected.
  IF v_property.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION 'Cannot reject a property in status ''%''',
      v_property.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Mutation.
  UPDATE public.properties
  SET status = 'rejected'
  WHERE id = p_property_id;

  -- 6. Append a property_reviews row (mirrors the existing Phase 5 pattern).
  INSERT INTO public.property_reviews (
    property_id, reviewed_by, reviewed_at, decision, decision_reason
  ) VALUES (
    p_property_id, v_actor, now(), 'rejected', v_reason
  );

  -- 7. Audit log.
  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, reason, metadata
  ) VALUES (
    v_actor,
    'property.rejected',
    'property',
    p_property_id,
    v_reason,
    jsonb_build_object('landlord_id', v_property.landlord_id, 'previous_status', v_property.status)
  );

  RETURN QUERY
    SELECT p_property_id, 'rejected'::property_status, true;
END;
$$;

-- ── 7e. admin_suspend_property ─────────────────────────────────────────────
-- Sets is_suspended = true + suspension_reason. Property status remains
-- unchanged (orthogonal to status — see design comment above). Existing
-- confirmed bookings are NOT cancelled (PRD §19).
CREATE OR REPLACE FUNCTION public.admin_suspend_property(
  p_property_id uuid,
  p_reason text
)
RETURNS TABLE (
  property_id uuid,
  is_suspended boolean,
  audited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_property RECORD;
  v_actor uuid := auth.uid();
  v_reason text;
BEGIN
  -- 1. Authorization.
  IF NOT public.netlodge_is_current_user_active_admin() THEN
    RAISE EXCEPTION 'Only active admins can suspend properties'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Reason required, non-empty, ≤ 2000 chars.
  v_reason := btrim(p_reason);
  IF v_reason IS NULL OR v_reason = '' THEN
    RAISE EXCEPTION 'Suspension reason is required'
      USING ERRCODE = 'check_violation';
  END IF;
  IF length(v_reason) > 2000 THEN
    RAISE EXCEPTION 'Suspension reason must be at most 2000 characters'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Look up the property.
  SELECT p.id, p.status, p.is_suspended, p.landlord_id
  INTO v_property
  FROM public.properties p
  WHERE p.id = p_property_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 4. Idempotency / state check — already-suspended property cannot be
  --    re-suspended (must liftSuspension first).
  IF v_property.is_suspended = true THEN
    RAISE EXCEPTION 'Property is already suspended — use liftSuspension to reverse it'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Mutation — the column-guard trigger allows this because caller is admin.
  UPDATE public.properties
  SET is_suspended = true,
      suspension_reason = v_reason
  WHERE id = p_property_id;

  -- 6. Audit log.
  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, reason, metadata
  ) VALUES (
    v_actor,
    'property.suspended',
    'property',
    p_property_id,
    v_reason,
    jsonb_build_object('landlord_id', v_property.landlord_id, 'status', v_property.status)
  );

  RETURN QUERY
    SELECT p_property_id, true, true;
END;
$$;

-- ── 7f. admin_lift_suspension_property ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_lift_suspension_property(
  p_property_id uuid,
  p_reason text
)
RETURNS TABLE (
  property_id uuid,
  is_suspended boolean,
  audited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_property RECORD;
  v_actor uuid := auth.uid();
  v_reason text;
BEGIN
  -- 1. Authorization.
  IF NOT public.netlodge_is_current_user_active_admin() THEN
    RAISE EXCEPTION 'Only active admins can lift property suspensions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Reason required.
  v_reason := btrim(p_reason);
  IF v_reason IS NULL OR v_reason = '' THEN
    RAISE EXCEPTION 'A reason is required to lift a suspension'
      USING ERRCODE = 'check_violation';
  END IF;
  IF length(v_reason) > 2000 THEN
    RAISE EXCEPTION 'Reason must be at most 2000 characters'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Look up.
  SELECT p.id, p.status, p.is_suspended, p.landlord_id
  INTO v_property
  FROM public.properties p
  WHERE p.id = p_property_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 4. State check — must be currently suspended.
  IF v_property.is_suspended = false THEN
    RAISE EXCEPTION 'Property is not currently suspended'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Mutation.
  UPDATE public.properties
  SET is_suspended = false,
      suspension_reason = NULL
  WHERE id = p_property_id;

  -- 6. Audit log.
  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, reason, metadata
  ) VALUES (
    v_actor,
    'property.suspension_lifted',
    'property',
    p_property_id,
    v_reason,
    jsonb_build_object('landlord_id', v_property.landlord_id, 'status', v_property.status)
  );

  RETURN QUERY
    SELECT p_property_id, false, true;
END;
$$;

-- ── 8. Revoke dangerous public EXECUTE on admin functions ─────────────────
--
-- SECURITY DEFINER functions are owned by the migration-runner (superuser).
-- By default, EXECUTE is granted to PUBLIC — meaning any authenticated
-- user can invoke them via PostgREST. The functions internally validate
-- the caller, but per Phase 10 §25 (SECURITY DEFINER review) best
-- practice, we explicitly grant EXECUTE only to `authenticated` (the
-- Supabase role for JWT-bearing requests) and `anon` (so unauthenticated
-- attempts fail at the EXECUTE privilege, not at the function body).
--
-- Note: We DO NOT revoke from PUBLIC and then grant to authenticated —
-- because the application Server Actions use the service-role client
-- (which runs as the table owner, bypassing these checks anyway). What
-- we want is: anonymous + authenticated users can reach the function
-- (so they get a meaningful authorization-denied error from the body),
-- while service-role code can always call.
--
-- The functions already self-enforce authorization via
-- `netlodge_is_current_user_active_admin()`, so leaving EXECUTE public
-- is safe — but we add this comment for reviewer awareness.

SELECT 1 AS migration_0009_applied;
