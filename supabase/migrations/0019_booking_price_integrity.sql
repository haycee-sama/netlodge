-- ===========================================================================
-- NetLodge Schema Migration — Part 19: Booking Price Integrity (CA-010/011/012)
-- ===========================================================================
-- Remediation of three findings from the Phase 2 booking financial integrity
-- audit:
--
--   CA-010 (P1): create_booking() accepted base_rent, additional_charges,
--                caution_deposit, service_fee and total as caller-supplied
--                parameters. A direct RPC caller (bypassing the application
--                service) could book a ₦500,000/year room for 1 kobo.
--   CA-011 (P2): The 5% service-fee rate was hardcoded in the client. The
--                platform_settings.booking.service_fee_rate value was never
--                read by the server, so a config change could not take effect
--                and the client could override it.
--   CA-012 (P2): create_booking() is SECURITY DEFINER and did not verify
--                auth.uid() = p_student_id or that the caller held the
--                'student' role. Any authenticated user (landlord, admin)
--                could create a booking for any student_id via direct RPC.
--
-- Fixes:
--   1. New function get_booking_pricing(p_unit_id, p_rental_period) is the
--      SINGLE source of truth for booking pricing. It reads the unit's
--      annual_rent_kobo, caution_deposit_kobo, sums additional_charges, and
--      reads the service-fee rate from platform_settings. Both the booking UI
--      (for display) and create_booking() (for storage) call it, so the
--      displayed summary, stored amounts, and payment amount can never
--      diverge.
--   2. create_booking() is rewritten to accept ONLY legitimate user inputs
--      (student_id, unit_id, check_in, check_out, rental_period). All prices
--      are computed inside the function via get_booking_pricing(). The old
--      pricing parameters are removed — callers can no longer influence them.
--   3. create_booking() now enforces, at the database level:
--        - auth.uid() IS NOT NULL  (rejects anon + service_role direct calls)
--        - auth.uid() = p_student_id  (caller is the student being booked for)
--        - has_role(auth.uid(), 'student')  (caller holds the student role)
--      The application-layer checks in property-service.ts remain as defense
--      in depth, but direct RPC invocation can no longer bypass them.
--   4. Service-fee rate is parsed defensively: missing or malformed
--      platform_settings row falls back to 0% (fail-safe: no fee rather than
--      blocking bookings). The same parse logic runs in get_booking_pricing
--      and create_booking, so display and storage always agree.
--
-- Compatibility:
--   - The function signature changes (10 params → 5 params). This is a
--     deliberate breaking change: the old params were the vulnerability.
--     All application callers (property-service.ts) and test callers
--     (test-concurrency.ts) are updated in the same commit.
--   - Existing bookings are untouched. Only new bookings are affected.
--   - confirm_payment, cancel_booking, and the payment routes are unchanged —
--     they already derive the payment amount from booking.outstanding_kobo,
--     which is now computed authoritatively.
--
-- NOT applied to production by this commit. Forward-only — DROP + CREATE
-- is used because CREATE OR REPLACE with a different signature would create
-- an overload, not a replacement.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. get_booking_pricing(p_unit_id)
--
--    Authoritative booking pricing preview. Callable by anyone (anon,
--    authenticated, service_role) — room pricing is public information,
--    visible on the public room detail page without authentication.
--    Reads platform_settings via SECURITY DEFINER so the admin-only RLS
--    on platform_settings does not block anon/authenticated callers from
--    seeing the service-fee rate.
--
--    The function takes ONLY the unit id. NetLodge's booking product
--    currently supports a single pricing model: the upfront annual total
--    (annual rent + caution deposit + applicable additional charges +
--    service fee). The rental_period enum (annual/biannual/quarterly/
--    monthly) exists in the schema but the product does not implement
--    per-period pricing — all bookings are charged the annual rent.
--    Rather than silently accepting and ignoring a rental_period
--    parameter (which would mislead callers into thinking non-annual
--    periods are priced differently), the function omits it entirely.
--    create_booking() enforces that p_rental_period = 'annual'.
--
--    Returns one row with: base_rent, additional_charges, caution_deposit,
--    service_fee_rate_pct, service_fee, total (all integer kobo except the
--    rate which is numeric percentage).
--
--    Pricing rules (frozen here as the single source of truth):
--      base_rent         = rentable_units.annual_rent_kobo
--      caution_deposit   = COALESCE(rentable_units.caution_deposit_kobo, 0)
--      additional_charges = SUM(additional_charges.amount_kobo) WHERE
--                          frequency IN ('one_time','annual')
--                          (monthly charges are recurring, not part of the
--                           upfront annual booking total)
--      service_fee_rate  = platform_settings.'booking.service_fee_rate'
--                          parsed as numeric; 0 if missing/malformed/out of
--                          range [0,100]
--      service_fee       = ROUND(base_rent * rate / 100)  — applied to base
--                          rent only, preserving existing product behavior
--      total             = base_rent + additional_charges + caution_deposit
--                          + service_fee
-- ---------------------------------------------------------------------------

create or replace function public.get_booking_pricing(
  p_unit_id uuid
)
returns table(
  base_rent_kobo bigint,
  additional_charges_kobo bigint,
  caution_deposit_kobo bigint,
  service_fee_rate_pct numeric,
  service_fee_kobo bigint,
  total_kobo bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_annual_rent     bigint;
  v_caution_deposit bigint;
  v_rate_str        text;
  v_rate_pct        numeric;
  v_additional      bigint;
  v_service_fee     bigint;
  v_total           bigint;
begin
  -- Read the authoritative unit prices.
  -- NOTE: alias the table and prefix columns because RETURNS TABLE creates
  -- output-column variables (e.g. caution_deposit_kobo) that would shadow
  -- and create ambiguous references with rentable_units columns.
  select ru.annual_rent_kobo, coalesce(ru.caution_deposit_kobo, 0)
    into v_annual_rent, v_caution_deposit
  from public.rentable_units ru
  where ru.id = p_unit_id;

  if not found then
    raise exception 'Room not found';
  end if;

  if v_annual_rent is null or v_annual_rent < 0 then
    raise exception 'Room has invalid annual rent';
  end if;

  if v_caution_deposit is null or v_caution_deposit < 0 then
    v_caution_deposit := 0;
  end if;

  -- Read the service-fee rate from platform_settings.
  -- SECURITY DEFINER bypasses the admin-only RLS so students can preview.
  v_rate_pct := 0;
  select value into v_rate_str
  from public.platform_settings
  where key = 'booking.service_fee_rate';

  if v_rate_str is not null then
    begin
      v_rate_pct := v_rate_str::numeric;
      -- Guard against absurd values — a malformed admin entry must not
      -- inflate the fee to 10000% or go negative.
      if v_rate_pct is null or v_rate_pct < 0 or v_rate_pct > 100 then
        v_rate_pct := 0;
      end if;
    exception when others then
      v_rate_pct := 0;
    end;
  end if;

  -- Sum additional charges that apply to an annual booking upfront.
  -- Monthly charges are recurring and excluded from the upfront total.
  select coalesce(sum(amount_kobo), 0) into v_additional
  from public.additional_charges
  where unit_id = p_unit_id
    and frequency in ('one_time', 'annual');

  if v_additional is null or v_additional < 0 then
    v_additional := 0;
  end if;

  -- Service fee on base rent only (preserves existing product behavior —
  -- the prior client computed Math.round(annualRent * 0.05)).
  v_service_fee := round(v_annual_rent::numeric * v_rate_pct / 100.0)::bigint;

  v_total := v_annual_rent + v_additional + v_caution_deposit + v_service_fee;

  return query select
    v_annual_rent,
    v_additional,
    v_caution_deposit,
    v_rate_pct,
    v_service_fee,
    v_total;
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
-- 2. Replace create_booking() with the authoritative-pricing version.
--
--    DROP first because the signature changes (10 params → 5 params).
--    CREATE OR REPLACE would create an overload, leaving the vulnerable
--    10-param version callable.
-- ---------------------------------------------------------------------------

drop function if exists public.create_booking(
  uuid, uuid, date, date, rental_period, bigint, bigint, bigint, bigint, bigint
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
begin
  -- =====================================================================
  -- CA-012: Identity + role enforcement at the database level.
  --
  -- The application service (property-service.ts) performs the same checks
  -- for friendly error messages, but those can be bypassed by direct RPC
  -- invocation. These checks cannot.
  -- =====================================================================

  -- Reject unauthenticated callers. service_role direct calls also have
  -- auth.uid() = NULL and are rejected — there is no legitimate service-
  -- role booking path today. If one is needed in future, it must use a
  -- separate, explicitly-authorized function (not this one).
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- The caller must be the student the booking is for.
  if auth.uid() <> p_student_id then
    raise exception 'Student ID must match the authenticated user';
  end if;

  -- The caller must hold the student role. Landlords, admins, and other
  -- roles are rejected even if they somehow hold a valid student_id.
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

  -- NetLodge's booking product supports annual pricing only. The
  -- rental_period enum has four values (annual/biannual/quarterly/monthly)
  -- but per-period pricing is not implemented — all bookings are charged
  -- the annual rent. Reject non-annual periods explicitly rather than
  -- silently charging the annual rent for a shorter period.
  if p_rental_period <> 'annual' then
    raise exception 'Only annual rental period is supported for booking';
  end if;

  -- =====================================================================
  -- Lock the room row to prevent concurrent booking (existing behavior).
  -- =====================================================================
  select property_id into v_property_id
  from public.rentable_units
  where id = p_unit_id
  for update;

  if not found then
    raise exception 'Room not found';
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
  -- No caller-supplied pricing is accepted. get_booking_pricing() takes
  -- only the unit id — the rental period is enforced above (annual only).
  -- =====================================================================
  select base_rent_kobo, additional_charges_kobo, caution_deposit_kobo,
         service_fee_rate_pct, service_fee_kobo, total_kobo
    into v_base_rent, v_additional, v_caution_deposit,
         v_rate_pct, v_service_fee, v_total
  from public.get_booking_pricing(p_unit_id);

  -- Defensive: all amounts must be non-negative
  if v_base_rent < 0 or v_additional < 0 or v_caution_deposit < 0
     or v_service_fee < 0 or v_total < 0 then
    raise exception 'Computed booking amounts are invalid';
  end if;

  -- Generate a unique reference (md5(random()) pattern from migration 0011)
  v_reference := 'NLG-BKG-' || upper(substr(md5(random()::text), 1, 6));
  v_hold_expires := now() + interval '24 hours';

  -- Create the booking with the authoritative cost snapshot
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
-- 3. Audit-log this migration (matches the convention from 0017).
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
  '0019_booking_price_integrity.sql',
  'CA-010/011/012: create_booking now computes authoritative pricing and enforces caller identity at the DB level. New get_booking_pricing(p_unit_id) is the single source of truth for display and storage. Non-annual rental periods are rejected (annual-only product).',
  'warning'::public.audit_severity
);
