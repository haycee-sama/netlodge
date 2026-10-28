-- ===========================================================================
-- NetLodge Schema Migration — Part 15: Secure the _migrations tracking table
-- ===========================================================================
-- Problem: the migration runner (scripts/apply-migrations.ts) creates a
-- `_migrations` table in the public schema to track which migration files
-- have been applied. This table is exposed to PostgREST (the Supabase REST
-- API), and RLS was not enabled on it — triggering a Supabase security
-- warning: "RLS Disabled in Public".
--
-- Fix: move the tracking table to a dedicated `netlodge_internal` schema
-- that is NOT exposed to PostgREST, and enable RLS on it as defense in
-- depth. The migration runner is updated to use the new schema.
--
-- This migration:
--   1. Creates a `netlodge_internal` schema (if not exists).
--   2. Moves the `_migrations` table there (data preserved).
--   3. Enables RLS with a deny-by-default policy (only service_role can
--      read/write — which is what the migration runner uses).
--   4. Drops the old public._migrations table.
--
-- The migration runner (scripts/apply-migrations.ts) is updated in the same
-- commit to read/write from netlodge_internal._migrations.
-- ===========================================================================

-- 1. Create the internal schema (not exposed to PostgREST by default)
create schema if not exists netlodge_internal;

-- 2. Create the tracking table in the internal schema if it doesn't exist
create table if not exists netlodge_internal._migrations (
  id serial primary key,
  filename text not null unique,
  applied_at timestamptz not null default now()
);

-- 3. Copy data from the old public._migrations if it exists and has rows
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = '_migrations'
  ) then
    insert into netlodge_internal._migrations (filename, applied_at)
    select filename, applied_at from public._migrations
    on conflict (filename) do nothing;
  end if;
end $$;

-- 4. Enable RLS on the new table (deny by default — only service_role bypasses)
alter table netlodge_internal._migrations enable row level security;

-- No policies = deny all access via PostgREST. The service_role bypasses RLS
-- entirely, so the migration runner (which uses the service_role key via the
-- direct PG connection) can still read/write. Anon and authenticated users
-- get nothing.

-- 5. Drop the old public._migrations table (data already copied)
drop table if exists public._migrations cascade;

-- 6. Revoke access to the internal schema from anon and authenticated
revoke usage on schema netlodge_internal from anon, authenticated;
grant usage on schema netlodge_internal to service_role;
