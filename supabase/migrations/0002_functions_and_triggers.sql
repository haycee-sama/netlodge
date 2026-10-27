-- ===========================================================================
-- NetLodge Schema Migration — Part 2: Functions and Triggers
-- ===========================================================================
-- Database functions for profile creation, booking concurrency, audit logging.
-- Run after 0001_schema.sql.
-- All SECURITY DEFINER functions set search_path = public for safety.
-- ===========================================================================

-- ===========================================================================
-- Auto-create profile when a new auth user signs up
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  )
  on conflict (id) do nothing;

  -- Assign default 'student' role — NEVER grant admin roles on signup.
  insert into public.user_roles (user_id, role, reason)
  values (new.id, 'student', 'Default role on registration')
  on conflict (user_id, role) do nothing;

  -- Create notification preferences
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Drop existing trigger if it exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- Get current user's roles
-- ===========================================================================
create or replace function public.get_user_roles(p_user_id uuid)
returns user_role[]
language sql
security definer
stable
set search_path = public
as $$
  select array_agg(role) from public.user_roles where user_id = p_user_id;
$$;

-- ===========================================================================
-- Check if user has a specific role
-- ===========================================================================
create or replace function public.has_role(p_user_id uuid, p_role user_role)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(select 1 from public.user_roles where user_id = p_user_id and role = p_role);
$$;

-- ===========================================================================
-- Check if user is an admin (any admin role)
-- ===========================================================================
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.user_roles
    where user_id = p_user_id
    and role in ('verification_officer', 'support_staff', 'finance_admin', 'super_admin')
  );
$$;

-- ===========================================================================
-- Check if user owns or is assigned to a property
-- ===========================================================================
create or replace function public.can_access_property(p_user_id uuid, p_property_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.properties
    where id = p_property_id and landlord_id = p_user_id
  ) or exists(
    select 1 from public.property_assignments
    where property_id = p_property_id and user_id = p_user_id
  );
$$;

-- ===========================================================================
-- Prevent double-booking: atomically reserve a room
-- Returns the booking ID on success, raises exception on failure.
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

  -- Generate a unique reference
  v_reference := 'NLG-BKG-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
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

-- ===========================================================================
-- Confirm a booking after payment is verified
-- ===========================================================================
create or replace function public.confirm_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit_id uuid;
  v_current_status booking_status;
begin
  -- Lock the booking
  select rentable_unit_id, status into v_unit_id, v_current_status
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  -- Update booking status
  update public.bookings
  set status = 'confirmed',
      current_step = 'booking_confirmation',
      confirmed_at = now(),
      updated_at = now()
  where id = p_booking_id;

  -- Update room status
  update public.rentable_units
  set status = 'occupied',
      active_booking_id = p_booking_id,
      active_hold_id = null,
      updated_at = now()
  where id = v_unit_id;

  -- Record status history (fixed: use actual previous status)
  insert into public.booking_status_history (booking_id, from_status, to_status, changed_by)
  values (p_booking_id, v_current_status, 'confirmed', auth.uid());

  -- Insert into ledger
  insert into public.ledger_entries (entry_type, reference, booking_id, credit_kobo, description)
  select 'payment', b.reference, b.id, b.paid_kobo, 'Payment confirmed for booking ' || b.reference
  from public.bookings b
  where b.id = p_booking_id;
end;
$$;

-- ===========================================================================
-- Cancel a booking and release the room
-- ===========================================================================
create or replace function public.cancel_booking(p_booking_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit_id uuid;
  v_current_status booking_status;
begin
  select rentable_unit_id, status into v_unit_id, v_current_status
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  -- Update booking
  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = p_reason,
      updated_at = now()
  where id = p_booking_id;

  -- Release the room if it was held
  if v_current_status in ('pending_payment', 'payment_initiated') then
    update public.rentable_units
    set status = 'available', active_hold_id = null, updated_at = now()
    where id = v_unit_id and status = 'held';
  end if;

  -- Record status history
  insert into public.booking_status_history (booking_id, from_status, to_status, reason, changed_by)
  values (p_booking_id, v_current_status, 'cancelled', p_reason, auth.uid());
end;
$$;

-- ===========================================================================
-- Record an audit log entry
-- ===========================================================================
create or replace function public.record_audit(
  p_actor_id uuid,
  p_actor_email text,
  p_actor_role user_role,
  p_category audit_category,
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_summary text,
  p_severity audit_severity default 'info',
  p_ip_address text default null,
  p_user_agent text default null,
  p_before_data jsonb default null,
  p_after_data jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.audit_logs (
    actor_id, actor_email, actor_role, category, action,
    resource_type, resource_id, summary, severity,
    ip_address, user_agent, before_data, after_data
  ) values (
    p_actor_id, p_actor_email, p_actor_role, p_category, p_action,
    p_resource_type, p_resource_id, p_summary, p_severity,
    p_ip_address, p_user_agent, p_before_data, p_after_data
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ===========================================================================
-- Prevent deletion of audit logs (trigger)
-- ===========================================================================
create or replace function public.prevent_audit_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Audit logs are immutable and cannot be deleted';
end;
$$;

drop trigger if exists prevent_audit_delete on public.audit_logs;
create trigger prevent_audit_delete
  before delete on public.audit_logs
  for each row execute function public.prevent_audit_delete();

create or replace function public.prevent_audit_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Audit logs are immutable and cannot be updated';
end;
$$;

drop trigger if exists prevent_audit_update on public.audit_logs;
create trigger prevent_audit_update
  before update on public.audit_logs
  for each row execute function public.prevent_audit_update();

-- ===========================================================================
-- Prevent deletion of ledger entries (trigger)
-- ===========================================================================
create or replace function public.prevent_ledger_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Ledger entries are immutable and cannot be deleted';
end;
$$;

drop trigger if exists prevent_ledger_delete on public.ledger_entries;
create trigger prevent_ledger_delete
  before delete on public.ledger_entries
  for each row execute function public.prevent_ledger_delete();

create or replace function public.prevent_ledger_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Ledger entries are immutable and cannot be updated';
end;
$$;

drop trigger if exists prevent_ledger_update on public.ledger_entries;
create trigger prevent_ledger_update
  before update on public.ledger_entries
  for each row execute function public.prevent_ledger_update();
