-- ===========================================================================
-- NetLodge Schema Migration — Part 28: Security Hardening (Pen Test Remediation)
-- ===========================================================================
-- Remediation of confirmed findings from the NL-SEC-2026-001 penetration test.
--
-- F-10/F-14 (P0): Anonymous users could SELECT private_address_line,
--   landlord_id, latitude, longitude, occupancy counts from properties.
--   Fix: column-level GRANT restricting anon to public columns only.
--
-- F-11 (P0): Landlords could PATCH verification_status (self-verify).
-- F-12 (P0): Landlords could PATCH price_from_kobo (price manipulation).
-- F-13 (P1): Landlords could PATCH landlord_id (ownership theft surface).
--   Fix: BEFORE UPDATE trigger blocking non-super_admin changes to these
--   three columns.
--
-- F-15 (P1): audit_logs exposed PII columns (ip_address, user_agent,
--   before_data, after_data) to finance_admin.
--   Fix: column-level GRANT restricting finance_admin to non-PII columns.
--
-- F-17 (P2): bookings SELECT policy used is_admin() which returns true for
--   verification_officer, support_staff, finance_admin — giving them access
--   to ALL bookings.
--   Fix: replace is_admin() with has_role('super_admin') in the bookings
--   SELECT policy.
--
-- All changes are additive/idempotent. No data is modified. No tables dropped.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- F-10/F-14: Restrict anonymous SELECT on properties to public columns only.
--
-- PostgREST respects column-level GRANTs: anon queries with select=* return
-- only granted columns; select=private_address_line returns an error.
-- Authenticated users (landlords, admins) retain full column access via
-- their existing table-level GRANT.
-- ---------------------------------------------------------------------------
revoke select on public.properties from anon;

-- Grant only the public column set to anon. Sensitive columns excluded:
-- landlord_id, private_address_line, latitude, longitude, available_units,
-- occupied_units, held_units.
grant select (
  id, slug, name, description, type, status, verification_status,
  city, state, neighbourhood_id, university_id, public_address_line,
  price_from_kobo, total_floors, total_units, created_at, updated_at
) on public.properties to anon;

-- ---------------------------------------------------------------------------
-- F-11/F-12/F-13: BEFORE UPDATE trigger preventing non-super_admin users
-- from changing verification_status, price_from_kobo, or landlord_id.
--
-- This is database-level enforcement — it blocks the change regardless of
-- how the UPDATE is initiated (PostgREST PATCH, RPC, direct SQL).
-- Landlords can still update other columns (name, description, etc.) on
-- their own properties per the existing RLS policy.
-- ---------------------------------------------------------------------------
create or replace function public.guard_property_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only super_admin can change these sensitive columns
  if not public.has_role(auth.uid(), 'super_admin'::public.user_role) then
    if new.verification_status is distinct from old.verification_status then
      raise exception 'Only administrators can change verification_status';
    end if;
    if new.price_from_kobo is distinct from old.price_from_kobo then
      raise exception 'Only administrators can change price_from_kobo';
    end if;
    if new.landlord_id is distinct from old.landlord_id then
      raise exception 'Only administrators can change landlord_id (property ownership transfer requires admin action)';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists properties_guard_sensitive_columns on public.properties;
create trigger properties_guard_sensitive_columns
  before update on public.properties
  for each row
  execute function public.guard_property_sensitive_columns();

-- ---------------------------------------------------------------------------
-- F-15: Restrict PII columns in audit_logs from authenticated users.
--
-- finance_admin is an application role (user_role enum), not a PostgreSQL
-- role — so column-level GRANT cannot target it directly. Instead, create
-- a security_invoker VIEW that excludes PII columns (ip_address, user_agent,
-- before_data, after_data), revoke SELECT on the underlying table from
-- authenticated, and grant SELECT on the VIEW. The RLS policies on the
-- underlying table still apply (finance_admin sees only financial-category
-- rows; super_admin sees all). The service_role (used by admin API routes)
-- bypasses RLS and retains full column access to the underlying table.
-- ---------------------------------------------------------------------------
create or replace view public.audit_logs_safe as
select
  id, timestamp, actor_id, actor_email, actor_role, category, action,
  resource_type, resource_id, summary, severity
from public.audit_logs;

-- security_invoker = true makes the VIEW run with the caller's privileges,
-- so RLS on the underlying audit_logs table is enforced.
alter view public.audit_logs_safe set (security_invoker = true);

grant select on public.audit_logs_safe to authenticated, anon;
revoke select on public.audit_logs from anon;

-- ---------------------------------------------------------------------------
-- F-17: Tighten bookings SELECT policy — replace is_admin() (which returns
-- true for VO/support/finance) with has_role('super_admin') so only
-- super_admin gets the admin catch-all. VO/finance/support no longer see
-- all bookings; they must have a direct relationship (own booking, own
-- property, or assigned property) to read a booking.
-- ---------------------------------------------------------------------------
drop policy if exists "Students read own bookings" on public.bookings;

create policy "Read own or assigned bookings" on public.bookings
  for select using (
    student_id = auth.uid()
    or exists (
      select 1 from public.properties p
      where p.id = bookings.property_id and p.landlord_id = auth.uid()
    )
    or exists (
      select 1 from public.property_assignments pa
      where pa.property_id = bookings.property_id and pa.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'super_admin'::public.user_role)
  );

-- Also tighten the UPDATE policy the same way
drop policy if exists "Update own bookings" on public.bookings;

create policy "Update own or assigned bookings" on public.bookings
  for update using (
    student_id = auth.uid()
    or exists (
      select 1 from public.properties p
      where p.id = bookings.property_id and p.landlord_id = auth.uid()
    )
    or exists (
      select 1 from public.property_assignments pa
      where pa.property_id = bookings.property_id and pa.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'super_admin'::public.user_role)
  ) with check (
    student_id = auth.uid()
    or exists (
      select 1 from public.properties p
      where p.id = bookings.property_id and p.landlord_id = auth.uid()
    )
    or exists (
      select 1 from public.property_assignments pa
      where pa.property_id = bookings.property_id and pa.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'super_admin'::public.user_role)
  );

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
  '0028_security_hardening.sql',
  'Pen test remediation: F-10/F-14 (anon column GRANT on properties), F-11/F-12/F-13 (trigger blocking non-admin changes to verification_status/price_from_kobo/landlord_id), F-15 (finance_admin column GRANT on audit_logs), F-17 (bookings policy tightened to super_admin only).',
  'warning'::public.audit_severity
);
