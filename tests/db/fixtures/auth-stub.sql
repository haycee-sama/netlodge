-- ─────────────────────────────────────────────────────────────────────────────
-- TEST-ONLY FIXTURE — DO NOT USE IN PRODUCTION.
--
-- In production Supabase, the `auth` schema is created by Supabase Auth's
-- own setup before any user migration runs. It includes `auth.users` (the
-- identity table) and the `auth.uid()` function (returns the authenticated
-- user's UUID from the JWT's `sub` claim).
--
-- Supabase also pre-creates two roles used in RLS policies:
--   * `anon`           — anonymous (unauthenticated) requests
--   * `authenticated`  — any logged-in user
--
-- In our test environment we use @electric-sql/pglite (real Postgres in
-- WASM) — which does NOT include Supabase Auth. We stub the minimum needed:
--
--   * `anon` and `authenticated` roles (so RLS policy TO clauses resolve)
--   * `auth` schema
--   * `auth.users` table with `id uuid PK` and `created_at timestamptz`
--   * `auth.uid()` and `auth.role()` functions
--
-- This file is run by the test harness BEFORE migrations, so the FK in
-- migration 0002 (`profiles.id` → `auth.users.id`) and the RLS policy
-- `TO authenticated` clauses resolve correctly.
--
-- In a real Supabase environment, this entire file is a no-op — Supabase
-- Auth already provides all of this.
-- ─────────────────────────────────────────────────────────────────────────────

-- Create the anon and authenticated roles if they don't already exist.
-- These are Supabase conventions referenced by every RLS policy's TO clause.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- auth.uid() — mirrors Supabase's real implementation exactly.
-- Returns NULL when no JWT claim is set (anonymous context).
DROP FUNCTION IF EXISTS auth.uid();
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(
      NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
      NULL
    )::uuid;
$$;

-- auth.role() — Supabase also exposes the role from the JWT.
-- We provide a minimal stub returning the string in 'role' if present.
DROP FUNCTION IF EXISTS auth.role();
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(
      NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
      'anon'
    )::text;
$$;

-- Grant the anon + authenticated roles USAGE on schemas they need to read.
-- In real Supabase, this is done by Supabase Auth's bootstrap.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;

-- Grant SELECT/INSERT/UPDATE/DELETE on existing auth.users table.
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.users TO anon, authenticated;

-- Make grants the DEFAULT for future tables created in `public` (so the
-- profiles + universities tables created by migrations 0002/0003 are
-- accessible to the `authenticated` and `anon` roles, with RLS as the
-- actual gate). This is what Supabase's bootstrap does in production.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
