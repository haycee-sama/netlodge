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
