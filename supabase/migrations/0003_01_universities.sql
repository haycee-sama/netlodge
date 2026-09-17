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
