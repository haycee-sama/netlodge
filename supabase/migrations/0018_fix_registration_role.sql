-- ===========================================================================
-- NetLodge Schema Migration — Part 18: Fix role assignment on registration
-- ===========================================================================
-- Problem: handle_new_user() always assigns 'student' role to every new user,
-- regardless of what role they selected during registration. Landlords,
-- managers, and agents all end up as students with no access to their
-- dashboards.
--
-- Root cause: signUpWithEmail() didn't pass the role to Supabase Auth, and
-- handle_new_user() didn't read it from user_metadata.
--
-- Fix:
--   1. handle_new_user() now reads the role from new.raw_user_meta_data->>'role'
--   2. Only marketplace roles (student, landlord, manager, agent) are accepted.
--      Admin roles (verification_officer, support_staff, finance_admin,
--      super_admin) are NEVER auto-assigned — they require manual admin action.
--   3. If the role is missing or invalid, defaults to 'student' (safe default).
-- ===========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  -- Create a profile for the new user
  insert into public.profiles (id, email, first_name, last_name, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'active'
  )
  on conflict (id) do nothing;

  -- Read the role from user_metadata (set by the registration form).
  -- Only marketplace roles are allowed — admin roles require manual assignment.
  v_role := new.raw_user_meta_data->>'role';

  -- Validate: only allow marketplace roles. Default to 'student' for anything else.
  if v_role not in ('student', 'landlord', 'manager', 'agent') then
    v_role := 'student';
  end if;

  -- Assign the selected role
  insert into public.user_roles (user_id, role, reason)
  values (new.id, v_role::public.user_role, 'Assigned during registration')
  on conflict (user_id, role) do nothing;

  -- Also assign 'student' role as a secondary role for non-students
  -- (e.g., a landlord can also browse as a student). This ensures the
  -- user always has at least the student role for marketplace access.
  if v_role != 'student' then
    insert into public.user_roles (user_id, role, reason)
    values (new.id, 'student'::public.user_role, 'Secondary marketplace access')
    on conflict (user_id, role) do nothing;
  end if;

  -- Create notification preferences
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Revoke anon execute (security hardening from migration 0017)
revoke execute on function public.handle_new_user() from anon;
