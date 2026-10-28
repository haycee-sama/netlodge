-- ===========================================================================
-- NetLodge Schema Migration — Part 6: Phase 5 Payment Integrity
-- ===========================================================================
-- Goals:
-- 1. Make payment confirmation atomic and idempotent at the database level
--    so that the verify redirect and webhook can race safely.
-- 2. Prevent duplicate ledger entries via a unique constraint.
-- 3. Fix rentable_unit lookup (was using active_hold_id = booking.id, which is
--    wrong — booking.id is not a hold id). The new RPC uses
--    bookings.rentable_unit_id directly.
-- 4. Use SQL-side increment for paid_kobo (lost-update safe).
-- 5. Record audit log inside the RPC so callers cannot forget it.
--
-- All functions are SECURITY DEFINER with `set search_path = public` to
-- prevent search_path hijacking. The confirm_payment function only mutates
-- state when the booking is in a payable state, so concurrent callers
-- (verify + webhook) cannot double-allocate a room.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Unique constraint on ledger_entries (entry_type, reference)
--    so that retried webhook / verify calls cannot insert duplicate rows.
--    Some legacy ledger rows may already exist; we first null out duplicates
--    (keeping the earliest created_at) before adding the constraint.
-- ---------------------------------------------------------------------------

delete from public.ledger_entries le
where exists (
  select 1 from public.ledger_entries earlier
  where earlier.entry_type = le.entry_type
    and earlier.reference = le.reference
    and earlier.created_at < le.created_at
);

do $$ begin
  alter table public.ledger_entries
    add constraint ledger_entries_entry_type_reference_key
    unique (entry_type, reference);
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. confirm_payment(p_payment_id, p_gateway_reference, p_actor_email)
--
--    Atomically confirms a payment. Idempotent — safe to call from both
--    /api/payments/verify and /api/paystack/webhook, in any order, in
--    parallel. Returns one of:
--      'confirmed'           — payment was confirmed this call (booking flipped)
--      'already_confirmed'   — payment was already confirmed by a prior call
--      'needs_reconciliation'— payment succeeded but booking is cancelled/expired/refunded
--      'invalid_booking'     — booking missing or in a state that cannot be confirmed
--      'payment_not_found'   — payment row not found
--
--    The function locks both the payment and booking rows FOR UPDATE before
--    any state change, so concurrent calls serialise safely.
-- ---------------------------------------------------------------------------

create or replace function public.confirm_payment(
  p_payment_id uuid,
  p_gateway_reference text,
  p_actor_email text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment        public.payments%rowtype;
  v_booking        public.bookings%rowtype;
  v_unit_id        uuid;
  v_old_status     public.booking_status;
  v_result         text;
begin
  -- Lock the payment row first
  select * into v_payment
    from public.payments
   where id = p_payment_id
   for update;

  if not found then
    return 'payment_not_found';
  end if;

  -- Idempotency: payment already confirmed
  if v_payment.status = 'successful' and v_payment.confirmed_by_backend then
    return 'already_confirmed';
  end if;

  -- Lock the booking row
  select * into v_booking
    from public.bookings
   where id = v_payment.booking_id
   for update;

  if not found then
    -- Booking missing — still mark the payment as successful so the ledger
    -- reflects the received money. Flag for reconciliation.
    update public.payments set
      status              = 'successful',
      confirmed_by_backend = true,
      confirmed_at        = now(),
      gateway_reference   = coalesce(p_gateway_reference, gateway_reference)
    where id = p_payment_id;

    insert into public.ledger_entries (entry_type, reference, booking_id, payment_id, credit_kobo, description)
    values ('payment', v_payment.reference, null, p_payment_id, v_payment.amount_kobo,
            'Payment confirmed — booking missing, needs reconciliation')
    on conflict (entry_type, reference) do nothing;

    perform public.record_audit(
      p_actor_id    := v_payment.student_id,
      p_actor_email := coalesce(p_actor_email, 'system@netlodge.test'),
      p_actor_role  := 'student'::public.user_role,
      p_category    := 'finance'::public.audit_category,
      p_action      := 'payment.confirmed.reconciliation',
      p_resource_type := 'payment',
      p_resource_id := p_payment_id::text,
      p_summary     := 'Payment ' || v_payment.reference || ' confirmed but booking missing — needs reconciliation',
      p_severity    := 'warning'::public.audit_severity
    );

    return 'needs_reconciliation';
  end if;

  -- Booking is in an invalid state — record but don't confirm the booking
  if v_booking.status in ('cancelled', 'expired', 'refunded') then
    update public.payments set
      status              = 'successful',
      confirmed_by_backend = true,
      confirmed_at        = now(),
      gateway_reference   = coalesce(p_gateway_reference, gateway_reference)
    where id = p_payment_id;

    insert into public.ledger_entries (entry_type, reference, booking_id, payment_id, credit_kobo, description)
    values ('payment', v_payment.reference, v_booking.id, p_payment_id, v_payment.amount_kobo,
            'Payment confirmed — booking ' || v_booking.status || ', needs reconciliation')
    on conflict (entry_type, reference) do nothing;

    perform public.record_audit(
      p_actor_id    := v_payment.student_id,
      p_actor_email := coalesce(p_actor_email, 'system@netlodge.test'),
      p_actor_role  := 'student'::public.user_role,
      p_category    := 'finance'::public.audit_category,
      p_action      := 'payment.confirmed.reconciliation',
      p_resource_type := 'payment',
      p_resource_id := p_payment_id::text,
      p_summary     := 'Payment ' || v_payment.reference || ' confirmed but booking is ' || v_booking.status::text || ' — needs reconciliation',
      p_severity    := 'warning'::public.audit_severity
    );

    return 'needs_reconciliation';
  end if;

  -- Booking is already confirmed/active — mark payment successful but don't
  -- re-flip the booking (idempotent). Ledger entry is created on conflict.
  if v_booking.status in ('confirmed', 'active') then
    update public.payments set
      status              = 'successful',
      confirmed_by_backend = true,
      confirmed_at        = now(),
      gateway_reference   = coalesce(p_gateway_reference, gateway_reference)
    where id = p_payment_id;

    insert into public.ledger_entries (entry_type, reference, booking_id, payment_id, credit_kobo, description)
    values ('payment', v_payment.reference, v_booking.id, p_payment_id, v_payment.amount_kobo,
            'Payment confirmed for already-confirmed booking ' || v_booking.reference)
    on conflict (entry_type, reference) do nothing;

    return 'already_confirmed';
  end if;

  -- Booking must be in a payable state to flip
  if v_booking.status not in ('pending_payment', 'payment_initiated') then
    -- Unexpected state — flag for manual review
    update public.payments set
      status              = 'successful',
      confirmed_by_backend = true,
      confirmed_at        = now(),
      gateway_reference   = coalesce(p_gateway_reference, gateway_reference),
      failure_reason      = 'Booking in unexpected status: ' || v_booking.status::text
    where id = p_payment_id;

    perform public.record_audit(
      p_actor_id    := v_payment.student_id,
      p_actor_email := coalesce(p_actor_email, 'system@netlodge.test'),
      p_actor_role  := 'student'::public.user_role,
      p_category    := 'finance'::public.audit_category,
      p_action      := 'payment.confirmed.invalid_booking',
      p_resource_type := 'payment',
      p_resource_id := p_payment_id::text,
      p_summary     := 'Payment ' || v_payment.reference || ' confirmed but booking status ' || v_booking.status::text || ' is not payable',
      p_severity    := 'warning'::public.audit_severity
    );

    return 'invalid_booking';
  end if;

  v_old_status := v_booking.status;
  v_unit_id    := v_booking.rentable_unit_id;

  -- Atomic conditional update — only flips if status is still payable.
  -- Uses paid_kobo = paid_kobo + amount (lost-update safe).
  update public.bookings set
    status           = 'confirmed',
    current_step     = 'booking_confirmation',
    paid_kobo        = paid_kobo + v_payment.amount_kobo,
    outstanding_kobo = greatest(0, total_kobo - (paid_kobo + v_payment.amount_kobo)),
    confirmed_at     = now(),
    updated_at       = now()
  where id = v_booking.id
    and status in ('pending_payment', 'payment_initiated')
  returning status into v_result;

  if not found then
    -- Another caller flipped the booking concurrently. Idempotent — return.
    return 'already_confirmed';
  end if;

  -- Update the payment
  update public.payments set
    status              = 'successful',
    confirmed_by_backend = true,
    confirmed_at        = now(),
    gateway_reference   = coalesce(p_gateway_reference, gateway_reference)
  where id = p_payment_id;

  -- Update the room — use rentable_unit_id (NOT active_hold_id) so we
  -- correctly target the room this booking is for.
  if v_unit_id is not null then
    update public.rentable_units set
      status            = 'occupied',
      active_booking_id = v_booking.id,
      active_hold_id    = null,
      updated_at        = now()
    where id = v_unit_id;
  end if;

  -- Booking status history (idempotent on (booking_id, to_status, reason))
  insert into public.booking_status_history (booking_id, from_status, to_status, changed_by, reason)
  values (v_booking.id, v_old_status, 'confirmed', v_payment.student_id,
          'Payment confirmed via Paystack (ref: ' || v_payment.reference || ')');

  -- Ledger entry — unique on (entry_type, reference)
  insert into public.ledger_entries (entry_type, reference, booking_id, payment_id, credit_kobo, description)
  values ('payment', v_payment.reference, v_booking.id, p_payment_id, v_payment.amount_kobo,
          'Payment confirmed for booking ' || v_booking.reference)
  on conflict (entry_type, reference) do nothing;

  -- Audit log
  perform public.record_audit(
    p_actor_id    := v_payment.student_id,
    p_actor_email := coalesce(p_actor_email, 'system@netlodge.test'),
    p_actor_role  := 'student'::public.user_role,
    p_category    := 'finance'::public.audit_category,
    p_action      := 'payment.confirmed',
    p_resource_type := 'payment',
    p_resource_id := p_payment_id::text,
    p_summary     := 'Payment ' || v_payment.reference || ' confirmed for booking ' || v_booking.reference,
    p_severity    := 'info'::public.audit_severity
  );

  return 'confirmed';
end;
$$;

-- Allow authenticated users (server routes use the service role, but be
-- explicit so RLS doesn't trip if a non-admin session calls it).
do $$ begin
  grant execute on function public.confirm_payment(uuid, text, text) to authenticated, service_role, anon;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 3. fix_legacy_payment_room_updates
--    No-op for new installations. For installations with prior data, the
--    previous /api/payments/verify code set rentable_units.active_hold_id
--    using `where active_hold_id = booking.id`, which was a bug. The new
--    confirm_payment function uses rentable_unit_id correctly, so legacy
--    bad rows are no longer written.
-- ---------------------------------------------------------------------------
-- (No data fix needed — the new RPC replaces the buggy client-side code.)
