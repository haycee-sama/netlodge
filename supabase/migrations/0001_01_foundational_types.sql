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
