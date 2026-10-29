-- ===========================================================================
-- NetLodge Schema Migration — Part 27: One Active Booking Per Student
-- ===========================================================================
-- Business rule: a student with an active or pending booking cannot book
-- another room until the current booking expires, is cancelled, or is
-- completed.
--
-- This is enforced inside create_booking() — the authoritative RPC.
-- The check runs inside the transaction, after the auth/role checks but
-- before the room lock, so it fails fast.
--
-- We recreate create_booking() with the additional check. The function
-- signature is unchanged (same params, same return type).
-- ===========================================================================

-- Drop and recreate create_booking with the one-active-booking check
drop function if exists public.create_booking(
  uuid, uuid, date, date, rental_period
);

create function public.create_booking(
  p_student_id uuid,
  p_unit_id uuid,
  p_check_in date,
  p_check_out date,
  p_rental_period rental_period
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id      uuid;
  v_property_id     uuid;
  v_reference       text;
  v_hold_expires    timestamptz;
  v_base_rent       bigint;
  v_additional      bigint;
  v_caution_deposit bigint;
  v_service_fee     bigint;
  v_total           bigint;
  v_rate_pct        numeric;
  v_period_days     integer;
  v_unit_period     rental_period;
  v_expected_days   integer;
  v_actual_days     integer;
  v_active_count    integer;
begin
  -- =====================================================================
  -- CA-012: Identity + role enforcement at the database level.
  -- =====================================================================
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if auth.uid() <> p_student_id then
    raise exception 'Student ID must match the authenticated user';
  end if;

  if not public.has_role(auth.uid(), 'student'::public.user_role) then
    raise exception 'Only students can book accommodation';
  end if;

  -- Validate dates
  if p_check_in is null or p_check_out is null then
    raise exception 'Check-in and check-out dates are required';
  end if;
  if p_check_out <= p_check_in then
    raise exception 'Check-out must be after check-in';
  end if;

  -- Only the three product-supported periods are bookable.
  if p_rental_period not in ('annual', 'quarterly', 'semester') then
    raise exception 'Unsupported rental period for booking: %', p_rental_period;
  end if;

  -- =====================================================================
  -- NEW: One active booking per student.
  -- A student with an active/pending booking cannot book another room.
  -- =====================================================================
  select count(*) into v_active_count
  from public.bookings
  where student_id = p_student_id
  and status in ('pending_payment', 'payment_initiated', 'confirmed', 'active');

  if v_active_count > 0 then
    raise exception 'You already have an active booking. Cancel it or wait for it to expire before booking another room.';
  end if;

  -- =====================================================================
  -- Lock the room row to prevent concurrent booking.
  -- =====================================================================
  select property_id, rental_period into v_property_id, v_unit_period
  from public.rentable_units
  where id = p_unit_id
  for update;

  if not found then
    raise exception 'Room not found';
  end if;

  -- The requested period must match the unit's configured period.
  if p_rental_period <> v_unit_period then
    raise exception 'Requested period (%) does not match the unit''s configured period (%)',
      p_rental_period, v_unit_period;
  end if;

  -- Reject units configured with non-bookable legacy periods
  if v_unit_period not in ('annual', 'quarterly', 'semester') then
    raise exception 'This unit''s rental period (%) is not bookable. Contact the landlord.',
      v_unit_period;
  end if;

  if not exists(
    select 1 from public.rentable_units
    where id = p_unit_id and status = 'available'
  ) then
    raise exception 'Room is not available';
  end if;

  if exists(
    select 1 from public.bookings
    where rentable_unit_id = p_unit_id
    and status in ('pending_payment', 'payment_initiated', 'confirmed', 'active')
    and check_in < p_check_out
    and p_check_in < check_out
  ) then
    raise exception 'Room is already booked for the selected period';
  end if;

  -- =====================================================================
  -- CA-010 / CA-011: Compute authoritative prices from trusted DB records.
  -- =====================================================================
  select base_rent_kobo, additional_charges_kobo, caution_deposit_kobo,
         service_fee_rate_pct, service_fee_kobo, total_kobo, period_days
    into v_base_rent, v_additional, v_caution_deposit,
         v_rate_pct, v_service_fee, v_total, v_expected_days
  from public.get_booking_pricing(p_unit_id);

  -- Defensive: all amounts must be non-negative
  if v_base_rent < 0 or v_additional < 0 or v_caution_deposit < 0
     or v_service_fee < 0 or v_total < 0 then
    raise exception 'Computed booking amounts are invalid';
  end if;

  -- Validate the caller-supplied date range matches the period duration
  v_actual_days := p_check_out - p_check_in;
  if abs(v_actual_days - v_expected_days) > 2 then
    raise exception 'Booking duration (%) days does not match the % period (% days)',
      v_actual_days, p_rental_period, v_expected_days;
  end if;

  -- Generate a unique reference
  v_reference := 'NLG-BKG-' || upper(substr(md5(random()::text), 1, 6));
  v_hold_expires := now() + interval '24 hours';

  -- Create the booking with the authoritative cost snapshot.
  insert into public.bookings (
    reference, student_id, property_id, rentable_unit_id,
    status, current_step, check_in, check_out, rental_period,
    base_rent_kobo, additional_charges_kobo, caution_deposit_kobo,
    service_fee_kobo, total_kobo, paid_kobo, outstanding_kobo,
    hold_expires_at
  ) values (
    v_reference, p_student_id, v_property_id, p_unit_id,
    'pending_payment', 'booking_creation', p_check_in, p_check_out, p_rental_period,
    v_base_rent, v_additional, v_caution_deposit,
    v_service_fee, v_total, 0, v_total,
    v_hold_expires
  )
  returning id into v_booking_id;

  -- Mark the room as held
  update public.rentable_units
  set status = 'held', active_hold_id = v_booking_id, updated_at = now()
  where id = p_unit_id;

  -- Record status history
  insert into public.booking_status_history (booking_id, to_status, changed_by)
  values (v_booking_id, 'pending_payment', p_student_id);

  return v_booking_id;
end;
$$;

do $$ begin
  grant execute on function public.create_booking(
    uuid, uuid, date, date, rental_period
  ) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
insert into public.audit_logs (
  actor_email, actor_role, category, action, resource_type, resource_id,
  summary, severity
) values (
  'system@netlodge.test',
  'super_admin'::public.user_role,
  'security'::public.audit_category,
  'migration.applied',
  'migration',
  '0027_one_active_booking.sql',
  'One active booking per student: create_booking() now checks for existing active/pending bookings and rejects new bookings. Enforced at DB level.',
  'warning'::public.audit_severity
);
