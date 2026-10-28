-- ===========================================================================
-- NetLodge Schema Migration — Part 11: Fix create_booking gen_random_bytes
-- ===========================================================================
-- Root cause: gen_random_bytes() lives in the `extensions` schema, but
-- create_booking() sets search_path = public (for security). This causes
-- "function gen_random_bytes(integer) does not exist" when booking.
--
-- Fix: Replace gen_random_bytes(4) with md5(random()::text) — the same
-- pattern used by create_refund (0009) and create_student_ticket (0010).
-- This avoids the cross-schema dependency entirely.
-- ===========================================================================

create or replace function public.create_booking(
  p_student_id uuid,
  p_unit_id uuid,
  p_check_in date,
  p_check_out date,
  p_rental_period rental_period,
  p_base_rent_kobo bigint,
  p_additional_charges_kobo bigint,
  p_caution_deposit_kobo bigint,
  p_service_fee_kobo bigint,
  p_total_kobo bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
  v_property_id uuid;
  v_reference text;
  v_hold_expires timestamptz;
begin
  -- Lock the room row to prevent concurrent booking
  select property_id into v_property_id
  from public.rentable_units
  where id = p_unit_id
  for update;

  if not found then
    raise exception 'Room not found';
  end if;

  -- Check the room is available
  if not exists(
    select 1 from public.rentable_units
    where id = p_unit_id and status = 'available'
  ) then
    raise exception 'Room is not available';
  end if;

  -- Check for overlapping bookings
  if exists(
    select 1 from public.bookings
    where rentable_unit_id = p_unit_id
    and status in ('pending_payment', 'payment_initiated', 'confirmed', 'active')
    and check_in < p_check_out
    and p_check_in < check_out
  ) then
    raise exception 'Room is already booked for the selected period';
  end if;

  -- Generate a unique reference using md5(random()) instead of gen_random_bytes
  -- (gen_random_bytes lives in the extensions schema which is not in search_path)
  v_reference := 'NLG-BKG-' || upper(substr(md5(random()::text), 1, 6));
  v_hold_expires := now() + interval '24 hours';

  -- Create the booking
  insert into public.bookings (
    reference, student_id, property_id, rentable_unit_id,
    status, current_step, check_in, check_out, rental_period,
    base_rent_kobo, additional_charges_kobo, caution_deposit_kobo,
    service_fee_kobo, total_kobo, paid_kobo, outstanding_kobo,
    hold_expires_at
  ) values (
    v_reference, p_student_id, v_property_id, p_unit_id,
    'pending_payment', 'booking_creation', p_check_in, p_check_out, p_rental_period,
    p_base_rent_kobo, p_additional_charges_kobo, p_caution_deposit_kobo,
    p_service_fee_kobo, p_total_kobo, 0, p_total_kobo,
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
    uuid, uuid, date, date, rental_period, bigint, bigint, bigint, bigint, bigint
  ) to authenticated, service_role;
exception when duplicate_object then null;
end $$;
