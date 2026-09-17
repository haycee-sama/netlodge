

-- ── 0001_01_foundational_types.sql ──
-- ─────────────────────────────────────────────────────────────────────────────
-- NetLodge migration 0001 — Group 1: Foundational database objects
--
-- Implements: pgcrypto extension + all approved enum types.
--
-- Source of truth:
--   DATABASE_SCHEMA.md §4 (column references use these enum types)
--   DATABASE_SCHEMA.md §26 (Enums vs. Text — state-machine fields use enums)
--   TECHNICAL_ARCHITECTURE.md §1 (PostgreSQL via Supabase)
--   IMPLEMENTATION_PLAN.md §5 migration group 1
--
-- Approved enum values (do NOT rename without verifying against planning docs):
--   user_role             : student | landlord | admin
--   account_status        : active | suspended
--   verification_status   : unsubmitted | submitted | under_review | approved | rejected
--   decision_type         : approved | rejected
--   property_status       : draft | submitted | under_review | approved | rejected | archived
--   booking_status        : reservation_pending | payment_pending | confirmed | payment_failed | expired | cancelled | completed
--   payment_status        : initiated | pending | success | failed
--   webhook_outcome       : confirmed | duplicate_ignored | verification_failed | reconciliation_needed | malformed_payload
--   report_status        : open | under_review | resolved
--   report_target         : property | room | user
--
-- Deterministic and safe to apply to a fresh database. Idempotent: each enum
-- is created only if it doesn't already exist (CREATE TYPE has no IF NOT
-- EXISTS in PG < 16, so we guard via DO blocks).
-- ─────────────────────────────────────────────────────────────────────────────

-- pgcrypto: provides gen_random_uuid() used as the default PK on every
-- UUID-keyed table in the schema (DATABASE_SCHEMA.md §4 conventions).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Enum types ───────────────────────────────────────────────────────────────

-- user_role — set exactly once at registration by the registration-flow
-- Server Action; never client-writable (DATABASE_SCHEMA.md §5, API_CONTRACTS §3).
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'landlord', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- account_status — PRD §8; column-guard trigger prevents self-write
-- (TECHNICAL_ARCHITECTURE.md §8).
DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- verification_status — applies to landlord_verifications.status AND
-- landlords.current_verification_status (DATABASE_SCHEMA.md §4.2/§4.3).
DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM (
    'unsubmitted', 'submitted', 'under_review', 'approved', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- decision_type — used in landlord_verifications.decision and
-- property_reviews.decision (DATABASE_SCHEMA.md §4.3/§4.6).
DO $$ BEGIN
  CREATE TYPE decision_type AS ENUM ('approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- property_status — PRD §12.2, applied to properties.status.
DO $$ BEGIN
  CREATE TYPE property_status AS ENUM (
    'draft', 'submitted', 'under_review', 'approved', 'rejected', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- booking_status — MVP_SCOPE.md §7, PRD §12.4, applied to bookings.status.
-- Order matters within the enum only for ergonomics; transitions are
-- enforced by the application state machine + DB constraints in later phases.
DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'reservation_pending',
    'payment_pending',
    'confirmed',
    'payment_failed',
    'expired',
    'cancelled',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payment_status — applied to payment_transactions.status.
-- CRITICAL: 'success' is reachable ONLY via the atomic webhook-confirmation
-- transaction in Phase 9. No application code path (including admin) may
-- directly write this value (TECHNICAL_ARCHITECTURE.md §17, §20).
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'initiated', 'pending', 'success', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- webhook_outcome — applied to payment_webhook_events.processing_outcome.
-- 'webhook_verification_failed' in API_CONTRACTS §19 is a client-facing
-- error code; this enum tracks the internal outcome of webhook processing.
-- Per IMPLEMENTATION_PLAN.md §18 step 7.
DO $$ BEGIN
  CREATE TYPE webhook_outcome AS ENUM (
    'confirmed',
    'duplicate_ignored',
    'verification_failed',
    'reconciliation_needed',
    'malformed_payload'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- report_status — applied to reports.status.
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('open', 'under_review', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- report_target — applied to reports.reported_entity_type.
-- NOTE: TECHNICAL_ARCHITECTURE.md §12 retains the polymorphic `reports`
-- design from DATABASE_SCHEMA.md §17; reports.reported_entity_type uses
-- this enum, with server-side existence validation (not a DB trigger).
DO $$ BEGIN
  CREATE TYPE report_target AS ENUM ('property', 'room', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Verification: emit a confirmation row that tests can SELECT ─────────────
-- (No system tables are written; this block is purely for migration-applied
-- verification in the test harness.)
SELECT 1 AS migration_0001_applied;



-- ── 0002_01_profiles.sql ──
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



-- ── 0003_01_universities.sql ──
-- ─────────────────────────────────────────────────────────────────────────────
-- NetLodge migration 0003 — Group 3: universities + RLS + profiles FK
--
-- Implements:
--   * `public.universities` table
--   * UNIQUE(name) constraint
--   * RLS policies (public read, admin write) — applied in THIS migration
--   * Foreign key from `profiles.university_id` → `universities.id`
--     (added here, after universities exists; profiles was created in 0002
--     with the column nullable so the FK could be added later — DATABASE_SCHEMA.md §4.1)
--
-- Source of truth:
--   DATABASE_SCHEMA.md §4.4 (columns), §6 (universities design), §24 (RLS)
--   TECHNICAL_ARCHITECTURE.md §1, §8
--   API_CONTRACTS.md §4 (public discovery — universities.list/get)
--   IMPLEMENTATION_PLAN.md §5 migration group 3
--
-- Phase 1 scope: ONE launch-target university seeded (per IMPLEMENTATION_PLAN.md
-- §24). Do NOT seed fake landlords/students/properties here — those belong to
-- later phases.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── universities table ──────────────────────────────────────────────────────
-- Columns per DATABASE_SCHEMA.md §4.4.
-- NOTE: schema does NOT include `updated_at` — universities are admin-managed
-- reference data that doesn't need an updated_at column (no edit tracking
-- required for this MVP-scale reference table). DATABASE_SCHEMA.md §4.4 lists
-- only `id`, `name`, `city`, `state`, `is_active`, `created_at`.
CREATE TABLE IF NOT EXISTS public.universities (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  city        text        NOT NULL,
  state       text        NOT NULL,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT universities_name_unique UNIQUE (name)
);

-- ── Add the deferred FK from profiles.university_id → universities.id ───────
-- DATABASE_SCHEMA.md §4.1: university_id is NULLABLE and FK with ON DELETE SET NULL
-- (a landlord profile has no university; deleting a university nulls the
-- reference rather than cascading — preserves the profile).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_university_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_university_id_fkey
      FOREIGN KEY (university_id) REFERENCES public.universities (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §24 / API_CONTRACTS.md §4:
--
--   Anonymous + authenticated:
--     - SELECT WHERE is_active = true (public discovery via universities.list).
--     - Per API_CONTRACTS.md §4: universities.list returns only isActive=true.
--
--   Admin:
--     - SELECT all (including is_active = false, for admin management).
--     - INSERT, UPDATE, DELETE — admin-managed only.
--
--   Ordinary authenticated users:
--     - SELECT active universities (same as anonymous).
--     - NO INSERT / UPDATE / DELETE.
--
-- The `anon` and `authenticated` Supabase roles are pre-defined by Supabase
-- Auth. We attach the public-read policy to BOTH so anonymous visitors
-- (browsing before registration) and authenticated students see the same
-- active set.

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities FORCE ROW LEVEL SECURITY;

-- Public + authenticated read of ACTIVE universities only.
-- API_CONTRACTS.md §4: universities.list returns only isActive=true.
DROP POLICY IF EXISTS universities_public_read ON public.universities;
CREATE POLICY universities_public_read
  ON public.universities
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admin read of ALL universities (including inactive — for admin management).
-- Uses the SECURITY DEFINER helper to avoid RLS recursion on `profiles`.
DROP POLICY IF EXISTS universities_admin_read ON public.universities;
CREATE POLICY universities_admin_read
  ON public.universities
  FOR SELECT
  TO authenticated
  USING (public.netlodge_is_current_user_admin());

-- Admin write (INSERT / UPDATE / DELETE).
-- A single policy with FOR ALL covers all three write operations.
-- Uses the SECURITY DEFINER helper for the same recursion-avoidance reason.
DROP POLICY IF EXISTS universities_admin_write ON public.universities;
CREATE POLICY universities_admin_write
  ON public.universities
  FOR ALL
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

SELECT 1 AS migration_0003_applied;



-- ── 0005_01_landlords_verifications.sql ──
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



-- ── 0006_01_properties_rooms_images.sql ──
-- ─────────────────────────────────────────────────────────────────────────────
-- NetLodge migration 0006 — Phase 5: properties, rooms, property_images,
-- room_images, property_reviews
--
-- Implements migration group 5 per IMPLEMENTATION_PLAN.md §5.
-- Uses dedicated property_images/room_images tables (NOT the polymorphic
-- `images` table from DATABASE_SCHEMA.md §4.8 — superseded by
-- TECHNICAL_ARCHITECTURE.md §11's schema-change recommendation).
--
-- Tables created:
--   1. `properties`         — landlord-owned, university-scoped property
--                               records with approval-lifecycle status.
--   2. `property_reviews`    — append-only admin decision history per
--                               property (mirrors landlord_verifications).
--   3. `rooms`               — bookable units within a property.
--   4. `property_images`     — image metadata for properties (native FK).
--   5. `room_images`         — image metadata for rooms (native FK).
--
-- Critical database-level invariants enforced:
--   * Verification precondition: a property can only reach `submitted`
--     status if its landlord's `current_verification_status = 'approved'`.
--   * Property state machine: only documented transitions allowed.
--   * Append-only property_reviews: decision fields admin-only; no
--     UPDATE/DELETE of historical rows by non-admin.
--   * Image ownership: RLS enforces landlord can only manage images on
--     their own properties/rooms.
--   * Publication visibility: only `approved` properties are publicly
--     readable; draft/submitted/under_review/rejected are invisible to
--     anon/public.
--
-- Source of truth:
--   DATABASE_SCHEMA.md §4.5 (properties), §4.6 (property_reviews),
--   §4.7 (rooms), §4.8 (images — SUPERSEDED by TECHNICAL_ARCHITECTURE.md §11)
--   §22 (constraints), §23 (indexes), §24 (RLS), §28.2 (property state machine)
--   TECHNICAL_ARCHITECTURE.md §11 (dedicated image tables decision)
--   API_CONTRACTS.md §5 (Property & Room Contracts), §6 (Image Contracts),
--   §8 (Property Verification & Moderation Contracts), §20 (State Transitions)
--   IMPLEMENTATION_PLAN.md §5 migration group 5, §8 stages 7–12, §22 Phase 5
-- ─────────────────────────────────────────────────────────────────────────────

-- ── properties table ──────────────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §4.5.
CREATE TABLE IF NOT EXISTS public.properties (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id     uuid            NOT NULL,
  university_id   uuid            NOT NULL,
  area            text            NOT NULL,
  address         text            NOT NULL,
  description     text            NOT NULL,
  status          property_status NOT NULL DEFAULT 'draft',
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now(),
  -- FK to landlords — RESTRICT so a landlord with properties can't be
  -- hard-deleted (DATABASE_SCHEMA.md §21).
  CONSTRAINT properties_landlord_id_fkey
    FOREIGN KEY (landlord_id) REFERENCES public.landlords (profile_id)
    ON DELETE RESTRICT,
  -- FK to universities — RESTRICT.
  CONSTRAINT properties_university_id_fkey
    FOREIGN KEY (university_id) REFERENCES public.universities (id)
    ON DELETE RESTRICT
);

-- updated_at trigger (same pattern as profiles/landlords).
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

DROP TRIGGER IF EXISTS properties_set_updated_at ON public.properties;
CREATE TRIGGER properties_set_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── Verification precondition trigger ─────────────────────────────────────
--
-- CRITICAL: per DATABASE_SCHEMA.md §4.5 + API_CONTRACTS.md §5, a property
-- can only reach `submitted` status if its landlord's
-- `current_verification_status = 'approved'`. This is enforced at the
-- database level via a SECURITY DEFINER trigger — NOT just application
-- code. This is the single most important Phase 5 invariant.
--
-- The trigger fires BEFORE INSERT or UPDATE of `status` on properties.
-- If the new status is `submitted`, it checks the landlord's verification
-- status. If not `approved`, the trigger raises an exception.
--
-- SECURITY DEFINER + search_path = public, pg_temp — same pattern as
-- Phase 1's netlodge_is_current_user_admin(). The function bypasses RLS
-- to read the landlords row.
CREATE OR REPLACE FUNCTION public.check_property_verification_precondition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  landlord_verification_status verification_status;
BEGIN
  -- Only check when status is transitioning TO 'submitted'.
  IF NEW.status = 'submitted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT current_verification_status INTO landlord_verification_status
    FROM public.landlords
    WHERE profile_id = NEW.landlord_id;

    IF landlord_verification_status IS NULL THEN
      RAISE EXCEPTION 'Landlord record not found for property creation'
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF landlord_verification_status != 'approved' THEN
      RAISE EXCEPTION 'Property submission requires landlord verification status = approved (current: %)',
        landlord_verification_status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS properties_check_verification_precondition ON public.properties;
CREATE TRIGGER properties_check_verification_precondition
  BEFORE INSERT OR UPDATE OF status ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.check_property_verification_precondition();

-- ── Property state machine trigger ─────────────────────────────────────────
--
-- Per DATABASE_SCHEMA.md §28.2 + API_CONTRACTS.md §20, enforce the
-- property approval lifecycle state machine. Only admin (or service-role)
-- can change status beyond the landlord's `draft → submitted` action.
--
-- Allowed transitions:
--   draft → submitted (landlord)
--   submitted → under_review (admin)
--   submitted → approved (admin, direct)
--   submitted → rejected (admin, direct)
--   under_review → approved (admin)
--   under_review → rejected (admin)
--   rejected → submitted (landlord resubmits)
--   approved → submitted (landlord edits substantive fields — per API_CONTRACTS.md §5)
--   approved → archived (landlord)
--
-- Blocked: all other transitions, and ALL status changes by non-admin
-- callers except the two landlord-allowed ones (draft→submitted,
-- rejected→submitted).
CREATE OR REPLACE FUNCTION public.guard_property_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Only fire when status changes.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT public.netlodge_is_current_user_admin() INTO is_admin;

    -- Non-admin: only allowed draft → submitted and rejected → submitted.
    IF NOT is_admin THEN
      IF NOT (
        (OLD.status = 'draft' AND NEW.status = 'submitted')
        OR (OLD.status = 'rejected' AND NEW.status = 'submitted')
      ) THEN
        RAISE EXCEPTION 'Non-admin cannot perform property status transition: % → %',
          OLD.status, NEW.status
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    -- Admin: check the documented state machine.
    IF is_admin THEN
      IF NOT (
        (OLD.status = 'draft' AND NEW.status = 'submitted')
        OR (OLD.status = 'rejected' AND NEW.status = 'submitted')
        OR (OLD.status = 'submitted' AND NEW.status IN ('under_review', 'approved', 'rejected'))
        OR (OLD.status = 'under_review' AND NEW.status IN ('approved', 'rejected'))
        OR (OLD.status = 'approved' AND NEW.status IN ('submitted', 'archived'))
        OR (OLD.status = 'archived' AND NEW.status = 'submitted')
      ) THEN
        RAISE EXCEPTION 'Invalid property status transition: % → %',
          OLD.status, NEW.status
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS properties_guard_status_transitions ON public.properties;
CREATE TRIGGER properties_guard_status_transitions
  BEFORE UPDATE OF status ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_property_status_transitions();

-- ── property_reviews table ────────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §4.6: append-only, mirrors landlord_verifications.
CREATE TABLE IF NOT EXISTS public.property_reviews (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid            NOT NULL,
  submitted_at    timestamptz     NOT NULL DEFAULT now(),
  reviewed_by     uuid            NULL,
  reviewed_at     timestamptz     NULL,
  decision        decision_type   NULL,
  decision_reason text            NULL,
  CONSTRAINT property_reviews_decision_reason_required
    CHECK (
      decision IS DISTINCT FROM 'rejected'
      OR decision_reason IS NOT NULL
    ),
  CONSTRAINT property_reviews_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties (id)
    ON DELETE CASCADE,
  CONSTRAINT property_reviews_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES public.profiles (id)
    ON DELETE SET NULL
);

-- Index: admin property queue.
CREATE INDEX IF NOT EXISTS property_reviews_property_id_submitted_at_idx
  ON public.property_reviews (property_id, submitted_at DESC);

-- ── Property reviews append-only trigger ──────────────────────────────────
-- Same pattern as Phase 4's landlord_verifications append-only trigger.
-- Blocks UPDATE/DELETE by non-admin; blocks re-deciding decided rows.
CREATE OR REPLACE FUNCTION public.guard_property_reviews_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT public.netlodge_is_current_user_admin() INTO is_admin;

  IF TG_OP = 'DELETE' THEN
    IF NOT is_admin THEN
      RAISE EXCEPTION 'property_reviews rows cannot be deleted by non-admin (append-only audit trail)'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Protected columns: never changeable.
    IF NEW.property_id IS DISTINCT FROM OLD.property_id THEN
      RAISE EXCEPTION 'property_id is not updateable (append-only)' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
      RAISE EXCEPTION 'submitted_at is not updateable (append-only)' USING ERRCODE = 'check_violation';
    END IF;

    -- Decision fields: admin-only, one-time fill.
    IF (
         NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
      OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
      OR NEW.decision IS DISTINCT FROM OLD.decision
      OR NEW.decision_reason IS DISTINCT FROM OLD.decision_reason
    ) THEN
      IF NOT is_admin THEN
        RAISE EXCEPTION 'decision fields can only be modified by an admin (append-only)' USING ERRCODE = 'check_violation';
      END IF;
      IF OLD.decision IS NOT NULL THEN
        RAISE EXCEPTION 'decision has already been recorded on this row (append-only)' USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS property_reviews_guard_append_only ON public.property_reviews;
CREATE TRIGGER property_reviews_guard_append_only
  BEFORE UPDATE OR DELETE ON public.property_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_property_reviews_append_only();

-- ── rooms table ───────────────────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §4.7.
CREATE TABLE IF NOT EXISTS public.rooms (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid          NOT NULL,
  room_type     text          NOT NULL,
  price         numeric(12,2) NOT NULL,
  occupancy     integer       NOT NULL,
  amenities     text[]        NOT NULL DEFAULT '{}',
  is_listed     boolean       NOT NULL DEFAULT false,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT rooms_price_positive CHECK (price > 0),
  CONSTRAINT rooms_occupancy_positive CHECK (occupancy > 0),
  CONSTRAINT rooms_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties (id)
    ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS rooms_set_updated_at ON public.rooms;
CREATE TRIGGER rooms_set_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Index: search by university + status (DATABASE_SCHEMA.md §23).
CREATE INDEX IF NOT EXISTS properties_university_id_status_idx
  ON public.properties (university_id, status);

-- Index: price range filtering (DATABASE_SCHEMA.md §23).
CREATE INDEX IF NOT EXISTS rooms_price_idx
  ON public.rooms (price);

-- Index: loading a property's rooms (DATABASE_SCHEMA.md §23).
CREATE INDEX IF NOT EXISTS rooms_property_id_idx
  ON public.rooms (property_id);

-- ── Room availability guard trigger ────────────────────────────────────────
-- Per API_CONTRACTS.md §5: is_listed can only be set true if the parent
-- property is `approved`. This is a database-level check — not just
-- application logic.
CREATE OR REPLACE FUNCTION public.check_room_listing_precondition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  property_status property_status;
BEGIN
  -- Only check when is_listed is being set to true.
  IF (TG_OP = 'UPDATE' AND NEW.is_listed = true AND OLD.is_listed = false)
     OR (TG_OP = 'INSERT' AND NEW.is_listed = true) THEN
    SELECT status INTO property_status
    FROM public.properties
    WHERE id = NEW.property_id;

    IF property_status IS NULL THEN
      RAISE EXCEPTION 'Parent property not found for room' USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF property_status != 'approved' THEN
      RAISE EXCEPTION 'Room can only be listed when parent property is approved (current property status: %)',
        property_status USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_check_listing_precondition ON public.rooms;
CREATE TRIGGER rooms_check_listing_precondition
  BEFORE INSERT OR UPDATE OF is_listed ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.check_room_listing_precondition();

-- ── property_images table ─────────────────────────────────────────────────
-- Per TECHNICAL_ARCHITECTURE.md §11: dedicated table with native FK
-- (NOT the polymorphic images table from DATABASE_SCHEMA.md §4.8).
CREATE TABLE IF NOT EXISTS public.property_images (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid          NOT NULL,
  storage_path  text          NOT NULL,
  position      integer       NOT NULL DEFAULT 0,
  is_primary    boolean       NOT NULL DEFAULT false,
  uploaded_by   uuid          NOT NULL,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT property_images_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties (id)
    ON DELETE CASCADE,
  CONSTRAINT property_images_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles (id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS property_images_property_id_position_idx
  ON public.property_images (property_id, position);

-- ── room_images table ─────────────────────────────────────────────────────
-- Per TECHNICAL_ARCHITECTURE.md §11: dedicated table with native FK.
CREATE TABLE IF NOT EXISTS public.room_images (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       uuid          NOT NULL,
  storage_path  text          NOT NULL,
  position      integer       NOT NULL DEFAULT 0,
  is_primary    boolean       NOT NULL DEFAULT false,
  uploaded_by   uuid          NOT NULL,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT room_images_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.rooms (id)
    ON DELETE CASCADE,
  CONSTRAINT room_images_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles (id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS room_images_room_id_position_idx
  ON public.room_images (room_id, position);

-- ── RLS: properties ─────────────────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §24 + API_CONTRACTS.md §4/§5.
--
-- Public: SELECT only WHERE status = 'approved' (publication visibility —
-- the Phase 5 exit criterion). Draft/submitted/under_review/rejected are
-- invisible to anon and to authenticated non-owners.
--
-- Landlord: SELECT/INSERT/UPDATE own properties (WHERE landlord_id =
-- auth.uid()). Cannot UPDATE status (the state-machine trigger blocks
-- non-admin status changes beyond draft→submitted/rejected→submitted).
-- Cannot DELETE (properties are never hard-deleted by the application;
-- the RESTRICT FK prevents landlord deletion while properties exist).
--
-- Admin: full read + UPDATE (for status transitions). No INSERT (admin
-- doesn't create properties). No DELETE through the application surface.
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties FORCE ROW LEVEL SECURITY;

-- Public read of APPROVED properties only (publication visibility).
DROP POLICY IF EXISTS properties_public_read ON public.properties;
CREATE POLICY properties_public_read
  ON public.properties
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Landlord self-read (own properties, any status).
DROP POLICY IF EXISTS properties_landlord_select ON public.properties;
CREATE POLICY properties_landlord_select
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (landlord_id = auth.uid());

-- Landlord INSERT (new property — landlord_id derived from session, not
-- from client input; the application code sets landlord_id = user.id).
DROP POLICY IF EXISTS properties_landlord_insert ON public.properties;
CREATE POLICY properties_landlord_insert
  ON public.properties
  FOR INSERT
  TO authenticated
  WITH CHECK (landlord_id = auth.uid());

-- Landlord self-update (own properties, non-status fields).
DROP POLICY IF EXISTS properties_landlord_update ON public.properties;
CREATE POLICY properties_landlord_update
  ON public.properties
  FOR UPDATE
  TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Admin full read + update (for status transitions).
DROP POLICY IF EXISTS properties_admin_select ON public.properties;
CREATE POLICY properties_admin_select
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (public.netlodge_is_current_user_admin());

DROP POLICY IF EXISTS properties_admin_update ON public.properties;
CREATE POLICY properties_admin_update
  ON public.properties
  FOR UPDATE
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

-- NO DELETE policy — properties are never hard-deleted by the application.
-- The RESTRICT FK on landlord_id prevents landlord deletion while
-- properties exist.

-- ── RLS: property_reviews ───────────────────────────────────────────────────
ALTER TABLE public.property_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_reviews FORCE ROW LEVEL SECURITY;

-- Landlord self-read (reviews on own properties).
DROP POLICY IF EXISTS property_reviews_landlord_select ON public.property_reviews;
CREATE POLICY property_reviews_landlord_select
  ON public.property_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_reviews.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Admin full read + update (for the one-time review action).
DROP POLICY IF EXISTS property_reviews_admin_select ON public.property_reviews;
CREATE POLICY property_reviews_admin_select
  ON public.property_reviews
  FOR SELECT
  TO authenticated
  USING (public.netlodge_is_current_user_admin());

DROP POLICY IF EXISTS property_reviews_admin_update ON public.property_reviews;
CREATE POLICY property_reviews_admin_update
  ON public.property_reviews
  FOR UPDATE
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

-- Landlord INSERT (create a new review row on property submission).
-- The property must belong to the landlord.
DROP POLICY IF EXISTS property_reviews_landlord_insert ON public.property_reviews;
CREATE POLICY property_reviews_landlord_insert
  ON public.property_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_reviews.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord self-UPDATE — allows the UPDATE to pass RLS so the
-- append-only trigger can fire and produce a meaningful error message
-- for non-admin callers attempting to change decision fields.
DROP POLICY IF EXISTS property_reviews_landlord_update ON public.property_reviews;
CREATE POLICY property_reviews_landlord_update
  ON public.property_reviews
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_reviews.property_id
        AND p.landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_reviews.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord self-DELETE — allows DELETE to pass RLS so the append-only
-- trigger can fire and block the attempt.
DROP POLICY IF EXISTS property_reviews_landlord_delete ON public.property_reviews;
CREATE POLICY property_reviews_landlord_delete
  ON public.property_reviews
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_reviews.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- NO DELETE policy for non-admin — append-only trigger blocks non-admin DELETE.

-- ── RLS: rooms ───────────────────────────────────────────────────────────────
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms FORCE ROW LEVEL SECURITY;

-- Public read: rooms under APPROVED properties AND is_listed = true.
-- Publication visibility — only listed rooms in approved properties are
-- visible to the public. Unlisted rooms are invisible (even in approved
-- properties) until the landlord explicitly lists them.
DROP POLICY IF EXISTS rooms_public_read ON public.rooms;
CREATE POLICY rooms_public_read
  ON public.rooms
  FOR SELECT
  TO anon, authenticated
  USING (
    is_listed = true
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = rooms.property_id
        AND p.status = 'approved'
    )
  );

-- Landlord self-read (rooms under own properties).
DROP POLICY IF EXISTS rooms_landlord_select ON public.rooms;
CREATE POLICY rooms_landlord_select
  ON public.rooms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = rooms.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord INSERT (room under own property only).
DROP POLICY IF EXISTS rooms_landlord_insert ON public.rooms;
CREATE POLICY rooms_landlord_insert
  ON public.rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = rooms.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord UPDATE (room under own property only).
DROP POLICY IF EXISTS rooms_landlord_update ON public.rooms;
CREATE POLICY rooms_landlord_update
  ON public.rooms
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = rooms.property_id
        AND p.landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = rooms.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord DELETE (room under own property only — CASCADE on property
-- delete also removes rooms).
DROP POLICY IF EXISTS rooms_landlord_delete ON public.rooms;
CREATE POLICY rooms_landlord_delete
  ON public.rooms
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = rooms.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Admin full access.
DROP POLICY IF EXISTS rooms_admin_all ON public.rooms;
CREATE POLICY rooms_admin_all
  ON public.rooms
  FOR ALL
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

-- ── RLS: property_images ────────────────────────────────────────────────────
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images FORCE ROW LEVEL SECURITY;

-- Public read: images on APPROVED properties (publication visibility).
DROP POLICY IF EXISTS property_images_public_read ON public.property_images;
CREATE POLICY property_images_public_read
  ON public.property_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.status = 'approved'
    )
  );

-- Landlord self-read (images on own properties).
DROP POLICY IF EXISTS property_images_landlord_select ON public.property_images;
CREATE POLICY property_images_landlord_select
  ON public.property_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord INSERT (uploaded_by must be the caller).
DROP POLICY IF EXISTS property_images_landlord_insert ON public.property_images;
CREATE POLICY property_images_landlord_insert
  ON public.property_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord UPDATE (reorder, set primary).
DROP POLICY IF EXISTS property_images_landlord_update ON public.property_images;
CREATE POLICY property_images_landlord_update
  ON public.property_images
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord DELETE.
DROP POLICY IF EXISTS property_images_landlord_delete ON public.property_images;
CREATE POLICY property_images_landlord_delete
  ON public.property_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Admin full access.
DROP POLICY IF EXISTS property_images_admin_all ON public.property_images;
CREATE POLICY property_images_admin_all
  ON public.property_images
  FOR ALL
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

-- ── RLS: room_images ───────────────────────────────────────────────────────
ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_images FORCE ROW LEVEL SECURITY;

-- Public read: images on rooms in APPROVED properties (publication visibility).
DROP POLICY IF EXISTS room_images_public_read ON public.room_images;
CREATE POLICY room_images_public_read
  ON public.room_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE r.id = room_images.room_id
        AND p.status = 'approved'
    )
  );

-- Landlord self-read (images on rooms under own properties).
DROP POLICY IF EXISTS room_images_landlord_select ON public.room_images;
CREATE POLICY room_images_landlord_select
  ON public.room_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE r.id = room_images.room_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord INSERT.
DROP POLICY IF EXISTS room_images_landlord_insert ON public.room_images;
CREATE POLICY room_images_landlord_insert
  ON public.room_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE r.id = room_images.room_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord UPDATE.
DROP POLICY IF EXISTS room_images_landlord_update ON public.room_images;
CREATE POLICY room_images_landlord_update
  ON public.room_images
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE r.id = room_images.room_id
        AND p.landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE r.id = room_images.room_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord DELETE.
DROP POLICY IF EXISTS room_images_landlord_delete ON public.room_images;
CREATE POLICY room_images_landlord_delete
  ON public.room_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE r.id = room_images.room_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Admin full access.
DROP POLICY IF EXISTS room_images_admin_all ON public.room_images;
CREATE POLICY room_images_admin_all
  ON public.room_images
  FOR ALL
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

SELECT 1 AS migration_0006_applied;



-- ── 0007_01_bookings.sql ──
-- ─────────────────────────────────────────────────────────────────────────────
-- NetLodge migration 0007 — Phase 7: bookings (reservations)
--
-- Implements migration group 6 per IMPLEMENTATION_PLAN.md §5.
--
-- Table created:
--   `bookings` — student reservations for rooms, with the critical
--                partial unique index `one_active_booking_per_room` that
--                enforces the concurrency invariant at the database level.
--
-- CRITICAL DATABASE-LEVEL INVARIANT:
--   A room can have at most ONE active booking at a time. "Active" means
--   status IN ('reservation_pending', 'payment_pending', 'confirmed').
--   This is enforced by a PARTIAL UNIQUE INDEX on bookings(room_id)
--   WHERE status IN ('reservation_pending', 'payment_pending', 'confirmed').
--
--   This is the ACTUAL race-safety mechanism — not application-level
--   "check then act" logic. Two concurrent INSERTs for the same room
--   will be serialized by PostgreSQL; exactly one commits, the other
--   gets a unique-violation error.
--
-- Source of truth:
--   DATABASE_SCHEMA.md §4.9 (bookings), §11 (concurrency), §22 (constraints),
--   §23 (indexes), §24 (RLS), §28.4 (booking state machine)
--   TECHNICAL_ARCHITECTURE.md §13–14 (booking architecture + concurrency)
--   API_CONTRACTS.md §9 (Booking/Reservation Contracts), §19 (error model)
--   IMPLEMENTATION_PLAN.md §5 group 6, §10, §22 Phase 7
-- ─────────────────────────────────────────────────────────────────────────────

-- ── bookings table ─────────────────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §4.9.
CREATE TABLE IF NOT EXISTS public.bookings (
  id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id             uuid            NOT NULL,
  property_id         uuid            NOT NULL,  -- Denormalized from room_id
  landlord_id         uuid            NOT NULL,  -- Denormalized from room's property
  student_id          uuid            NOT NULL,
  status              booking_status  NOT NULL DEFAULT 'reservation_pending',
  reserved_price      numeric(12,2)   NOT NULL,  -- Snapshot of rooms.price at reservation time
  hold_expires_at     timestamptz     NOT NULL,  -- now() + hold window
  confirmed_at        timestamptz     NULL,      -- Set only by payment confirmation (Phase 9)
  cancelled_at        timestamptz     NULL,
  cancelled_by        uuid            NULL,
  cancellation_reason text            NULL,
  completed_at        timestamptz     NULL,      -- Set by move-in-date-based transition
  created_at          timestamptz     NOT NULL DEFAULT now(),
  updated_at          timestamptz     NOT NULL DEFAULT now(),
  -- CHECK: reserved_price > 0 (DATABASE_SCHEMA.md §22)
  CONSTRAINT bookings_reserved_price_positive CHECK (reserved_price > 0),
  -- FK: room_id → rooms.id ON DELETE RESTRICT (room with booking history can't be hard-deleted)
  CONSTRAINT bookings_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.rooms (id)
    ON DELETE RESTRICT,
  -- FK: property_id → properties.id ON DELETE RESTRICT
  CONSTRAINT bookings_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties (id)
    ON DELETE RESTRICT,
  -- FK: student_id → profiles.id ON DELETE RESTRICT
  CONSTRAINT bookings_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.profiles (id)
    ON DELETE RESTRICT,
  -- FK: cancelled_by → profiles.id ON DELETE SET NULL (preserve audit trail)
  CONSTRAINT bookings_cancelled_by_fkey
    FOREIGN KEY (cancelled_by) REFERENCES public.profiles (id)
    ON DELETE SET NULL
);

-- updated_at trigger (same pattern as all other tables).
DROP TRIGGER IF EXISTS bookings_set_updated_at ON public.bookings;
CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── THE CRITICAL CONCURRENCY CONSTRAINT ────────────────────────────────────
--
-- Partial unique index: at most ONE active booking per room.
-- "Active" = status IN ('reservation_pending', 'payment_pending', 'confirmed').
--
-- This is THE race-safety mechanism. Two concurrent INSERTs for the same
-- room_id both with an active status → PostgreSQL serializes them →
-- exactly one commits, the other gets a unique-violation error.
--
-- The application catches this specific error and returns `conflict`/
-- `room_unavailable` (API_CONTRACTS.md §9/§19).
--
-- When a booking transitions to 'expired', 'cancelled', or 'completed'
-- (terminal/non-active states), it falls OUTSIDE the partial index's
-- WHERE clause → the room immediately becomes eligible for a new active
-- booking. No separate "release" step is needed.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_booking_per_room
  ON public.bookings (room_id)
  WHERE status IN ('reservation_pending', 'payment_pending', 'confirmed');

-- ── Indexes for common queries (DATABASE_SCHEMA.md §23) ──────────────────

-- "My bookings" — student dashboard, every session.
CREATE INDEX IF NOT EXISTS bookings_student_id_status_idx
  ON public.bookings (student_id, status);

-- Landlord dashboard + admin monitoring — denormalized columns.
CREATE INDEX IF NOT EXISTS bookings_property_id_idx
  ON public.bookings (property_id);

CREATE INDEX IF NOT EXISTS bookings_landlord_id_idx
  ON public.bookings (landlord_id);

-- ── Booking state machine trigger ─────────────────────────────────────────
--
-- Per DATABASE_SCHEMA.md §28.4 + API_CONTRACTS.md §20, enforce the booking
-- lifecycle state machine. Only documented transitions are allowed.
--
-- Allowed transitions:
--   (none) → reservation_pending (student creates booking — INSERT, not UPDATE)
--   reservation_pending → payment_pending (system — payment init, Phase 9)
--   payment_pending → confirmed (system — verified webhook, Phase 9)
--   payment_pending → payment_failed (system — Paystack failure, Phase 9)
--   payment_pending → reservation_pending (system — retry, Phase 9)
--   reservation_pending → expired (system — scheduled job, Phase 8)
--   payment_pending → expired (system — scheduled job, Phase 8)
--   confirmed → cancelled (student/landlord/admin — cancellation)
--   confirmed → completed (system — move-in date passes, Phase 8+)
--
-- Prohibited:
--   Any transition INTO reservation_pending/payment_pending/confirmed
--   by a non-system actor (i.e., authenticated client).
--   Any transition OUT of cancelled/completed (terminal).
--   payment_pending → confirmed by anything other than the webhook.
--
-- In Phase 7, we only implement the student-facing cancellation path
-- (confirmed → cancelled). The payment/webhook/expiry transitions are
-- Phase 8/9 — but the trigger blocks them for now so a client can't
-- bypass the future payment flow.
CREATE OR REPLACE FUNCTION public.guard_booking_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_admin boolean;
  is_service_role boolean;
BEGIN
  -- Only fire on UPDATE (INSERT always creates reservation_pending).
  IF TG_OP = 'INSERT' THEN
    -- INSERT: status must be 'reservation_pending' (the only valid initial state).
    IF NEW.status != 'reservation_pending' THEN
      RAISE EXCEPTION 'Booking must start as reservation_pending (got: %)', NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: only fire when status changes.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT public.netlodge_is_current_user_admin() INTO is_admin;
    -- Service-role (auth.uid() IS NULL) can do system transitions.
    is_service_role := (auth.uid() IS NULL);

    -- Student/landlord cancellation: confirmed → cancelled.
    -- This is the ONLY client-initiated status transition.
    -- Student (own booking) and landlord (own property's booking) are
    -- authorized via RLS; admin is authorized via is_admin.
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
      -- Allowed for any authenticated user who passes RLS.
      -- The application layer enforces actor-relationship checks.
      RETURN NEW;
    END IF;

    -- All other transitions require service-role (system-driven):
    --   reservation_pending → payment_pending (payment init — Phase 9)
    --   payment_pending → confirmed (webhook — Phase 9)
    --   payment_pending → payment_failed (Paystack failure — Phase 9)
    --   payment_pending → reservation_pending (retry — Phase 9)
    --   reservation_pending/payment_pending → expired (scheduled job — Phase 8)
    --   confirmed → completed (date-based — Phase 8+)
    IF NOT is_service_role THEN
      RAISE EXCEPTION 'Non-system actor cannot perform booking status transition: % → %',
        OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;

    -- Validate the documented state machine.
    IF NOT (
      (OLD.status = 'reservation_pending' AND NEW.status IN ('payment_pending', 'expired'))
      OR (OLD.status = 'payment_pending' AND NEW.status IN ('confirmed', 'payment_failed', 'reservation_pending', 'expired'))
      OR (OLD.status = 'payment_failed' AND NEW.status = 'reservation_pending')
      OR (OLD.status = 'confirmed' AND NEW.status IN ('cancelled', 'completed'))
    ) THEN
      RAISE EXCEPTION 'Invalid booking status transition: % → %',
        OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_guard_status_transitions ON public.bookings;
CREATE TRIGGER bookings_guard_status_transitions
  BEFORE INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_booking_status_transitions();

-- ── RLS: bookings ───────────────────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §24 + API_CONTRACTS.md §9.
--
-- Student: read own bookings. INSERT own bookings (student_id = auth.uid()).
--   Cannot UPDATE status (only cancellation via the cancel Server Action,
--   which is a constrained UPDATE that the state-machine trigger allows).
--   Cannot DELETE (bookings are never hard-deleted — RESTRICT FK on room_id).
--
-- Landlord: read bookings for own properties/rooms.
--   Can UPDATE status to 'cancelled' (for confirmed bookings on own properties).
--
-- Admin: read all + update (cancellation).
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings FORCE ROW LEVEL SECURITY;

-- Student self-read (own bookings, any status).
DROP POLICY IF EXISTS bookings_student_select ON public.bookings;
CREATE POLICY bookings_student_select
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR public.netlodge_is_current_user_admin()
  );

-- Landlord read (bookings on own properties).
DROP POLICY IF EXISTS bookings_landlord_select ON public.bookings;
CREATE POLICY bookings_landlord_select
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    landlord_id = auth.uid()
    OR public.netlodge_is_current_user_admin()
  );

-- Student INSERT (new booking — student_id derived from session, not client).
DROP POLICY IF EXISTS bookings_student_insert ON public.bookings;
CREATE POLICY bookings_student_insert
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'reservation_pending'
    -- confirmed_at, cancelled_at, cancelled_by, cancellation_reason,
    -- completed_at must all be NULL at insert.
    AND confirmed_at IS NULL
    AND cancelled_at IS NULL
    AND cancelled_by IS NULL
    AND cancellation_reason IS NULL
    AND completed_at IS NULL
  );

-- Student UPDATE — only for cancellation (confirmed → cancelled).
-- The state-machine trigger enforces that only confirmed → cancelled is
-- allowed for non-system actors.
DROP POLICY IF EXISTS bookings_student_update ON public.bookings;
CREATE POLICY bookings_student_update
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Landlord UPDATE — cancellation of bookings on own properties.
DROP POLICY IF EXISTS bookings_landlord_update ON public.bookings;
CREATE POLICY bookings_landlord_update
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Admin UPDATE (cancellation of any booking).
DROP POLICY IF EXISTS bookings_admin_update ON public.bookings;
CREATE POLICY bookings_admin_update
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

-- NO DELETE policy — bookings are never hard-deleted by the application.
-- The RESTRICT FK on room_id prevents room deletion while bookings exist.

SELECT 1 AS migration_0007_applied;



-- ── 0008_01_payments.sql ──
-- ─────────────────────────────────────────────────────────────────────────────
-- NetLodge migration 0008 — Phase 9: payment_transactions + payment_webhook_events
--
-- Implements migration group 7 per IMPLEMENTATION_PLAN.md §5.
--
-- Tables created:
--   1. `payment_transactions` — one row per payment attempt. A booking may
--      have several (retries), only one may ever succeed. The partial unique
--      index `one_successful_payment_per_booking` enforces this.
--   2. `payment_webhook_events` — the idempotency ledger. UNIQUE on
--      `provider_event_id` — the first INSERT wins, duplicates are rejected
--      at the DB level (not via application "check then act").
--
-- CRITICAL DATABASE-LEVEL INVARIANTS:
--   * `payment_transactions.paystack_reference` is UNIQUE — server-generated,
--     never client-suppliable, never reusable.
--   * `payment_webhook_events.provider_event_id` is UNIQUE — duplicate
--     webhook deliveries are rejected at INSERT time.
--   * Partial unique index `one_successful_payment_per_booking` — at most
--     one `status = 'success'` payment per booking.
--   * The atomic confirmation is implemented as a SECURITY DEFINER function
--     `confirm_booking_payment` that updates both `payment_transactions.status`
--     and `bookings.status` in a single transaction.
--
-- Source of truth:
--   DATABASE_SCHEMA.md §4.10 (payment_transactions), §4.11 (payment_webhook_events),
--   §14 (webhook idempotency), §22 (constraints), §23 (indexes), §24 (RLS)
--   TECHNICAL_ARCHITECTURE.md §16-18 (payment architecture, confirmation, webhook)
--   API_CONTRACTS.md §11 (Paystack Payment Contracts), §12 (consistency), §13 (failure)
--   IMPLEMENTATION_PLAN.md §5 group 7, §12, §13, §22 Phase 9
-- ─────────────────────────────────────────────────────────────────────────────

-- First, add 'expired' to the payment_status enum (Phase 1 created it
-- without 'expired' — DATABASE_SCHEMA.md §4.10 specifies it should be
-- `initiated`, `pending`, `success`, `failed`, `expired`).
DO $$ BEGIN
  ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'expired';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── payment_transactions table ─────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §4.10.
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          uuid            NOT NULL,
  paystack_reference  text            NOT NULL,
  amount              numeric(12,2)   NOT NULL,
  currency            text            NOT NULL DEFAULT 'NGN',
  status              payment_status  NOT NULL DEFAULT 'initiated',
  initiated_at        timestamptz     NOT NULL DEFAULT now(),
  verified_at         timestamptz     NULL,
  failure_reason      text            NULL,
  provider_metadata   jsonb           NULL,
  created_at          timestamptz     NOT NULL DEFAULT now(),
  updated_at          timestamptz     NOT NULL DEFAULT now(),
  -- CHECK constraints
  CONSTRAINT payment_transactions_amount_positive CHECK (amount > 0),
  CONSTRAINT payment_transactions_currency_ngn CHECK (currency = 'NGN'),
  -- UNIQUE on paystack_reference — server-generated, never reusable
  CONSTRAINT payment_transactions_paystack_reference_unique UNIQUE (paystack_reference),
  -- FK: booking_id → bookings.id ON DELETE RESTRICT
  CONSTRAINT payment_transactions_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES public.bookings (id)
    ON DELETE RESTRICT
);

-- Partial unique index: at most one successful payment per booking.
CREATE UNIQUE INDEX IF NOT EXISTS one_successful_payment_per_booking
  ON public.payment_transactions (booking_id)
  WHERE status = 'success';

-- Index for webhook lookup by reference (highest-frequency payment-path query).
CREATE INDEX IF NOT EXISTS payment_transactions_paystack_reference_idx
  ON public.payment_transactions (paystack_reference);

-- updated_at trigger.
DROP TRIGGER IF EXISTS payment_transactions_set_updated_at ON public.payment_transactions;
CREATE TRIGGER payment_transactions_set_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── payment_transactions state machine trigger ────────────────────────────
-- Per DATABASE_SCHEMA.md §28.5 + API_CONTRACTS.md §20.
--
-- Allowed transitions:
--   (none) → initiated (system — payment init creates the row)
--   initiated → pending (system — Paystack transaction created)
--   pending → success (system — webhook-verified confirmation ONLY)
--   pending → failed (system — Paystack failure)
--   initiated → failed (system — Paystack init failure)
--   initiated/pending → expired (system — booking expired, payment never completed)
--
-- Prohibited:
--   Any client-initiated status change.
--   success → anything (terminal — no reversal without refund, which is Phase 13+).
--   failed → success (must create a new payment_transactions row for retry).
CREATE OR REPLACE FUNCTION public.guard_payment_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_service_role boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('initiated', 'pending') THEN
      RAISE EXCEPTION 'Payment must start as initiated or pending (got: %)', NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    is_service_role := (auth.uid() IS NULL);

    IF NOT is_service_role THEN
      RAISE EXCEPTION 'Non-system actor cannot change payment status: % → %',
        OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;

    IF NOT (
      (OLD.status = 'initiated' AND NEW.status IN ('pending', 'failed', 'expired', 'success'))
      OR (OLD.status = 'pending' AND NEW.status IN ('success', 'failed', 'expired'))
    ) THEN
      RAISE EXCEPTION 'Invalid payment status transition: % → %',
        OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_transactions_guard_status ON public.payment_transactions;
CREATE TRIGGER payment_transactions_guard_status
  BEFORE INSERT OR UPDATE OF status ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_payment_status_transitions();

-- ── payment_webhook_events table ──────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §4.11.
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id  text            NOT NULL,
  paystack_reference  text            NOT NULL,
  event_type          text            NOT NULL,
  received_at         timestamptz     NOT NULL DEFAULT now(),
  processed_at        timestamptz     NULL,
  processing_outcome  webhook_outcome NULL,
  raw_payload         jsonb           NOT NULL,
  -- UNIQUE on provider_event_id — the idempotency gate
  CONSTRAINT payment_webhook_events_provider_event_id_unique UNIQUE (provider_event_id)
);

-- Index for reference lookup.
CREATE INDEX IF NOT EXISTS payment_webhook_events_paystack_reference_idx
  ON public.payment_webhook_events (paystack_reference);

-- ── Atomic confirmation function ──────────────────────────────────────────
--
-- Per TECHNICAL_ARCHITECTURE.md §17: the webhook handler, after independently
-- verifying the transaction with Paystack, performs a SINGLE database
-- transaction that (a) updates payment_transactions.status = 'success' and
-- (b) updates bookings.status = 'confirmed' together — both commit or neither.
--
-- This function is SECURITY DEFINER so it can update both tables bypassing
-- RLS (the webhook handler runs as service-role, auth.uid() IS NULL, which
-- the state machine triggers check for).
--
-- Parameters:
--   p_payment_transaction_id — the payment_transactions.id to mark as success
--   p_paystack_reference — the Paystack reference (for lookup/verification)
--   p_provider_metadata — non-sensitive Paystack verification response data
--
-- Returns: void on success, raises exception on any precondition failure.
CREATE OR REPLACE FUNCTION public.confirm_booking_payment(
  p_payment_transaction_id uuid,
  p_paystack_reference text,
  p_provider_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment public.payment_transactions%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
BEGIN
  -- 1. Lock and load the payment transaction row.
  SELECT * INTO v_payment
  FROM public.payment_transactions
  WHERE id = p_payment_transaction_id
    AND paystack_reference = p_paystack_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment transaction not found: % / %',
      p_payment_transaction_id, p_paystack_reference
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 2. Verify the payment is in a confirmable state (pending or initiated).
  IF v_payment.status NOT IN ('initiated', 'pending') THEN
    RAISE EXCEPTION 'Payment is not in a confirmable state: %', v_payment.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Lock and load the booking row.
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = v_payment.booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found for payment: %', v_payment.booking_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 4. Verify booking is in payment_pending state.
  IF v_booking.status != 'payment_pending' THEN
    -- If the booking has expired, flag for reconciliation.
    IF v_booking.status = 'expired' THEN
      RAISE EXCEPTION 'Booking has expired — reconciliation needed (payment: %)',
        v_payment.paystack_reference
        USING ERRCODE = 'check_violation';
    END IF;
    -- If already confirmed, this is a duplicate — no-op.
    IF v_booking.status = 'confirmed' THEN
      RAISE EXCEPTION 'Booking already confirmed — duplicate confirmation attempt (payment: %)',
        v_payment.paystack_reference
        USING ERRCODE = 'check_violation';
    END IF;
    RAISE EXCEPTION 'Booking is not in payment_pending state: %', v_booking.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Atomic update: payment → success + booking → confirmed.
  UPDATE public.payment_transactions
  SET status = 'success',
      verified_at = now(),
      provider_metadata = COALESCE(p_provider_metadata, provider_metadata)
  WHERE id = v_payment.id;

  UPDATE public.bookings
  SET status = 'confirmed',
      confirmed_at = now()
  WHERE id = v_booking.id;
END;
$$;

-- ── RLS: payment_transactions ──────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §24:
--   Student: read own payment transactions (status + amount only, NOT provider_metadata).
--   Landlord: NO access to payment transactions.
--   Admin: full read access (including provider_metadata).
--   NO write path for any client role — payment_transactions are written only
--   by the server-side payment Server Action + webhook handler (service-role).
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions FORCE ROW LEVEL SECURITY;

-- Student read: own payments only (via booking ownership).
-- Excludes provider_metadata from the visible columns via column-level
-- security (not RLS, but a SECURITY DEFINER view would be cleaner — for MVP,
-- the application layer simply doesn't SELECT provider_metadata for students).
DROP POLICY IF EXISTS payment_transactions_student_read ON public.payment_transactions;
CREATE POLICY payment_transactions_student_read
  ON public.payment_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payment_transactions.booking_id
        AND b.student_id = auth.uid()
    )
  );

-- Admin full read.
DROP POLICY IF EXISTS payment_transactions_admin_read ON public.payment_transactions;
CREATE POLICY payment_transactions_admin_read
  ON public.payment_transactions
  FOR SELECT
  TO authenticated
  USING (public.netlodge_is_current_user_admin());

-- NO INSERT/UPDATE/DELETE policies for any client role.
-- All writes go through the service-role client (webhook handler, payment
-- Server Action) which bypasses RLS.

-- ── RLS: payment_webhook_events ─────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §24:
--   Student: NO access.
--   Landlord: NO access.
--   Admin: read-only (for investigation).
--   NO write path for any client role — webhook events are written only
--   by the webhook handler (service-role).
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events FORCE ROW LEVEL SECURITY;

-- Admin read-only.
DROP POLICY IF EXISTS payment_webhook_events_admin_read ON public.payment_webhook_events;
CREATE POLICY payment_webhook_events_admin_read
  ON public.payment_webhook_events
  FOR SELECT
  TO authenticated
  USING (public.netlodge_is_current_user_admin());

-- NO INSERT/UPDATE/DELETE policies for any client role.

SELECT 1 AS migration_0008_applied;



-- ── 0009_01_admin_audit_suspension.sql ──
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



-- ── 0010_01_reviews_reports.sql ──
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



-- ── seed/universities.sql ──
-- ─────────────────────────────────────────────────────────────────────────────
-- NetLodge seed — launch-target university
--
-- DEVELOPMENT/TEST SEED ONLY. Never migrate to production.
-- Per IMPLEMENTATION_PLAN.md §24: production starts with only the real launch
-- university and zero fake accounts. This seed is for local/dev/staging only.
--
-- ─── OPEN DECISION FLAGGED ───────────────────────────────────────────────────
-- The planning documents do NOT name the specific launch-target university:
--   * PRODUCT_BRIEF.md §9: "one university market at a time, not all of
--     Nigeria at once" — the strategy, not the choice.
--   * NETLODGE_BLUEPRINT.md §9: "Pick one university (highest off-campus
--     housing demand + a founder/team member with local access)" — explicitly
--     a team decision to make during the 90-day launch plan, not a documented
--     answer.
--   * IMPLEMENTATION_PLAN.md §24: "One seeded university for the launch
--     target" — assumes the team has decided.
--
-- Until that team decision is finalized, this seed uses the University of
-- Lagos (UNILAG) as a placeholder — a real Nigerian university with
-- substantial off-campus housing demand near its Akoka campus. This is NOT
-- an authoritative product decision; it is development data chosen to be
-- representative of the eventual real shape (real Nigerian university name,
-- real city, real state).
--
-- When the team finalizes the actual launch-target university, replace the
-- name/city/state in the INSERT below. The id can stay stable across that
-- swap (the rest of the dev/test data references it by id, not name).
-- ─────────────────────────────────────────────────────────────────────────────

-- Idempotent: ON CONFLICT (name) DO NOTHING. Safe to re-run.
-- The id is FIXED and DETERMINISTIC so test fixtures can reference it
-- without depending on gen_random_uuid()'s non-deterministic output.
INSERT INTO public.universities (id, name, city, state, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'University of Lagos',
  'Lagos',
  'Lagos',
  true
)
ON CONFLICT (name) DO NOTHING;

