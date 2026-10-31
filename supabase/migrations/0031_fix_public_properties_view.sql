-- ===========================================================================
-- NetLodge Migration — Part 31: Fix public_properties VIEW (security model)
-- ===========================================================================
-- The 0030 VIEW used security_invoker=true, which made it run with the
-- caller's (anon's) privileges — but anon has no SELECT on the underlying
-- properties table, so the VIEW failed. Fix: remove security_invoker (VIEW
-- runs as owner = postgres, bypassing RLS) and add WHERE status='verified'
-- so only verified properties are exposed publicly.
-- ===========================================================================

drop view if exists public.public_properties;

create view public.public_properties as
select
  id, slug, name, description, type, status, verification_status,
  city, state, neighbourhood_id, university_id, public_address_line,
  price_from_kobo, total_floors, total_units, created_at, updated_at
from public.properties
where status = 'verified';

-- No security_invoker — the VIEW runs as its owner (postgres), bypassing
-- RLS. The WHERE status='verified' clause is the public filter. Landlords
-- and admins query the underlying properties table directly (with RLS).
grant select on public.public_properties to anon, authenticated;

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
  '0031_fix_public_properties_view.sql',
  'Fixed public_properties VIEW: removed security_invoker (was causing permission denied), added WHERE status=verified filter. Anon can now select=* on the VIEW and get public columns only.',
  'info'::public.audit_severity
);
