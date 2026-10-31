-- ===========================================================================
-- NetLodge Migration — Part 33: Fix ALL remaining RLS policies
-- ===========================================================================
-- 29 policies across 8 tables still reference properties in subqueries.
-- The "Manage" (polcmd=*) policies apply to SELECT too, causing "permission
-- denied for table properties" for anon. This migration drops ALL policies
-- on affected tables and recreates them using SECURITY DEFINER helper
-- functions (can_read_property, property_owned_by) that bypass the anon
-- GRANT restriction.
-- ===========================================================================

-- Helper: split * policies into specific commands
-- SELECT → can_read_property (public access to verified properties)
-- INSERT/UPDATE/DELETE → property_owned_by (landlord manages own properties)

-- ---------------------------------------------------------------------------
-- property_images
-- ---------------------------------------------------------------------------
drop policy if exists "Manage property images" on public.property_images;
drop policy if exists "Read property images" on public.property_images;

create policy "Read property images" on public.property_images
  for select using (public.can_read_property(property_id));
create policy "Landlord manages property images" on public.property_images
  for all using (public.property_owned_by(property_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.property_owned_by(property_id, auth.uid()) or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- property_facilities
-- ---------------------------------------------------------------------------
drop policy if exists "Manage property facilities" on public.property_facilities;
drop policy if exists "Read property facilities" on public.property_facilities;

create policy "Read property facilities" on public.property_facilities
  for select using (public.can_read_property(property_id));
create policy "Landlord manages property facilities" on public.property_facilities
  for all using (public.property_owned_by(property_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.property_owned_by(property_id, auth.uid()) or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- property_rules
-- ---------------------------------------------------------------------------
drop policy if exists "Manage property rules" on public.property_rules;
drop policy if exists "Read property rules" on public.property_rules;

create policy "Read property rules" on public.property_rules
  for select using (public.can_read_property(property_id));
create policy "Landlord manages property rules" on public.property_rules
  for all using (public.property_owned_by(property_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.property_owned_by(property_id, auth.uid()) or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- floors
-- ---------------------------------------------------------------------------
drop policy if exists "Manage floors" on public.floors;
drop policy if exists "Public read floors" on public.floors;
drop policy if exists "Read floors" on public.floors;

create policy "Read floors" on public.floors
  for select using (public.can_read_property(property_id));
create policy "Landlord manages floors" on public.floors
  for all using (public.property_owned_by(property_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.property_owned_by(property_id, auth.uid()) or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- rentable_units
-- ---------------------------------------------------------------------------
drop policy if exists "Manage rentable units" on public.rentable_units;
drop policy if exists "Public read available units" on public.rentable_units;
drop policy if exists "Read rentable units" on public.rentable_units;

create policy "Read rentable units" on public.rentable_units
  for select using (public.can_read_property(property_id));
create policy "Landlord manages rentable units" on public.rentable_units
  for all using (public.property_owned_by(property_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.property_owned_by(property_id, auth.uid()) or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- unit_facilities (references unit_id → rentable_units.property_id)
-- ---------------------------------------------------------------------------
drop policy if exists "Manage unit facilities" on public.unit_facilities;
drop policy if exists "Read unit facilities" on public.unit_facilities;

create policy "Read unit facilities" on public.unit_facilities
  for select using (
    exists(select 1 from public.rentable_units u where u.id = unit_facilities.unit_id and public.can_read_property(u.property_id))
  );
create policy "Landlord manages unit facilities" on public.unit_facilities
  for all using (
    exists(select 1 from public.rentable_units u where u.id = unit_facilities.unit_id and public.property_owned_by(u.property_id, auth.uid()))
    or public.is_admin(auth.uid())
  ) with check (
    exists(select 1 from public.rentable_units u where u.id = unit_facilities.unit_id and public.property_owned_by(u.property_id, auth.uid()))
    or public.is_admin(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- unit_images (references unit_id → rentable_units.property_id)
-- ---------------------------------------------------------------------------
drop policy if exists "Manage unit images" on public.unit_images;
drop policy if exists "Read unit images" on public.unit_images;

create policy "Read unit images" on public.unit_images
  for select using (
    exists(select 1 from public.rentable_units u where u.id = unit_images.unit_id and public.can_read_property(u.property_id))
  );
create policy "Landlord manages unit images" on public.unit_images
  for all using (
    exists(select 1 from public.rentable_units u where u.id = unit_images.unit_id and public.property_owned_by(u.property_id, auth.uid()))
    or public.is_admin(auth.uid())
  ) with check (
    exists(select 1 from public.rentable_units u where u.id = unit_images.unit_id and public.property_owned_by(u.property_id, auth.uid()))
    or public.is_admin(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- additional_charges (references unit_id → rentable_units.property_id)
-- ---------------------------------------------------------------------------
drop policy if exists "Manage additional charges" on public.additional_charges;
drop policy if exists "Read additional charges" on public.additional_charges;

create policy "Read additional charges" on public.additional_charges
  for select using (
    exists(select 1 from public.rentable_units u where u.id = additional_charges.unit_id and public.can_read_property(u.property_id))
  );
create policy "Landlord manages additional charges" on public.additional_charges
  for all using (
    exists(select 1 from public.rentable_units u where u.id = additional_charges.unit_id and public.property_owned_by(u.property_id, auth.uid()))
    or public.is_admin(auth.uid())
  ) with check (
    exists(select 1 from public.rentable_units u where u.id = additional_charges.unit_id and public.property_owned_by(u.property_id, auth.uid()))
    or public.is_admin(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- property_assignments
-- ---------------------------------------------------------------------------
drop policy if exists "Landlord manages assignments" on public.property_assignments;

create policy "Read property assignments" on public.property_assignments
  for select using (
    public.property_owned_by(property_id, auth.uid())
    or user_id = auth.uid()
    or public.is_admin(auth.uid())
  );
create policy "Landlord manages assignments" on public.property_assignments
  for all using (
    public.property_owned_by(property_id, auth.uid())
    or user_id = auth.uid()
    or public.is_admin(auth.uid())
  ) with check (
    public.property_owned_by(property_id, auth.uid())
    or public.is_admin(auth.uid())
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
  '0033_fix_all_rls_policies.sql',
  'Dropped and recreated ALL policies on 9 tables (property_images, property_facilities, property_rules, floors, rentable_units, unit_facilities, unit_images, additional_charges, property_assignments) to use SECURITY DEFINER helper functions instead of direct subqueries on properties. Fixes the anon permission-denied errors that broke rentable_units counts, property_images, floors, etc.',
  'info'::public.audit_severity
);
