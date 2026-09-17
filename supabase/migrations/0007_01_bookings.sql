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
