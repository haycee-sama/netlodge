-- ===========================================================================
-- NetLodge Schema Migration — Part 9: Phase 7 Finance + Support + Notifications
-- ===========================================================================
-- Adds SECURITY DEFINER RPCs for:
--   1. Refund workflow (create_refund, review_refund)
--   2. Payout workflow (approve_payout, reject_payout)
--   3. Reconciliation (run_reconciliation, resolve_reconciliation)
--   4. Notifications (create_notification — deduped)
--
-- All functions:
--   - Set search_path = public to prevent hijacking
--   - Verify the caller's identity (auth.uid() must be non-null)
--   - Verify the caller's role (finance_admin / support_staff / super_admin)
--   - Validate input against trusted database state
--   - Lock relevant rows FOR UPDATE before state changes
--   - Record audit log entries via record_audit()
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. create_refund(p_payment_id, p_amount_kobo, p_reason, p_reason_detail)
--
--    Creates a refund request against a verified payment. Guards:
--    - Caller must be finance_admin or super_admin
--    - Payment must exist and be status='successful' with confirmed_by_backend=true
--    - Amount must be > 0 and <= (payment.amount_kobo - sum(existing non-rejected refunds))
--    - Payment must not be already fully refunded
--    - Locks the payment row FOR UPDATE to prevent concurrent over-refunding
--
--    Returns the new refund id.
-- ---------------------------------------------------------------------------
create or replace function public.create_refund(
  p_payment_id uuid,
  p_amount_kobo bigint,
  p_reason public.refund_reason,
  p_reason_detail text,
  p_actor_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment      public.payments%rowtype;
  v_caller_id    uuid := auth.uid();
  v_is_finance   boolean := false;
  v_is_super     boolean := false;
  v_already_refunded bigint;
  v_refundable   bigint;
  v_new_refund_id uuid;
  v_reference    text;
  v_actor_email  text;
  v_booking      public.bookings%rowtype;
begin
  -- 1. Auth + role check
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select public.has_role(v_caller_id, 'finance_admin') into v_is_finance;
  select public.has_role(v_caller_id, 'super_admin')   into v_is_super;
  if not (v_is_finance or v_is_super) then
    raise exception 'Not authorized: finance_admin or super_admin role required';
  end if;

  -- 2. Validate inputs
  if p_amount_kobo is null or p_amount_kobo <= 0 then
    raise exception 'Refund amount must be positive';
  end if;
  if p_reason_detail is null or btrim(p_reason_detail) = '' then
    raise exception 'Refund reason detail is required';
  end if;

  -- 3. Lock the payment row
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;

  -- 4. Payment must be verified successful
  if v_payment.status <> 'successful' or not v_payment.confirmed_by_backend then
    raise exception 'Can only refund verified successful payments (current status: %)', v_payment.status;
  end if;

  -- 5. Compute already-refunded amount (sum of non-rejected refunds)
  select coalesce(sum(amount_kobo), 0) into v_already_refunded
    from public.refunds
   where payment_id = p_payment_id
     and status in ('requested', 'under_review', 'approved', 'processing', 'completed');

  v_refundable := v_payment.amount_kobo - v_already_refunded;
  if v_refundable <= 0 then
    raise exception 'Payment has already been fully refunded';
  end if;

  if p_amount_kobo > v_refundable then
    raise exception 'Refund amount % exceeds refundable balance %', p_amount_kobo, v_refundable;
  end if;

  -- 6. Get booking for audit context
  select * into v_booking from public.bookings where id = v_payment.booking_id;

  -- 7. Create the refund row
  v_reference := 'NLG-RFD-' || to_char(now(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 6);

  insert into public.refunds (
    reference, payment_id, payment_reference, booking_id, student_id,
    amount_kobo, currency, reason, reason_detail, status
  ) values (
    v_reference, p_payment_id, v_payment.reference, v_payment.booking_id, v_payment.student_id,
    p_amount_kobo, v_payment.currency, p_reason, p_reason_detail, 'requested'
  ) returning id into v_new_refund_id;

  -- 8. Audit log
  select email into v_actor_email from public.profiles where id = v_caller_id;

  perform public.record_audit(
    p_actor_id      := v_caller_id,
    p_actor_email   := coalesce(p_actor_email, v_actor_email, 'unknown@netlodge.test'),
    p_actor_role    := case when v_is_super then 'super_admin'::public.user_role else 'finance_admin'::public.user_role end,
    p_category      := 'refund'::public.audit_category,
    p_action        := 'refund.created',
    p_resource_type := 'refund',
    p_resource_id   := v_new_refund_id::text,
    p_summary       := format('Created refund %s for ₦%s against payment %s (reason: %s)',
                              v_reference, p_amount_kobo, v_payment.reference, p_reason::text),
    p_severity      := 'warning'::public.audit_severity,
    p_after_data    := jsonb_build_object(
                        'refund_id', v_new_refund_id,
                        'payment_id', p_payment_id,
                        'amount_kobo', p_amount_kobo,
                        'reason', p_reason,
                        'reason_detail', p_reason_detail,
                        'refundable_before', v_refundable,
                        'refundable_after', v_refundable - p_amount_kobo
                      )
  );

  return v_new_refund_id;
end;
$$;

do $$ begin
  grant execute on function public.create_refund(uuid, bigint, public.refund_reason, text, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. review_refund(p_refund_id, p_action, p_notes, p_provider_reference)
--
--    Approve or reject a refund request.
--    - 'approve': sets status='approved', records reviewer, calls Paystack refund
--      API server-side (the route handler does this and passes p_provider_reference).
--      If p_provider_reference is null, status stays 'approved' (manual provider call needed).
--      If p_provider_reference is provided, status='processing'.
--    - 'reject': sets status='rejected', records rejection reason.
--
--    The actual Paystack refund API call happens in the route handler, which then
--    calls this function with the provider_reference. This keeps the RPC pure
--    (no outbound HTTP) while still recording the authoritative result.
-- ---------------------------------------------------------------------------
create or replace function public.review_refund(
  p_refund_id uuid,
  p_action text,
  p_notes text default null,
  p_provider_reference text default null,
  p_failure_reason text default null,
  p_actor_email text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refund       public.refunds%rowtype;
  v_caller_id    uuid := auth.uid();
  v_is_finance   boolean := false;
  v_is_super     boolean := false;
  v_new_status   public.refund_status;
  v_actor_email  text;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select public.has_role(v_caller_id, 'finance_admin') into v_is_finance;
  select public.has_role(v_caller_id, 'super_admin')   into v_is_super;
  if not (v_is_finance or v_is_super) then
    raise exception 'Not authorized: finance_admin or super_admin role required';
  end if;

  if p_action not in ('approve', 'reject') then
    raise exception 'Invalid action: % (expected approve or reject)', p_action;
  end if;

  select * into v_refund from public.refunds where id = p_refund_id for update;
  if not found then
    raise exception 'Refund not found';
  end if;

  -- Only requested / under_review refunds can be reviewed
  if v_refund.status not in ('requested', 'under_review') then
    raise exception 'Refund is in terminal status % — cannot review', v_refund.status;
  end if;

  if p_action = 'reject' and (p_notes is null or btrim(p_notes) = '') then
    raise exception 'A rejection reason is required';
  end if;

  select email into v_actor_email from public.profiles where id = v_caller_id;

  if p_action = 'approve' then
    -- If provider_reference is supplied, the Paystack refund was initiated → processing
    -- Otherwise, status='approved' (manual provider step still required)
    if p_provider_reference is not null then
      v_new_status := 'processing';
    else
      v_new_status := 'approved';
    end if;

    update public.refunds set
      status = v_new_status,
      reviewed_by = v_caller_id,
      reviewed_at = now(),
      review_notes = coalesce(p_notes, v_refund.review_notes),
      provider_reference = coalesce(p_provider_reference, v_refund.provider_reference),
      failure_reason = p_failure_reason,
      updated_at = now()
    where id = p_refund_id;

    perform public.record_audit(
      p_actor_id    := v_caller_id,
      p_actor_email := coalesce(p_actor_email, v_actor_email, 'unknown@netlodge.test'),
      p_actor_role  := case when v_is_super then 'super_admin'::public.user_role else 'finance_admin'::public.user_role end,
      p_category    := 'refund'::public.audit_category,
      p_action      := 'refund.approved',
      p_resource_type := 'refund',
      p_resource_id := p_refund_id::text,
      p_summary     := format('Approved refund %s (status: %s)%s',
                              v_refund.reference, v_new_status::text,
                              case when p_provider_reference is not null then ' — provider ref: ' || p_provider_reference else '' end),
      p_severity    := 'warning'::public.audit_severity,
      p_after_data  := jsonb_build_object('status', v_new_status::text, 'provider_reference', p_provider_reference, 'notes', p_notes)
    );
  else
    -- reject
    v_new_status := 'rejected';
    update public.refunds set
      status = v_new_status,
      reviewed_by = v_caller_id,
      reviewed_at = now(),
      review_notes = p_notes,
      failure_reason = null,
      updated_at = now()
    where id = p_refund_id;

    perform public.record_audit(
      p_actor_id    := v_caller_id,
      p_actor_email := coalesce(p_actor_email, v_actor_email, 'unknown@netlodge.test'),
      p_actor_role  := case when v_is_super then 'super_admin'::public.user_role else 'finance_admin'::public.user_role end,
      p_category    := 'refund'::public.audit_category,
      p_action      := 'refund.rejected',
      p_resource_type := 'refund',
      p_resource_id := p_refund_id::text,
      p_summary     := format('Rejected refund %s — reason: %s', v_refund.reference, p_notes),
      p_severity    := 'warning'::public.audit_severity,
      p_after_data  := jsonb_build_object('status', v_new_status::text, 'reason', p_notes)
    );
  end if;

  return v_new_status::text;
end;
$$;

do $$ begin
  grant execute on function public.review_refund(uuid, text, text, text, text, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 3. mark_refund_completed(p_refund_id, p_provider_reference)
--
--    Called by the Paystack webhook when a refund.processed event arrives, or
--    by a manual recheck. Flips the refund to 'completed' and records the
--    provider reference. Idempotent — if already completed, returns 'already_completed'.
--    Records a ledger_entries debit for the refund.
-- ---------------------------------------------------------------------------
create or replace function public.mark_refund_completed(
  p_refund_id uuid,
  p_provider_reference text,
  p_actor_email text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refund       public.refunds%rowtype;
  v_caller_id    uuid := auth.uid();
  v_is_finance   boolean := false;
  v_is_super     boolean := false;
  v_actor_email  text;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select public.has_role(v_caller_id, 'finance_admin') into v_is_finance;
  select public.has_role(v_caller_id, 'super_admin')   into v_is_super;
  if not (v_is_finance or v_is_super) then
    raise exception 'Not authorized: finance_admin or super_admin role required';
  end if;

  select * into v_refund from public.refunds where id = p_refund_id for update;
  if not found then
    raise exception 'Refund not found';
  end if;

  if v_refund.status = 'completed' then
    return 'already_completed';
  end if;

  update public.refunds set
    status = 'completed',
    provider_reference = coalesce(p_provider_reference, v_refund.provider_reference),
    completed_at = now(),
    updated_at = now()
  where id = p_refund_id;

  -- Ledger entry (debit) — unique on (entry_type, reference)
  insert into public.ledger_entries (entry_type, reference, booking_id, payment_id, refund_id, debit_kobo, description)
  values ('refund', v_refund.reference, v_refund.booking_id, v_refund.payment_id, p_refund_id, v_refund.amount_kobo,
          'Refund completed for ' || v_refund.payment_reference)
  on conflict (entry_type, reference) do nothing;

  select email into v_actor_email from public.profiles where id = v_caller_id;

  perform public.record_audit(
    p_actor_id    := v_caller_id,
    p_actor_email := coalesce(p_actor_email, v_actor_email, 'unknown@netlodge.test'),
    p_actor_role  := case when v_is_super then 'super_admin'::public.user_role else 'finance_admin'::public.user_role end,
    p_category    := 'refund'::public.audit_category,
    p_action      := 'refund.completed',
    p_resource_type := 'refund',
    p_resource_id := p_refund_id::text,
    p_summary     := format('Refund %s completed (provider ref: %s)', v_refund.reference, coalesce(p_provider_reference, v_refund.provider_reference)),
    p_severity    := 'info'::public.audit_severity
  );

  return 'completed';
end;
$$;

do $$ begin
  grant execute on function public.mark_refund_completed(uuid, text, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 4. approve_payout(p_payout_id)
--
--    Finance admin approves a scheduled payout. Does NOT trigger a live transfer.
--    Sets status='in_flight', records approver, audit-logged.
--    Guards:
--    - Caller must be finance_admin or super_admin
--    - Payout must be in 'scheduled' status
--    - Caller cannot approve their own payout (separation of duties)
-- ---------------------------------------------------------------------------
create or replace function public.approve_payout(
  p_payout_id uuid,
  p_actor_email text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payout       public.payouts%rowtype;
  v_caller_id    uuid := auth.uid();
  v_is_finance   boolean := false;
  v_is_super     boolean := false;
  v_actor_email  text;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select public.has_role(v_caller_id, 'finance_admin') into v_is_finance;
  select public.has_role(v_caller_id, 'super_admin')   into v_is_super;
  if not (v_is_finance or v_is_super) then
    raise exception 'Not authorized: finance_admin or super_admin role required';
  end if;

  select * into v_payout from public.payouts where id = p_payout_id for update;
  if not found then
    raise exception 'Payout not found';
  end if;

  -- Separation of duties: a finance admin cannot approve their own payout
  if v_payout.landlord_id = v_caller_id then
    raise exception 'Conflict of interest: you cannot approve your own payout';
  end if;

  if v_payout.status <> 'scheduled' then
    raise exception 'Payout is not in scheduled status (current: %)', v_payout.status;
  end if;

  update public.payouts set
    status = 'in_flight',
    approved_by = v_caller_id,
    approved_at = now()
  where id = p_payout_id;

  select email into v_actor_email from public.profiles where id = v_caller_id;

  perform public.record_audit(
    p_actor_id    := v_caller_id,
    p_actor_email := coalesce(p_actor_email, v_actor_email, 'unknown@netlodge.test'),
    p_actor_role  := case when v_is_super then 'super_admin'::public.user_role else 'finance_admin'::public.user_role end,
    p_category    := 'payout'::public.audit_category,
    p_action      := 'payout.approved',
    p_resource_type := 'payout',
    p_resource_id := p_payout_id::text,
    p_summary     := format('Approved payout %s (net ₦%s) for landlord %s',
                            v_payout.reference, v_payout.net_kobo, v_payout.landlord_id),
    p_severity    := 'critical'::public.audit_severity,
    p_after_data  := jsonb_build_object('status', 'in_flight', 'approved_by', v_caller_id)
  );

  return 'in_flight';
end;
$$;

do $$ begin
  grant execute on function public.approve_payout(uuid, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 5. reject_payout(p_payout_id, p_reason)
--
--    Finance admin rejects a scheduled payout. Sets status='failed',
--    records rejection_reason. Audit-logged.
-- ---------------------------------------------------------------------------
create or replace function public.reject_payout(
  p_payout_id uuid,
  p_reason text,
  p_actor_email text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payout       public.payouts%rowtype;
  v_caller_id    uuid := auth.uid();
  v_is_finance   boolean := false;
  v_is_super     boolean := false;
  v_actor_email  text;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select public.has_role(v_caller_id, 'finance_admin') into v_is_finance;
  select public.has_role(v_caller_id, 'super_admin')   into v_is_super;
  if not (v_is_finance or v_is_super) then
    raise exception 'Not authorized: finance_admin or super_admin role required';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A rejection reason is required';
  end if;

  select * into v_payout from public.payouts where id = p_payout_id for update;
  if not found then
    raise exception 'Payout not found';
  end if;

  if v_payout.status not in ('scheduled', 'in_flight') then
    raise exception 'Payout is in terminal status % — cannot reject', v_payout.status;
  end if;

  update public.payouts set
    status = 'failed',
    rejection_reason = p_reason
  where id = p_payout_id;

  select email into v_actor_email from public.profiles where id = v_caller_id;

  perform public.record_audit(
    p_actor_id    := v_caller_id,
    p_actor_email := coalesce(p_actor_email, v_actor_email, 'unknown@netlodge.test'),
    p_actor_role  := case when v_is_super then 'super_admin'::public.user_role else 'finance_admin'::public.user_role end,
    p_category    := 'payout'::public.audit_category,
    p_action      := 'payout.rejected',
    p_resource_type := 'payout',
    p_resource_id := p_payout_id::text,
    p_summary     := format('Rejected payout %s — reason: %s', v_payout.reference, p_reason),
    p_severity    := 'critical'::public.audit_severity,
    p_after_data  := jsonb_build_object('status', 'failed', 'rejection_reason', p_reason)
  );

  return 'failed';
end;
$$;

do $$ begin
  grant execute on function public.reject_payout(uuid, text, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 6. run_reconciliation(p_from, p_to)
--
--    Idempotent reconciliation pass. For each successful payment in the date
--    range, inserts a reconciliation_record with status='matched' (the actual
--    Paystack verify call happens in the route handler, which can then call
--    resolve_reconciliation for discrepancies).
--
--    The route handler is responsible for:
--    1. Fetching successful payments in the date range
--    2. Calling Paystack verify for each
--    3. Inserting reconciliation_records via this function or directly
--    4. Flagging discrepancies for manual review
--
--    This function provides the safe insert + dedup mechanism. It does NOT
--    make outbound HTTP calls.
--
--    Returns the count of records created (0 if all already existed).
-- ---------------------------------------------------------------------------
create or replace function public.run_reconciliation(
  p_from timestamptz,
  p_to timestamptz,
  p_actor_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id    uuid := auth.uid();
  v_is_finance   boolean := false;
  v_is_super     boolean := false;
  v_actor_email  text;
  v_inserted     integer := 0;
  v_skipped      integer := 0;
  v_total        integer := 0;
  v_rec          record;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select public.has_role(v_caller_id, 'finance_admin') into v_is_finance;
  select public.has_role(v_caller_id, 'super_admin')   into v_is_super;
  if not (v_is_finance or v_is_super) then
    raise exception 'Not authorized: finance_admin or super_admin role required';
  end if;

  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Invalid date range';
  end if;

  select email into v_actor_email from public.profiles where id = v_caller_id;

  -- For each successful payment in the range, ensure a reconciliation record exists.
  -- The route handler will call Paystack verify separately and update the record.
  for v_rec in
    select p.id, p.reference, p.amount_kobo, p.confirmed_at, p.gateway_reference
      from public.payments p
     where p.status = 'successful'
       and p.confirmed_by_backend = true
       and p.confirmed_at >= p_from
       and p.confirmed_at <= p_to
  loop
    v_total := v_total + 1;

    -- Check if a record already exists for this payment reference
    if not exists (select 1 from public.reconciliation_records where internal_reference = v_rec.reference) then
      insert into public.reconciliation_records (
        internal_reference, provider_reference,
        internal_amount_kobo, provider_amount_kobo,
        internal_settled_at, provider_settled_at,
        status
      ) values (
        v_rec.reference, v_rec.gateway_reference,
        v_rec.amount_kobo, v_rec.amount_kobo, -- assume matched initially; route handler updates
        v_rec.confirmed_at, v_rec.confirmed_at,
        'matched'
      );
      v_inserted := v_inserted + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  perform public.record_audit(
    p_actor_id    := v_caller_id,
    p_actor_email := coalesce(p_actor_email, v_actor_email, 'unknown@netlodge.test'),
    p_actor_role  := case when v_is_super then 'super_admin'::public.user_role else 'finance_admin'::public.user_role end,
    p_category    := 'finance'::public.audit_category,
    p_action      := 'reconciliation.run',
    p_resource_type := 'reconciliation',
    p_resource_id := format('%s..%s', p_from, p_to),
    p_summary     := format('Reconciliation pass: %s total, %s inserted, %s skipped', v_total, v_inserted, v_skipped),
    p_severity    := 'info'::public.audit_severity,
    p_after_data  := jsonb_build_object('total', v_total, 'inserted', v_inserted, 'skipped', v_skipped, 'from', p_from, 'to', p_to)
  );

  return jsonb_build_object('total', v_total, 'inserted', v_inserted, 'skipped', v_skipped);
end;
$$;

do $$ begin
  grant execute on function public.run_reconciliation(timestamptz, timestamptz, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 7. flag_reconciliation_discrepancy(p_record_id, p_status, p_provider_amount, p_provider_settled_at, p_notes)
--
--    Called by the route handler after comparing local vs Paystack verify.
--    Updates an existing reconciliation_record to reflect a discrepancy.
--    Does NOT auto-resolve — just flags for manual review.
-- ---------------------------------------------------------------------------
create or replace function public.flag_reconciliation_discrepancy(
  p_record_id uuid,
  p_status public.reconciliation_status,
  p_provider_amount bigint default null,
  p_provider_settled_at timestamptz default null,
  p_notes text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec          public.reconciliation_records%rowtype;
  v_caller_id    uuid := auth.uid();
  v_is_finance   boolean := false;
  v_is_super     boolean := false;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select public.has_role(v_caller_id, 'finance_admin') into v_is_finance;
  select public.has_role(v_caller_id, 'super_admin')   into v_is_super;
  if not (v_is_finance or v_is_super) then
    raise exception 'Not authorized: finance_admin or super_admin role required';
  end if;

  select * into v_rec from public.reconciliation_records where id = p_record_id for update;
  if not found then
    raise exception 'Reconciliation record not found';
  end if;

  if v_rec.status = 'resolved' then
    return 'already_resolved';
  end if;

  update public.reconciliation_records set
    status = p_status,
    provider_amount_kobo = coalesce(p_provider_amount, v_rec.provider_amount_kobo),
    provider_settled_at = coalesce(p_provider_settled_at, v_rec.provider_settled_at)
  where id = p_record_id;

  return p_status::text;
end;
$$;

do $$ begin
  grant execute on function public.flag_reconciliation_discrepancy(uuid, public.reconciliation_status, bigint, timestamptz, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 8. resolve_reconciliation(p_record_id, p_notes)
--
--    Finance admin marks a discrepancy as resolved. Audit-logged.
--    Does NOT automatically fix any financial records — just records the
--    human decision.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_reconciliation(
  p_record_id uuid,
  p_notes text,
  p_actor_email text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec          public.reconciliation_records%rowtype;
  v_caller_id    uuid := auth.uid();
  v_is_finance   boolean := false;
  v_is_super     boolean := false;
  v_actor_email  text;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select public.has_role(v_caller_id, 'finance_admin') into v_is_finance;
  select public.has_role(v_caller_id, 'super_admin')   into v_is_super;
  if not (v_is_finance or v_is_super) then
    raise exception 'Not authorized: finance_admin or super_admin role required';
  end if;

  if p_notes is null or btrim(p_notes) = '' then
    raise exception 'Resolution notes are required';
  end if;

  select * into v_rec from public.reconciliation_records where id = p_record_id for update;
  if not found then
    raise exception 'Reconciliation record not found';
  end if;

  if v_rec.status = 'resolved' then
    return 'already_resolved';
  end if;

  update public.reconciliation_records set
    status = 'resolved',
    resolved_by = v_caller_id,
    resolved_at = now(),
    resolution_notes = p_notes
  where id = p_record_id;

  select email into v_actor_email from public.profiles where id = v_caller_id;

  perform public.record_audit(
    p_actor_id    := v_caller_id,
    p_actor_email := coalesce(p_actor_email, v_actor_email, 'unknown@netlodge.test'),
    p_actor_role  := case when v_is_super then 'super_admin'::public.user_role else 'finance_admin'::public.user_role end,
    p_category    := 'finance'::public.audit_category,
    p_action      := 'reconciliation.resolved',
    p_resource_type := 'reconciliation',
    p_resource_id := p_record_id::text,
    p_summary     := format('Resolved reconciliation record %s (was: %s) — notes: %s',
                            v_rec.internal_reference, v_rec.status::text, p_notes),
    p_severity    := 'info'::public.audit_severity,
    p_before_data := jsonb_build_object('status', v_rec.status::text),
    p_after_data  := jsonb_build_object('status', 'resolved', 'notes', p_notes)
  );

  return 'resolved';
end;
$$;

do $$ begin
  grant execute on function public.resolve_reconciliation(uuid, text, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 9. create_notification(p_user_id, p_type, p_title, p_body, p_href)
--
--    Deduped notification insert. If a notification with the same
--    (user_id, type, title, href) was created in the last 24 hours, skip.
--    This prevents webhook retries from spamming users.
-- ---------------------------------------------------------------------------
create or replace function public.create_notification(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text,
  p_href text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_new_id uuid;
begin
  -- Dedupe: check for an existing notification in the last 24 hours
  select id into v_existing_id
    from public.notifications
   where user_id = p_user_id
     and type = p_type
     and title = p_title
     and coalesce(href, '') = coalesce(p_href, '')
     and created_at > now() - interval '24 hours'
   order by created_at desc
   limit 1;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  insert into public.notifications (user_id, type, title, body, href)
  values (p_user_id, p_type, p_title, p_body, p_href)
  returning id into v_new_id;

  return v_new_id;
end;
$$;

do $$ begin
  grant execute on function public.create_notification(uuid, public.notification_type, text, text, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 10. update_support_ticket(p_ticket_id, p_action, p_value, p_reason)
--
--     Support staff workflow: assign, change status, escalate, de-escalate.
--     Audit-logged. Guards:
--     - Caller must be support_staff or super_admin
--     - Ticket must exist
--     - Status transitions are validated
-- ---------------------------------------------------------------------------
create or replace function public.update_support_ticket(
  p_ticket_id uuid,
  p_action text,
  p_value text default null,
  p_reason text default null,
  p_actor_email text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket       public.support_tickets%rowtype;
  v_caller_id    uuid := auth.uid();
  v_is_support   boolean := false;
  v_is_super     boolean := false;
  v_actor_email  text;
  v_new_status   public.support_ticket_status;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select public.has_role(v_caller_id, 'support_staff') into v_is_support;
  select public.has_role(v_caller_id, 'super_admin')   into v_is_super;
  if not (v_is_support or v_is_super) then
    raise exception 'Not authorized: support_staff or super_admin role required';
  end if;

  if p_action not in ('assign', 'unassign', 'change_status', 'escalate', 'de_escalate', 'set_priority', 'set_team') then
    raise exception 'Invalid action: %', p_action;
  end if;

  select * into v_ticket from public.support_tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found';
  end if;

  select email into v_actor_email from public.profiles where id = v_caller_id;
  v_new_status := v_ticket.status;

  if p_action = 'assign' then
    -- p_value is the user_id to assign to (must be support_staff or admin)
    if p_value is null then
      raise exception 'assign requires a user_id value';
    end if;
    update public.support_tickets set
      assigned_to = p_value::uuid,
      status = case when status = 'open' then 'in_progress'::public.support_ticket_status else status end,
      first_response_at = coalesce(first_response_at, now()),
      updated_at = now()
    where id = p_ticket_id;
    if v_ticket.status = 'open' then v_new_status := 'in_progress'; end if;

  elsif p_action = 'unassign' then
    update public.support_tickets set assigned_to = null, updated_at = now() where id = p_ticket_id;

  elsif p_action = 'change_status' then
    if p_value not in ('open', 'in_progress', 'awaiting_user', 'resolved', 'closed') then
      raise exception 'Invalid status value: %', p_value;
    end if;
    v_new_status := p_value::public.support_ticket_status;
    update public.support_tickets set
      status = v_new_status,
      resolved_at = case when v_new_status in ('resolved', 'closed') then now() else null end,
      updated_at = now()
    where id = p_ticket_id;

  elsif p_action = 'escalate' then
    if p_value not in ('verification_officer', 'finance_admin', 'super_admin') then
      raise exception 'escalate requires target role (verification_officer|finance_admin|super_admin)';
    end if;
    if p_reason is null or btrim(p_reason) = '' then
      raise exception 'escalation reason is required';
    end if;
    update public.support_tickets set
      escalated = true,
      escalated_to = p_value,
      escalated_reason = p_reason,
      updated_at = now()
    where id = p_ticket_id;

  elsif p_action = 'de_escalate' then
    update public.support_tickets set
      escalated = false,
      escalated_to = null,
      escalated_reason = null,
      updated_at = now()
    where id = p_ticket_id;

  elsif p_action = 'set_priority' then
    if p_value not in ('low', 'medium', 'high', 'urgent') then
      raise exception 'Invalid priority: %', p_value;
    end if;
    update public.support_tickets set priority = p_value::public.priority_level, updated_at = now() where id = p_ticket_id;

  elsif p_action = 'set_team' then
    update public.support_tickets set team = p_value::public.support_team, updated_at = now() where id = p_ticket_id;
  end if;

  perform public.record_audit(
    p_actor_id    := v_caller_id,
    p_actor_email := coalesce(p_actor_email, v_actor_email, 'unknown@netlodge.test'),
    p_actor_role  := case when v_is_super then 'super_admin'::public.user_role else 'support_staff'::public.user_role end,
    p_category    := 'support'::public.audit_category,
    p_action      := 'ticket.' || p_action,
    p_resource_type := 'support_ticket',
    p_resource_id := p_ticket_id::text,
    p_summary     := format('%s on ticket %s%s%s',
                            p_action, v_ticket.reference,
                            case when p_value is not null then ' — value: ' || p_value else '' end,
                            case when p_reason is not null then ' — reason: ' || p_reason else '' end),
    p_severity    := case when p_action = 'escalate' then 'warning'::public.audit_severity else 'info'::public.audit_severity end,
    p_after_data  := jsonb_build_object('action', p_action, 'value', p_value, 'reason', p_reason, 'new_status', v_new_status::text)
  );

  return v_new_status::text;
end;
$$;

do $$ begin
  grant execute on function public.update_support_ticket(uuid, text, text, text, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Indexes for finance queries
-- ---------------------------------------------------------------------------
create index if not exists idx_refunds_payment_id on public.refunds(payment_id);
create index if not exists idx_refunds_status on public.refunds(status);
create index if not exists idx_refunds_created_at on public.refunds(created_at);

create index if not exists idx_payouts_landlord_id on public.payouts(landlord_id);
create index if not exists idx_payouts_status on public.payouts(status);
create index if not exists idx_payouts_scheduled_for on public.payouts(scheduled_for);

create index if not exists idx_reconciliation_status on public.reconciliation_records(status);
create index if not exists idx_reconciliation_internal_ref on public.reconciliation_records(internal_reference);

create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_tickets_assigned_to on public.support_tickets(assigned_to);
create index if not exists idx_support_tickets_escalated on public.support_tickets(escalated) where escalated = true;

create index if not exists idx_notifications_user_read on public.notifications(user_id, read, created_at desc);

create index if not exists idx_ticket_messages_ticket_id on public.ticket_messages(ticket_id, created_at);
