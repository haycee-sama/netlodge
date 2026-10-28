-- ===========================================================================
-- NetLodge Schema Migration — Part 12: Performance Indexes + Idempotency
-- ===========================================================================
-- Goals:
-- 1. Add missing indexes for common query patterns (bookings by date range,
--    payments by confirmed_at, notifications by user+read, ticket_messages
--    by ticket+date, audit_logs by timestamp+category).
-- 2. Add a partial unique index on active bookings per rentable_unit to
--    enforce the "one active booking per room" invariant at the DB level
--    (in addition to the RPC-level FOR UPDATE check).
-- 3. Add an idempotency key column to payments for future Paystack
--    reference deduplication (already handled by unique(reference) but
--    this adds a dedicated column for provider-level dedup).
-- 4. Add a connection_pool-friendly advisory lock function for concurrent
--    booking attempts (belt-and-suspenders alongside FOR UPDATE).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Performance indexes
-- ---------------------------------------------------------------------------

-- Bookings: date-range overlap queries (check_in < p_check_out AND p_check_in < check_out)
create index if not exists idx_bookings_unit_dates on public.bookings(rentable_unit_id, check_in, check_out)
  where status in ('pending_payment', 'payment_initiated', 'confirmed', 'active');

-- Bookings: hold expiry sweep
create index if not exists idx_bookings_hold_expires on public.bookings(hold_expires_at)
  where status in ('pending_payment', 'payment_initiated');

-- Payments: confirmed_at range queries (reconciliation, finance reports)
create index if not exists idx_payments_confirmed_at on public.payments(confirmed_at)
  where status = 'successful';

-- Payments: gateway_reference lookup (webhook dedup)
create index if not exists idx_payments_gateway_ref on public.payments(gateway_reference)
  where gateway_reference is not null;

-- Notifications: user + read + created_at (notification bell + center)
create index if not exists idx_notifications_user_read_created on public.notifications(user_id, read, created_at desc);

-- Ticket messages: ticket + created_at (conversation view)
create index if not exists idx_ticket_messages_ticket_created on public.ticket_messages(ticket_id, created_at);

-- Audit logs: timestamp + category (admin audit viewer)
create index if not exists idx_audit_logs_timestamp_category on public.audit_logs(timestamp desc, category);

-- Audit logs: actor_id (user activity lookup)
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id);

-- Verification cases: status + priority (officer queue sort)
create index if not exists idx_verification_cases_status_priority on public.verification_cases(status, priority);

-- Support tickets: status + created_at (agent queue)
create index if not exists idx_support_tickets_status_created on public.support_tickets(status, created_at desc);

-- Support tickets: assigned_to + status (my queue)
create index if not exists idx_support_tickets_assigned_status on public.support_tickets(assigned_to, status)
  where assigned_to is not null;

-- Saved properties: user_id + created_at (saved list)
create index if not exists idx_saved_properties_user_created on public.saved_properties(user_id, created_at desc);

-- Refunds: status + created_at (finance queue)
create index if not exists idx_refunds_status_created on public.refunds(status, created_at desc);

-- Payouts: landlord + status (landlord payout list)
create index if not exists idx_payouts_landlord_status on public.payouts(landlord_id, status);

-- Reconciliation: status + created_at (finance queue)
create index if not exists idx_reconciliation_status_created on public.reconciliation_records(status, created_at desc);

-- Booking status history: booking_id + created_at (timeline)
create index if not exists idx_booking_history_booking_created on public.booking_status_history(booking_id, created_at);

-- Ledger entries: booking_id (payment trail)
create index if not exists idx_ledger_entries_booking on public.ledger_entries(booking_id);

-- Ledger entries: payment_id (payment trail)
create index if not exists idx_ledger_entries_payment on public.ledger_entries(payment_id);

-- ---------------------------------------------------------------------------
-- 2. Partial unique index: one active booking per rentable unit
--    This enforces the invariant that a room can have at most one
--    'pending_payment', 'payment_initiated', 'confirmed', or 'active'
--    booking at a time. The create_booking() RPC already checks this with
--    FOR UPDATE, but this index is a defense-in-depth constraint that
--    prevents race conditions even if the RPC has a bug.
--
--    Note: This does NOT prevent overlapping bookings with different date
--    ranges — it prevents ANY two active bookings on the same room. If
--    date-range overlap detection is needed at the DB level, a GiST
--    exclusion constraint with daterange would be required (needs the
--    btree_gist extension). The RPC handles date-range overlap correctly.
-- ---------------------------------------------------------------------------
create unique index if not exists uq_bookings_one_active_per_unit
  on public.bookings(rentable_unit_id)
  where status in ('pending_payment', 'payment_initiated', 'confirmed', 'active');

-- ---------------------------------------------------------------------------
-- 3. Idempotency: add provider_transaction_id to payments
--    This is a nullable column that stores the Paystack transaction ID
--    (data.id from the verify response). It allows deduplication at the
--    provider level — if the same Paystack transaction is verified twice,
--    the unique constraint prevents a second payment row.
--    Currently, the reference column (NLG-PAY-...) is already unique, but
--    this adds a second layer for the provider's own ID.
-- ---------------------------------------------------------------------------
alter table public.payments add column if not exists provider_transaction_id bigint;
create unique index if not exists uq_payments_provider_txn_id
  on public.payments(provider_transaction_id)
  where provider_transaction_id is not null;

-- ---------------------------------------------------------------------------
-- 4. Advisory lock function for concurrent booking attempts
--    Uses pg_try_advisory_xact_lock to serialize booking attempts for the
--    same room without blocking other rooms. Returns true if the lock was
--    acquired, false if another transaction is already booking the same room.
--
--    Usage in create_booking():
--      if not public.try_booking_lock(p_unit_id) then
--        raise exception 'Another booking is in progress for this room';
--      end if;
--
--    The lock is automatically released at the end of the transaction.
--    This is a non-blocking alternative to FOR UPDATE that avoids holding
--    the row lock for the entire transaction duration.
-- ---------------------------------------------------------------------------
create or replace function public.try_booking_lock(p_unit_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_key bigint;
begin
  -- Convert the UUID to a bigint lock key (use the first 8 bytes)
  v_lock_key := ('x' || substr(p_unit_id::text, 1, 8))::bit(32)::bigint;

  if pg_try_advisory_xact_lock(v_lock_key) then
    return true;
  else
    return false;
  end if;
end;
$$;

do $$ begin
  grant execute on function public.try_booking_lock(uuid) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Add hold expiry function: release expired holds automatically
--    Can be called by the cron job or a scheduled trigger.
--    Returns the count of released holds.
-- ---------------------------------------------------------------------------
create or replace function public.release_expired_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  -- Find bookings with expired holds that are still in pending/initiated state
  update public.bookings
    set status = 'expired',
        current_step = 'refund_or_payout',
        updated_at = now()
    where status in ('pending_payment', 'payment_initiated')
      and hold_expires_at is not null
      and hold_expires_at < now();

  get diagnostics v_count = row_count;

  -- Release the room holds for expired bookings
  update public.rentable_units
    set status = 'available',
        active_hold_id = null,
        active_booking_id = null,
        updated_at = now()
    where active_hold_id in (
      select id from public.bookings where status = 'expired'
    )
      and status = 'held';

  -- Record status history for expired bookings
  insert into public.booking_status_history (booking_id, from_status, to_status, reason)
  select id, 'pending_payment', 'expired', 'Hold expired automatically'
    from public.bookings
   where status = 'expired'
     and id not in (select booking_id from public.booking_status_history where to_status = 'expired');

  return v_count;
end;
$$;

do $$ begin
  grant execute on function public.release_expired_holds() to authenticated, service_role;
exception when duplicate_object then null;
end $$;
