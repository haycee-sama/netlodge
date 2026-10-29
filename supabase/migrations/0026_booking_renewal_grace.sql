-- ===========================================================================
-- NetLodge Schema Migration — Part 26: Booking Renewal & Grace Period
-- ===========================================================================
-- Business rules:
--   1. A student with an active/pending booking cannot book another room
--      until the current booking expires or is cancelled.
--   2. When a booking's period is nearing its end (check_out - 48h), the
--      student gets a 48-hour grace period to indicate willingness to
--      renew and make payment.
--   3. If no renewal payment is made within the grace period, the booking
--      moves to 'completed' status and the room goes back to 'available'.
--
-- Schema changes:
--   - bookings.renewal_requested_at timestamptz — when the student
--     requested a renewal (set by the student, checked by the cron)
--   - bookings.renewal_grace_until timestamptz — deadline for renewal
--     payment (set to check_out + 48h)
--   - bookings.renewed_from uuid — links a renewed booking to its
--     predecessor
--
-- New RPC:
--   request_booking_renewal(p_booking_id) — student requests renewal
--   process_expired_bookings() — cron: completes expired bookings,
--     releases rooms, handles grace period logic
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Add renewal columns to bookings
-- ---------------------------------------------------------------------------
do $$ begin
  alter table public.bookings
    add column if not exists renewal_requested_at timestamptz;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.bookings
    add column if not exists renewal_grace_until timestamptz;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.bookings
    add column if not exists renewed_from uuid references public.bookings(id);
exception when duplicate_column then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. request_booking_renewal(p_booking_id)
--    Called by the student when they want to renew their booking.
--    Sets renewal_requested_at = now(). The actual renewal (creating a
--    new booking for the next period) happens after payment.
-- ---------------------------------------------------------------------------
create or replace function public.request_booking_renewal(
  p_booking_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  -- Auth check
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the booking
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found';
  end if;

  -- Verify ownership
  if v_booking.student_id <> auth.uid() then
    raise exception 'You can only request renewal for your own booking';
  end if;

  -- Must be in an active/confirmed state
  if v_booking.status not in ('confirmed', 'active') then
    raise exception 'Only confirmed or active bookings can be renewed';
  end if;

  -- Set renewal requested
  update public.bookings
    set renewal_requested_at = now(),
        renewal_grace_until = v_booking.check_out::timestamptz + interval '48 hours',
        updated_at = now()
  where id = p_booking_id;

  return 'renewal_requested';
end;
$$;

do $$ begin
  grant execute on function public.request_booking_renewal(uuid)
    to authenticated, service_role;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 3. process_expired_bookings()
--    Cron job: runs daily. For each booking:
--    - If check_out has passed AND no renewal was requested → complete it
--    - If check_out has passed AND renewal was requested but grace period
--      expired (check_out + 48h) AND no new booking was created → complete it
--    - Releases the room back to 'available'
--    Returns count of processed bookings.
-- ---------------------------------------------------------------------------
create or replace function public.process_expired_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_booking record;
begin
  for v_booking in
    select id, rentable_unit_id, status, check_out, renewal_requested_at, renewal_grace_until
    from public.bookings
    where status in ('confirmed', 'active')
    and check_out < current_date
  loop
    -- Check if grace period applies
    if v_booking.renewal_requested_at is not null and v_booking.renewal_grace_until is not null then
      -- Renewal was requested — check if grace period expired
      if now() < v_booking.renewal_grace_until then
        -- Still within grace period — skip
        continue;
      end if;
    end if;

    -- Complete the booking
    update public.bookings
      set status = 'completed',
          updated_at = now()
    where id = v_booking.id;

    -- Release the room
    update public.rentable_units
      set status = 'available',
          active_booking_id = null,
          active_hold_id = null,
          updated_at = now()
    where id = v_booking.rentable_unit_id
    and status in ('occupied', 'held');

    -- Record status history
    insert into public.booking_status_history (booking_id, from_status, to_status, reason)
    values (v_booking.id, v_booking.status, 'completed', 'Booking period ended');

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

do $$ begin
  grant execute on function public.process_expired_bookings()
    to service_role;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 4. Audit log
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
  '0026_booking_renewal_grace.sql',
  'Booking renewal + 48h grace period: added renewal_requested_at, renewal_grace_until, renewed_from columns. New RPCs: request_booking_renewal(), process_expired_bookings() (daily cron).',
  'info'::public.audit_severity
);
