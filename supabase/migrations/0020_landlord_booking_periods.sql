-- ===========================================================================
-- NetLodge Schema Migration — Part 20: Landlord-Configurable Booking Periods
-- ===========================================================================
-- Product requirement: landlords must be able to configure the booking/
-- rental period offered for their units. Supported options:
--   - Annual
--   - Quarterly
--   - Per semester
--
-- Prior state (after migration 0019):
--   - rental_period enum: ('annual', 'biannual', 'quarterly', 'monthly')
--   - rentable_units.annual_rent_kobo is the ONLY price column
--   - get_booking_pricing(p_unit_id) computes the annual total only
--   - create_booking() rejects non-annual periods
--   - Student room-booking-card.tsx has a period selector letting students
--     pick ANY period, contradicting the landlord's configured period
--   - Both booking UIs hardcode checkOut = checkIn + 1 year regardless of
--     the selected period
--
-- Changes:
--   1. Add 'semester' to the rental_period enum. 'biannual' and 'monthly'
--      remain in the enum for backward compatibility (existing units may use
--      them) but are not offered in the landlord selector.
--   2. Add rentable_units.period_rent_kobo — the rent for ONE period of the
--      configured type. For 'annual', this equals annual_rent_kobo. For
--      'quarterly', this is the per-quarter rent. For 'semester', this is the
--      per-semester rent. The landlord enters this directly (NOT derived by
--      dividing annual_rent_kobo). annual_rent_kobo is preserved for backward
--      compatibility and the price-from display.
--   3. Rewrite get_booking_pricing() to use period_rent_kobo as the base rent
--      and return the period duration in days so the UI can compute checkOut.
--   4. Rewrite create_booking() to accept all three supported periods
--      (annual, quarterly, semester) and validate that the requested period
--      matches the unit's configured rental_period. 'biannual' and 'monthly'
--      remain rejected (not in the product requirement).
--
-- Booking duration rules (fixed, no academic calendar needed):
--   annual    = 365 days
--   quarterly = 91  days (~3 months)
--   semester  = 152 days (~5 months)
-- These are fixed durations derived from the period type. The student sees
-- the exact check-in → check-out dates before booking. No semester dates are
-- invented — the duration is a fixed ~5-month block starting from the
-- student's chosen check-in date.
--
-- Service-fee rule: the fee is computed on period_rent_kobo (the rent for the
-- booked period), once per booking. This preserves the existing behavior for
-- annual bookings (fee on annual rent) and extends it naturally to quarterly
-- and semester bookings.
--
-- NOT applied to production by this commit. Forward-only.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Add 'semester' to the rental_period enum
-- ---------------------------------------------------------------------------
do $$ begin
  alter type public.rental_period add value if not exists 'semester';
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Add period_rent_kobo to rentable_units
--    The rent for ONE period of the configured type. For 'annual' units this
--    equals annual_rent_kobo. For 'quarterly'/'semester' units this is the
--    per-period rent entered by the landlord.
--
--    Backfill: for existing units, set period_rent_kobo = annual_rent_kobo
--    (all existing units are annual-period by default). This preserves
--    existing booking behavior exactly.
-- ---------------------------------------------------------------------------
do $$ begin
  alter table public.rentable_units
    add column if not exists period_rent_kobo bigint;
exception when duplicate_column then null;
end $$;

-- Backfill existing rows: period_rent = annual_rent (existing units are annual)
update public.rentable_units
  set period_rent_kobo = annual_rent_kobo
  where period_rent_kobo is null;

-- Make NOT NULL after backfill
do $$ begin
  alter table public.rentable_units
    alter column period_rent_kobo set not null;
exception when others then null;
end $$;

-- Add a CHECK: period rent must be non-negative
do $$ begin
  alter table public.rentable_units
    add constraint rentable_units_period_rent_nonneg
    check (period_rent_kobo >= 0);
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Rewrite get_booking_pricing() to use period_rent_kobo and return duration
--
--    Returns: base_rent_kobo, additional_charges_kobo, caution_deposit_kobo,
--             service_fee_rate_pct, service_fee_kobo, total_kobo,
--             period_days (integer), rental_period (text)
--
--    The caller (UI or create_booking) uses period_days to compute the
--    booking check-out date from the check-in date.
--
--    DROP first because the return type changed (6 columns → 8 columns).
--    CREATE OR REPLACE cannot change the return type.
-- ---------------------------------------------------------------------------
drop function if exists public.get_booking_pricing(uuid);

create function public.get_booking_pricing(
  p_unit_id uuid
)
returns table(
  base_rent_kobo bigint,
  additional_charges_kobo bigint,
  caution_deposit_kobo bigint,
  service_fee_rate_pct numeric,
  service_fee_kobo bigint,
  total_kobo bigint,
  period_days integer,
  rental_period text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_rent     bigint;
  v_caution_deposit bigint;
  v_rate_str        text;
  v_rate_pct        numeric;
  v_additional      bigint;
  v_service_fee     bigint;
  v_total           bigint;
  v_period_days     integer;
  v_rental_period   text;
begin
  -- Read the authoritative unit prices.
  -- Alias the table and prefix columns because RETURNS TABLE creates
  -- output-column variables that would shadow rentable_units columns.
  select ru.period_rent_kobo, coalesce(ru.caution_deposit_kobo, 0),
         ru.rental_period::text
    into v_period_rent, v_caution_deposit, v_rental_period
  from public.rentable_units ru
  where ru.id = p_unit_id;

  if not found then
    raise exception 'Room not found';
  end if;

  if v_period_rent is null or v_period_rent < 0 then
    raise exception 'Room has invalid period rent';
  end if;

  if v_caution_deposit is null or v_caution_deposit < 0 then
    v_caution_deposit := 0;
  end if;

  -- Determine the booking duration in days for the configured period.
  -- These are fixed durations — no academic calendar is needed.
  case v_rental_period
    when 'annual'    then v_period_days := 365;
    when 'quarterly' then v_period_days := 91;
    when 'semester'  then v_period_days := 152;
    when 'biannual'  then v_period_days := 183;  -- legacy: ~6 months
    when 'monthly'   then v_period_days := 30;   -- legacy: ~1 month
    else
      raise exception 'Unsupported rental period: %', v_rental_period;
  end case;

  -- Read the service-fee rate from platform_settings.
  -- SECURITY DEFINER bypasses the admin-only RLS so anon/authenticated callers
  -- can preview.
  v_rate_pct := 0;
  select value into v_rate_str
  from public.platform_settings
  where key = 'booking.service_fee_rate';

  if v_rate_str is not null then
    begin
      v_rate_pct := v_rate_str::numeric;
      if v_rate_pct is null or v_rate_pct < 0 or v_rate_pct > 100 then
        v_rate_pct := 0;
      end if;
    exception when others then
      v_rate_pct := 0;
    end;
  end if;

  -- Sum additional charges that apply to the booking upfront.
  -- 'one_time' and 'annual' charges are included. 'monthly' charges are
  -- recurring and excluded from the upfront total.
  select coalesce(sum(amount_kobo), 0) into v_additional
  from public.additional_charges
  where unit_id = p_unit_id
    and frequency in ('one_time', 'annual');

  if v_additional is null or v_additional < 0 then
    v_additional := 0;
  end if;

  -- Service fee on the period rent (the rent for the booked period).
  v_service_fee := round(v_period_rent::numeric * v_rate_pct / 100.0)::bigint;

  v_total := v_period_rent + v_additional + v_caution_deposit + v_service_fee;

  return query select
    v_period_rent,
    v_additional,
    v_caution_deposit,
    v_rate_pct,
    v_service_fee,
    v_total,
    v_period_days,
    v_rental_period;
end;
$$;

do $$ begin
  -- Room pricing is public information (visible on the public room page
  -- without authentication), so anon is granted execute. service_role is
  -- granted so test/admin scripts using the service key can preview.
  grant execute on function public.get_booking_pricing(uuid)
    to authenticated, anon, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Rewrite create_booking() to accept all three supported periods
--
--    The function validates that p_rental_period matches the unit's
--    configured rental_period (the landlord's offered period). A student
--    cannot book a 'quarterly' unit as 'annual' or vice versa.
--
--    The check-in/check-out dates are provided by the caller (the UI computes
--    them from the period duration returned by get_booking_pricing). The
--    function validates that the date range is consistent with the period
--    type (within a small tolerance for calendar rounding).
--
--    'biannual' and 'monthly' remain rejected — they are not in the product
--    requirement. Existing units with those periods can still be queried
--    (get_booking_pricing returns their pricing) but cannot be booked until
--    the landlord changes them to a supported period.
-- ---------------------------------------------------------------------------
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
  -- 'biannual' and 'monthly' exist in the enum for backward compatibility
  -- but are not offered to landlords and cannot be booked.
  if p_rental_period not in ('annual', 'quarterly', 'semester') then
    raise exception 'Unsupported rental period for booking: %', p_rental_period;
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
  -- A student cannot book a 'quarterly' unit as 'annual'.
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
  -- (within a ±2 day tolerance for calendar rounding, e.g. Feb in leap years).
  v_actual_days := p_check_out - p_check_in;
  if abs(v_actual_days - v_expected_days) > 2 then
    raise exception 'Booking duration (%) days does not match the % period (% days)',
      v_actual_days, p_rental_period, v_expected_days;
  end if;

  -- Generate a unique reference
  v_reference := 'NLG-BKG-' || upper(substr(md5(random()::text), 1, 6));
  v_hold_expires := now() + interval '24 hours';

  -- Create the booking with the authoritative cost snapshot.
  -- The base_rent_kobo stored here is the PERIOD rent (not annual), so the
  -- booking record is self-consistent regardless of later landlord edits.
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
-- 5. Audit-log this migration
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
  '0020_landlord_booking_periods.sql',
  'Landlord-configurable booking periods: added semester enum value, period_rent_kobo column, rewrote get_booking_pricing + create_booking to support annual/quarterly/semester with fixed durations and per-period pricing.',
  'warning'::public.audit_severity
);
