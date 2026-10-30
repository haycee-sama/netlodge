-- ===========================================================================
-- NetLodge Schema Migration — Part 29: Fix trigger to allow service_role
-- ===========================================================================
-- The guard_property_sensitive_columns trigger (0028) blocks non-super_admin
-- users from changing verification_status, price_from_kobo, landlord_id.
-- However, the service_role (used by admin API routes + webhook handlers)
-- has auth.uid() = NULL, so has_role(NULL, 'super_admin') returns false,
-- blocking service_role updates too. This fixes the trigger to also allow
-- the service_role PostgreSQL role.
-- ===========================================================================

create or replace function public.guard_property_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow super_admin users (via authenticated JWT) AND the service_role
  -- (used by admin API routes that bypass RLS). Block everyone else.
  if not (
    public.has_role(auth.uid(), 'super_admin'::public.user_role)
    or current_user = 'service_role'
  ) then
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
  '0029_fix_trigger_service_role.sql',
  'Fix: guard_property_sensitive_columns trigger now allows service_role (current_user = service_role) in addition to super_admin users, so admin API routes using the service key can still update verification_status/price_from_kobo/landlord_id.',
  'info'::public.audit_severity
);
