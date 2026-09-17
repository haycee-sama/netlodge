-- ─────────────────────────────────────────────────────────────────────────────
-- NetLodge migration 0002 — Group 2: profiles + column-guard trigger + RLS
--
-- Implements:
--   * `public.profiles` table — 1:1 with `auth.users.id`
--   * Column-guard trigger preventing self-write of `role` / `account_status`
--   * RLS policies applied in THIS migration (not deferred)
--
-- Source of truth:
--   DATABASE_SCHEMA.md §4.1 (columns), §5 (role protection), §24 (RLS design)
--   TECHNICAL_ARCHITECTURE.md §8 (column-guard decision: trigger-based)
--   API_CONTRACTS.md §3 (role is never client-writable)
--   IMPLEMENTATION_PLAN.md §5 migration group 2
--
-- Critical: RLS policies for `profiles` MUST be applied in the SAME migration
-- that creates the table — never a later "security pass" migration
-- (IMPLEMENTATION_PLAN.md §5 strict ordering requirement).
--
-- `auth.users` is owned by Supabase Auth, NOT by NetLodge migrations. It is
-- assumed to exist before this migration runs. In local/test environments
-- without Supabase Auth, a stub `auth.users` table must be created first
-- (see tests/db/fixtures/auth-stub.sql — TEST-ONLY, not a production migration).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── profiles table ──────────────────────────────────────────────────────────
-- Columns per DATABASE_SCHEMA.md §4.1.
-- Created BEFORE the helper function so the function's body has a valid
-- table reference at CREATE time (Postgres validates SQL-language function
-- bodies at creation; plpgsql validates only at runtime, but using plpgsql
-- for this trivial function would be unnecessary — the table-existence
-- ordering is the cleanest fix).
CREATE TABLE IF NOT EXISTS public.profiles (
  id                uuid          PRIMARY KEY,
  role              user_role     NOT NULL,
  full_name         text          NOT NULL,
  phone             text          NOT NULL,
  university_id     uuid          NULL,  -- FK added in migration 0003
                                         -- (universities table does not exist yet)
  account_status    account_status NOT NULL DEFAULT 'active',
  suspension_reason text          NULL,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  -- Constraint: suspension_reason required when account_status = 'suspended'
  -- (DATABASE_SCHEMA.md §22).
  CONSTRAINT profiles_suspension_reason_required
    CHECK (
      account_status <> 'suspended'
      OR suspension_reason IS NOT NULL
    )
);

-- Foreign key to auth.users — CASCADE on delete so that deleting the auth
-- record removes the profile. auth.users is the identity source of truth;
-- profiles is application data.
-- NOTE: auth.users must exist (Supabase Auth-managed). Do NOT create auth.users
-- in a NetLodge migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users (id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- ── Helper: netlodge_is_current_user_admin() ─────────────────────────────────
--
-- SECURITY DEFINER function with explicit safe search_path. Used by:
--   * The column-guard trigger (to decide whether to allow protected-column
--     writes).
--   * RLS policies on `profiles` AND `universities` (to decide whether the
--     current authenticated user is an admin).
--
-- SECURITY DEFINER is CRITICAL here: when an RLS policy on `profiles`
-- references `profiles` in a subquery, PostgreSQL detects infinite
-- recursion and rejects. By calling a SECURITY DEFINER function (which
-- runs with the privileges of its owner, bypassing RLS), the recursion
-- is broken — the function reads `profiles` directly, ignoring the
-- caller's RLS, and returns a boolean.
--
-- The function is owned by the migration-runner (typically the superuser
-- during migration application), so SECURITY DEFINER runs as superuser.
-- This is intentional and safe: the function only returns a boolean, never
-- exposes any row data.
CREATE OR REPLACE FUNCTION public.netlodge_is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- Returns true when the current call context is permitted to perform
  -- admin-only operations. True when EITHER:
  --   (a) auth.uid() IS NULL — no authenticated session, indicating
  --       service-role / privileged server-side code. The application
  --       Server Action that uses the service-role client is responsible
  --       for its own authorization check (TECHNICAL_ARCHITECTURE.md §7
  --       layer 2).
  --   (b) The authenticated user's profiles.role = 'admin'.
  SELECT
    auth.uid() IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    );
$$;

-- auto-update updated_at on every UPDATE — standard PG trigger.
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

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── Column-guard trigger: protect `role` and `account_status` ────────────────
--
-- Per TECHNICAL_ARCHITECTURE.md §8 decision: a BEFORE UPDATE trigger rejects
-- any attempted change to `role` or `account_status` unless the acting user
-- is an admin (or the call originates from privileged server-side code with
-- no authenticated session, e.g., the service-role client used by Server
-- Actions after they've independently verified authorization server-side).
--
-- The trigger is the SECOND line of defense (after RLS column-restricting
-- the self-update policy). RLS alone cannot natively express "user can
-- update their row but not specific columns" — Supabase RLS is row-level,
-- not column-level (TECHNICAL_ARCHITECTURE.md §8 restates this).
--
-- Admin detection is delegated to `netlodge_is_current_user_admin()` (a
-- SECURITY DEFINER helper defined above). The helper:
--   * Returns true if `auth.uid()` IS NULL (service-role / privileged code).
--   * Returns true if the authenticated user's `profiles.role = 'admin'`.
--   * Returns false otherwise.
--
-- The trigger function is itself SECURITY DEFINER so the inner SELECT can
-- read `profiles` regardless of the caller's RLS — required because the
-- caller's RLS would otherwise restrict profile reads to the caller's own
-- row, breaking the admin check.

-- Trigger function: rejects UPDATE to role/account_status unless allowed.
CREATE OR REPLACE FUNCTION public.guard_protected_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.netlodge_is_current_user_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role is not user-writable (column-guard trigger)'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    RAISE EXCEPTION 'account_status is not user-writable (column-guard trigger)'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Fire BEFORE any UPDATE that touches role or account_status. Specifying
-- the column list means the trigger only fires when those columns are in
-- the UPDATE's SET clause — cheaper than firing on every UPDATE.
DROP TRIGGER IF EXISTS profiles_guard_protected_columns ON public.profiles;
CREATE TRIGGER profiles_guard_protected_columns
  BEFORE UPDATE OF role, account_status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_protected_profile_columns();

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Per IMPLEMENTATION_PLAN.md §5 strict ordering: RLS applied in the SAME
-- migration as the table.
--
-- Policy design (DATABASE_SCHEMA.md §24, TECHNICAL_ARCHITECTURE.md §8):
--
--   Anonymous (no auth.uid()):
--     - No SELECT, no INSERT, no UPDATE, no DELETE.
--   Authenticated self:
--     - SELECT own row (id = auth.uid()).
--     - UPDATE own row — but the column-guard trigger enforces that
--       role/account_status cannot change. The WITH CHECK clause
--       additionally enforces the row stays owned by the caller (prevents
--       a user from "moving" their row to another id).
--     - No INSERT (profiles are created only via Server Action /
--       service-role path during registration, never by direct client
--       INSERT — closes the "client submits role: admin" attack at the
--       RLS level too, not just at the trigger level).
--     - No DELETE (DATABASE_SCHEMA.md §4.1: "never hard-deleted from the
--       app; cascades only if the underlying auth.users row is deleted").
--   Admin (profiles.role = 'admin'):
--     - SELECT all rows.
--     - UPDATE all rows including role/account_status (admin can suspend
--       or change roles via dedicated admin Server Actions).
--     - No INSERT, no DELETE through the application surface — admin
--       account bootstrap is a separate server-side procedure
--       (API_CONTRACTS.md §3, TECHNICAL_ARCHITECTURE.md §6).

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
-- FORCE ensures RLS applies even to the table owner — defense in depth,
-- in case a future superuser connection is used for app logic.

-- Self-read: a user can read their own profile row.
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
CREATE POLICY profiles_self_select
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admin-read: admins can read all profile rows (DATABASE_SCHEMA.md §24).
DROP POLICY IF EXISTS profiles_admin_select ON public.profiles;
CREATE POLICY profiles_admin_select
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.netlodge_is_current_user_admin());

-- Self-update: a user can update their own row's NON-protected columns.
-- The column-guard trigger is the actual enforcement for protected columns;
-- this policy only gates row-level ownership.
-- WITH CHECK (id = auth.uid()) prevents the row's id from being changed
-- to a different user.
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin-update: admins can update any row, including protected columns.
-- (The column-guard trigger explicitly allows admin to bypass the
-- role/account_status restriction.)
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_admin_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

-- NO INSERT policy → RLS denies all client INSERTs by default.
-- profiles rows are created only by the registration Server Action using
-- the service-role client (which bypasses RLS), with role hardcoded per
-- flow (student/landlord). This closes the "client submits role: admin"
-- attack at the database level too, not just at the trigger level.
-- (DATABASE_SCHEMA.md §5, API_CONTRACTS.md §3.)

-- NO DELETE policy → RLS denies all client DELETEs by default.
-- Per DATABASE_SCHEMA.md §4.1, profiles are never hard-deleted through
-- the application; they cascade only when the underlying auth.users row
-- is removed (an admin/Auth-level action, not a normal app action).

SELECT 1 AS migration_0002_applied;
