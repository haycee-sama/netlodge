-- ===========================================================================
-- NetLodge Migration — Part 30: public_properties VIEW (fix F-10 regression)
-- ===========================================================================
-- The column-level GRANT in migration 0028 blocked anon select=* on
-- properties (PostgREST requires table-level SELECT). This VIEW exposes
-- only public columns + FK columns for resource embedding, restoring
-- public browsing while keeping private_address_line, landlord_id,
-- latitude, longitude, occupancy counts restricted.
-- ===========================================================================

-- Drop the old column-level GRANT approach (it broke select=*)
revoke select on public.properties from anon;

-- Create the public_properties VIEW with only public columns
-- Includes FK columns (id, university_id, neighbourhood_id) for PostgREST
-- resource embedding (property_images, universities, neighbourhoods)
create or replace view public.public_properties as
select
  id, slug, name, description, type, status, verification_status,
  city, state, neighbourhood_id, university_id, public_address_line,
  price_from_kobo, total_floors, total_units, created_at, updated_at
from public.properties;

-- security_invoker = true: RLS on the underlying properties table applies
alter view public.public_properties set (security_invoker = true);

-- Grant SELECT on the VIEW to anon and authenticated
grant select on public.public_properties to anon, authenticated;

-- Revoke SELECT on the underlying properties table from anon
-- (anon must use the VIEW, not the table directly)
revoke select on public.properties from anon;

-- Authenticated users (landlords, students, admins) retain table-level
-- SELECT on properties via the default Supabase GRANT to authenticated.
-- The RLS policies on properties still filter rows per role.

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
  '0030_public_properties_view.sql',
  'Created public_properties VIEW exposing only public columns + FK columns for resource embedding. Fixes the select=* regression from 0028 while maintaining F-10/F-14 (anon cannot read private_address_line, landlord_id, latitude, longitude, occupancy counts).',
  'info'::public.audit_severity
);
