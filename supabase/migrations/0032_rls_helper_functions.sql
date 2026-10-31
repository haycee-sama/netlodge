-- ===========================================================================
-- NetLodge Migration — Part 32: SECURITY DEFINER property-access helpers
-- ===========================================================================
-- 27 RLS policies across 10+ tables reference public.properties in
-- subqueries (e.g., "exists(select 1 from properties where...)"). Since
-- anon's SELECT on properties was revoked (F-10 fix), these subqueries
-- fail — breaking rentable_units counts, property_images, floors, etc.
--
-- Fix: create SECURITY DEFINER functions that check property access
-- using the OWNER's privileges (bypassing the anon GRANT restriction).
-- The functions use auth.uid() internally, preserving the original
-- access logic. RLS policies are updated to call these functions instead
-- of direct subqueries on properties.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper functions (SECURITY DEFINER — run as owner, bypass GRANTs)
-- ---------------------------------------------------------------------------
create or replace function public.can_read_property(p_property_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.properties p
    where p.id = p_property_id
    and (
      p.status in ('verified', 'pending_verification')
      or p.landlord_id = auth.uid()
      or public.can_access_property(auth.uid(), p.id)
      or public.is_admin(auth.uid())
    )
  );
$$;

create or replace function public.property_is_verified(p_property_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.properties p
    where p.id = p_property_id and p.status = 'verified'
  );
$$;

create or replace function public.property_owned_by(p_property_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.properties p
    where p.id = p_property_id and p.landlord_id = p_user_id
  );
$$;

-- Grant execute to all roles
do $$ begin
  grant execute on function public.can_read_property(uuid) to anon, authenticated, service_role;
  grant execute on function public.property_is_verified(uuid) to anon, authenticated, service_role;
  grant execute on function public.property_owned_by(uuid, uuid) to anon, authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Update RLS policies to use the helper functions instead of direct
--    subqueries on properties. This fixes the anon access issue while
--    preserving the same access logic.
-- ---------------------------------------------------------------------------

-- property_images: "Read property images"
drop policy if exists "Read property images" on public.property_images;
create policy "Read property images" on public.property_images
  for select using (public.can_read_property(property_id));

-- property_facilities: "Read property facilities"
drop policy if exists "Read property facilities" on public.property_facilities;
create policy "Read property facilities" on public.property_facilities
  for select using (public.can_read_property(property_id));

-- property_rules
drop policy if exists "Read property rules" on public.property_rules;
create policy "Read property rules" on public.property_rules
  for select using (public.can_read_property(property_id));

-- floors: "Public read floors"
drop policy if exists "Public read floors" on public.floors;
create policy "Public read floors" on public.floors
  for select using (public.can_read_property(property_id));

-- rentable_units: "Public read available units"
drop policy if exists "Public read available units" on public.rentable_units;
create policy "Public read available units" on public.rentable_units
  for select using (
    public.can_read_property(property_id)
    and status = 'available'
  );

-- unit_facilities
drop policy if exists "Read unit facilities" on public.unit_facilities;
create policy "Read unit facilities" on public.unit_facilities
  for select using (
    exists(select 1 from public.rentable_units u
      where u.id = unit_facilities.unit_id
      and public.can_read_property(u.property_id))
  );

-- unit_images
drop policy if exists "Read unit images" on public.unit_images;
create policy "Read unit images" on public.unit_images
  for select using (
    exists(select 1 from public.rentable_units u
      where u.id = unit_images.unit_id
      and public.can_read_property(u.property_id))
  );

-- additional_charges (references unit_id, not property_id directly)
drop policy if exists "Read additional charges" on public.additional_charges;
create policy "Read additional charges" on public.additional_charges
  for select using (
    exists(select 1 from public.rentable_units u
      where u.id = additional_charges.unit_id
      and public.can_read_property(u.property_id))
  );

-- Audit log
insert into public.audit_logs (
  actor_email, actor_role, category, action, resource_type, resource_id,
  summary, severity
) values (
  'system@netlodge.test',
  'super_admin'::public.user_role,
  'security'::public.audit_category,
  'migration.applied',
  'migration',
  '0032_rls_helper_functions.sql',
  'Created SECURITY DEFINER helper functions (can_read_property, property_is_verified, property_owned_by) to fix 27 RLS policies that referenced properties in subqueries. Anon could not resolve these subqueries after the F-10 GRANT revocation, breaking rentable_units counts, property_images, floors, etc. The functions run as owner (bypassing GRANTs) while preserving the original access logic via auth.uid().',
  'info'::public.audit_severity
);
