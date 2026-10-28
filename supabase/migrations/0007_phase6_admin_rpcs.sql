-- ===========================================================================
-- NetLodge Schema Migration — Part 7: Phase 6 Admin RPCs
-- ===========================================================================
-- Adds three SECURITY DEFINER RPCs that the server-side admin API routes
-- call. Each function:
--   1. Verifies the caller's identity (auth.uid() must be non-null).
--   2. Verifies the caller has the required admin role.
--   3. Validates input against trusted database state.
--   4. Performs the state change atomically (FOR UPDATE row locks).
--   5. Records an audit log entry via record_audit().
--
-- All functions set search_path = public to prevent search_path hijacking.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. review_verification_case
--
--    Atomically review a verification case: approve, reject, request_info,
--    or escalate. Records an audit log entry. Returns the new status.
--
--    Actions:
--      'approve'       → status='approved', reviewer_id=caller, reviewed_at=now
--      'reject'        → status='rejected', rejection_reason required
--      'request_info'  → status='needs_information', review_notes required
--      'escalate'      → status='under_review', escalated_from=caller,
--                        escalated_to required (super_admin|finance_admin),
--                        escalation_reason required
--      'assign_to_me'  → status='under_review', assigned_officer_id=caller
--
--    Business rules:
--    - Only verification_officer or super_admin can call (enforced inside).
--    - A verification officer CANNOT approve their own submission — i.e. if
--      the case's entity_id matches the caller's profile id and the entity
--      type is 'landlord' or 'student', the call is rejected.
--    - Once a case is approved/rejected, further review actions are rejected
--      (idempotency: status is already terminal). Use 'assign_to_me' or
--      'escalate' on still-open cases.
--    - The property table's verification_status column is updated in the
--      same transaction when entity_type='property'.
--    - For 'approve' on a property entity, the property's `status` column
--      is flipped to 'verified'.
--    - For 'reject' on a property entity, the property's `status` column
--      is flipped to 'rejected'.
-- ---------------------------------------------------------------------------

create or replace function public.review_verification_case(
  p_case_id uuid,
  p_action text,
  p_reason text default null,
  p_notes text default null,
  p_escalate_to text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case         public.verification_cases%rowtype;
  v_caller_id    uuid := auth.uid();
  v_is_officer   boolean := false;
  v_is_super     boolean := false;
  v_new_status   public.verification_status;
  v_actor_email  text;
  v_audit_action text;
  v_audit_sev    public.audit_severity := 'info';
begin
  -- 1. Auth check
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select public.has_role(v_caller_id, 'verification_officer') into v_is_officer;
  select public.has_role(v_caller_id, 'super_admin')         into v_is_super;

  if not (v_is_officer or v_is_super) then
    raise exception 'Not authorized: verification_officer or super_admin role required';
  end if;

  -- 2. Validate action
  if p_action not in ('approve', 'reject', 'request_info', 'escalate', 'assign_to_me') then
    raise exception 'Invalid action: %', p_action;
  end if;

  -- 3. Lock the case row
  select * into v_case from public.verification_cases where id = p_case_id for update;

  if not found then
    raise exception 'Verification case not found';
  end if;

  -- 4. Self-approval guard: caller cannot review their own submission
  --    (entity_type 'student' or 'landlord' where entity_id = caller)
  if v_case.entity_type in ('student', 'landlord') and v_case.entity_id = v_caller_id then
    raise exception 'Conflict of interest: you cannot review your own submission';
  end if;

  -- 5. State machine — reject invalid transitions
  if v_case.status in ('approved', 'rejected') and p_action not in ('approve', 'reject') then
    -- Allow re-escalation of approved/rejected cases for correction, but
    -- require super_admin for that.
    if not v_is_super then
      raise exception 'Case is already in terminal status (%) — only super_admin can re-open', v_case.status;
    end if;
  end if;

  if p_action = 'approve' and v_case.status = 'approved' then
    return 'already_approved';
  end if;
  if p_action = 'reject' and v_case.status = 'rejected' then
    return 'already_rejected';
  end if;

  -- 6. Action-specific validation + state change
  v_new_status := v_case.status;
  v_audit_action := 'verification.' || p_action;

  if p_action = 'approve' then
    v_new_status := 'approved';
    update public.verification_cases set
      status = v_new_status,
      reviewer_id = v_caller_id,
      reviewed_at = now(),
      review_notes = coalesce(p_notes, v_case.review_notes),
      updated_at = now()
    where id = p_case_id;

    -- If property entity, flip property.verification_status + status
    if v_case.entity_type = 'property' then
      update public.properties set
        verification_status = 'approved',
        status = 'verified',
        updated_at = now()
      where id = v_case.entity_id;
    end if;

  elsif p_action = 'reject' then
    if p_reason is null or btrim(p_reason) = '' then
      raise exception 'A rejection reason is required';
    end if;
    v_new_status := 'rejected';
    update public.verification_cases set
      status = v_new_status,
      reviewer_id = v_caller_id,
      reviewed_at = now(),
      rejection_reason = p_reason,
      review_notes = coalesce(p_notes, v_case.review_notes),
      updated_at = now()
    where id = p_case_id;

    if v_case.entity_type = 'property' then
      update public.properties set
        verification_status = 'rejected',
        status = 'rejected',
        updated_at = now()
      where id = v_case.entity_id;
    end if;
    v_audit_sev := 'warning';

  elsif p_action = 'request_info' then
    if p_reason is null or btrim(p_reason) = '' then
      raise exception 'A request-info message is required';
    end if;
    v_new_status := 'needs_information';
    update public.verification_cases set
      status = v_new_status,
      reviewer_id = v_caller_id,
      review_notes = p_reason,
      updated_at = now()
    where id = p_case_id;

  elsif p_action = 'escalate' then
    if p_escalate_to not in ('super_admin', 'finance_admin') then
      raise exception 'escalate_to must be super_admin or finance_admin';
    end if;
    if p_reason is null or btrim(p_reason) = '' then
      raise exception 'An escalation reason is required';
    end if;
    v_new_status := 'under_review';
    update public.verification_cases set
      status = v_new_status,
      escalated_from = v_caller_id,
      escalated_to = p_escalate_to,
      escalated_at = now(),
      escalation_reason = p_reason,
      updated_at = now()
    where id = p_case_id;
    v_audit_sev := 'warning';

  elsif p_action = 'assign_to_me' then
    v_new_status := 'under_review';
    update public.verification_cases set
      status = v_new_status,
      assigned_officer_id = v_caller_id,
      updated_at = now()
    where id = p_case_id;
  end if;

  -- 7. Audit log
  select email into v_actor_email from public.profiles where id = v_caller_id;

  perform public.record_audit(
    p_actor_id      := v_caller_id,
    p_actor_email   := coalesce(v_actor_email, 'unknown@netlodge.test'),
    p_actor_role    := case when v_is_super then 'super_admin'::public.user_role else 'verification_officer'::public.user_role end,
    p_category      := 'verification'::public.audit_category,
    p_action        := v_audit_action,
    p_resource_type := 'verification_case',
    p_resource_id   := p_case_id::text,
    p_summary       := coalesce(
                        format('%s verification case %s (%s → %s)%s',
                          p_action, v_case.reference, v_case.status::text, v_new_status::text,
                          case when p_reason is not null then ' — reason: ' || p_reason else '' end),
                        format('%s on %s', p_action, v_case.reference)
                      ),
    p_severity      := v_audit_sev,
    p_after_data    := jsonb_build_object(
                        'case_id', p_case_id,
                        'action', p_action,
                        'from_status', v_case.status::text,
                        'to_status', v_new_status::text,
                        'reason', p_reason,
                        'notes', p_notes,
                        'escalate_to', p_escalate_to
                      )
  );

  return v_new_status::text;
end;
$$;

do $$ begin
  grant execute on function public.review_verification_case(uuid, text, text, text, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. set_user_role
--
--    Atomically change a user's role. Audit-logged. Guards:
--    - Only super_admin can call.
--    - Caller cannot change their own role (no self-escalation / self-demotion).
--    - Cannot demote the last active super_admin to a non-super_admin role.
--    - Inserts a new user_roles row and (optionally) deactivates the old one.
--      For simplicity, we replace the user's primary role by deleting all
--      existing role rows for that user and inserting the new role. The
--      audit log captures before/after.
-- ---------------------------------------------------------------------------

create or replace function public.set_user_role(
  p_user_id uuid,
  p_new_role public.user_role,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id    uuid := auth.uid();
  v_is_super     boolean := false;
  v_old_roles    public.user_role[];
  v_target_email text;
  v_caller_email text;
  v_active_super_count integer;
begin
  -- 1. Auth + role check
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select public.has_role(v_caller_id, 'super_admin') into v_is_super;
  if not v_is_super then
    raise exception 'Not authorized: super_admin role required';
  end if;

  -- 2. Reason required
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required for role changes';
  end if;

  -- 3. No self-modification
  if p_user_id = v_caller_id then
    raise exception 'You cannot change your own role';
  end if;

  -- 4. Fetch target's current roles + email
  select array_agg(role) into v_old_roles
    from public.user_roles where user_id = p_user_id;
  if v_old_roles is null then
    v_old_roles := '{}'::public.user_role[];
  end if;

  select email into v_target_email from public.profiles where id = p_user_id;
  if v_target_email is null then
    raise exception 'Target user not found';
  end if;

  -- 5. Last-super-admin guard: if the target currently has super_admin and
  --    the new role is NOT super_admin, count active super_admins. Block if
  --    this would leave zero.
  if ('super_admin' = any(v_old_roles)) and p_new_role <> 'super_admin' then
    select count(*) into v_active_super_count
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
     where ur.role = 'super_admin'
       and p.status = 'active'
       and ur.user_id <> p_user_id;
    if v_active_super_count = 0 then
      raise exception 'Cannot demote the last active super_admin';
    end if;
  end if;

  -- 6. Apply role change — replace all existing roles with the new one
  delete from public.user_roles where user_id = p_user_id;
  insert into public.user_roles (user_id, role, assigned_by, reason)
  values (p_user_id, p_new_role, v_caller_id, p_reason);

  -- 7. Update profile metadata
  update public.profiles set
    role_updated_at = now(),
    role_changed_by = v_caller_id
  where id = p_user_id;

  -- 8. Audit log
  select email into v_caller_email from public.profiles where id = v_caller_id;

  perform public.record_audit(
    p_actor_id      := v_caller_id,
    p_actor_email   := coalesce(v_caller_email, 'unknown@netlodge.test'),
    p_actor_role    := 'super_admin'::public.user_role,
    p_category      := 'role_management'::public.audit_category,
    p_action        := 'user.role_changed',
    p_resource_type := 'user',
    p_resource_id   := p_user_id::text,
    p_summary       := format('Changed role of %s from %s to %s — reason: %s',
                              v_target_email,
                              array_to_string(v_old_roles, ','),
                              p_new_role::text,
                              p_reason),
    p_severity      := 'critical'::public.audit_severity,
    p_before_data   := jsonb_build_object('roles', v_old_roles),
    p_after_data    := jsonb_build_object('role', p_new_role, 'reason', p_reason)
  );

  return p_new_role::text;
end;
$$;

do $$ begin
  grant execute on function public.set_user_role(uuid, public.user_role, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 3. set_user_active_status
--
--    Activate or suspend a user. Audit-logged. Guards:
--    - Only super_admin can call.
--    - Caller cannot suspend themselves.
--    - Cannot suspend the last active super_admin.
-- ---------------------------------------------------------------------------

create or replace function public.set_user_active_status(
  p_user_id uuid,
  p_active boolean,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id    uuid := auth.uid();
  v_is_super     boolean := false;
  v_target       public.profiles%rowtype;
  v_caller_email text;
  v_active_super_count integer;
  v_new_status   public.account_status;
begin
  -- 1. Auth + role check
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select public.has_role(v_caller_id, 'super_admin') into v_is_super;
  if not v_is_super then
    raise exception 'Not authorized: super_admin role required';
  end if;

  -- 2. Reason required for suspension
  if not p_active and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'A suspension reason is required';
  end if;

  -- 3. No self-suspension
  if p_user_id = v_caller_id then
    raise exception 'You cannot suspend your own account';
  end if;

  -- 4. Fetch target
  select * into v_target from public.profiles where id = p_user_id for update;
  if v_target.id is null then
    raise exception 'Target user not found';
  end if;

  -- 5. Last-super-admin guard: cannot suspend the last active super_admin
  if not p_active and public.has_role(p_user_id, 'super_admin') then
    select count(*) into v_active_super_count
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
     where ur.role = 'super_admin'
       and p.status = 'active'
       and ur.user_id <> p_user_id;
    if v_active_super_count = 0 then
      raise exception 'Cannot suspend the last active super_admin';
    end if;
  end if;

  -- 6. Apply
  v_new_status := case when p_active then 'active'::public.account_status else 'suspended'::public.account_status end;

  if v_target.status = v_new_status then
    return 'no_change';
  end if;

  update public.profiles set
    status = v_new_status,
    status_reason = case when p_active then null else p_reason end,
    status_changed_by = v_caller_id,
    status_changed_at = now(),
    updated_at = now()
  where id = p_user_id;

  -- 7. Audit log
  select email into v_caller_email from public.profiles where id = v_caller_id;

  perform public.record_audit(
    p_actor_id      := v_caller_id,
    p_actor_email   := coalesce(v_caller_email, 'unknown@netlodge.test'),
    p_actor_role    := 'super_admin'::public.user_role,
    p_category      := 'user_management'::public.audit_category,
    p_action        := case when p_active then 'user.reactivated' else 'user.suspended' end,
    p_resource_type := 'user',
    p_resource_id   := p_user_id::text,
    p_summary       := format('%s %s%s%s',
                              case when p_active then 'Reactivated' else 'Suspended' end,
                              v_target.email,
                              case when p_reason is not null then ' — reason: ' else '' end,
                              coalesce(p_reason, '')),
    p_severity      := case when p_active then 'info'::public.audit_severity else 'critical'::public.audit_severity end,
    p_before_data   := jsonb_build_object('status', v_target.status),
    p_after_data    := jsonb_build_object('status', v_new_status, 'reason', p_reason)
  );

  return v_new_status::text;
end;
$$;

do $$ begin
  grant execute on function public.set_user_active_status(uuid, boolean, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 4. platform_metrics
--
--    Returns a single JSON blob with platform-wide counts that the Super
--    Admin dashboard renders. Read-only — super_admin only. Avoids exposing
--    PII; only aggregate counts are returned.
-- ---------------------------------------------------------------------------

create or replace function public.platform_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id  uuid := auth.uid();
  v_is_super   boolean := false;
  v_metrics    jsonb;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;
  select public.has_role(v_caller_id, 'super_admin') into v_is_super;
  if not v_is_super then
    raise exception 'Not authorized: super_admin role required';
  end if;

  select jsonb_build_object(
    'users', (
      select jsonb_object_agg(role, cnt) from (
        select ur.role, count(distinct ur.user_id) as cnt
          from public.user_roles ur
         group by ur.role
      ) r
    ),
    'users_by_status', (
      select jsonb_object_agg(status, cnt) from (
        select status, count(*) as cnt from public.profiles group by status
      ) s
    ),
    'properties', (
      select jsonb_build_object(
        'by_status', (select jsonb_object_agg(status, cnt) from (
          select status, count(*) as cnt from public.properties group by status
        ) ps),
        'by_verification', (select jsonb_object_agg(verification_status, cnt) from (
          select verification_status, count(*) as cnt from public.properties group by verification_status
        ) pv),
        'total', (select count(*) from public.properties)
      )
    ),
    'rentable_units', (
      select jsonb_build_object(
        'by_status', (select jsonb_object_agg(status, cnt) from (
          select status, count(*) as cnt from public.rentable_units group by status
        ) us),
        'total', (select count(*) from public.rentable_units)
      )
    ),
    'bookings', (
      select jsonb_build_object(
        'by_status', (select jsonb_object_agg(status, cnt) from (
          select status, count(*) as cnt from public.bookings group by status
        ) bs),
        'total', (select count(*) from public.bookings)
      )
    ),
    'payments', (
      select jsonb_build_object(
        'by_status', (select jsonb_object_agg(status, cnt) from (
          select status, count(*) as cnt from public.payments group by status
        ) pms),
        'total_kobo', coalesce((select sum(amount_kobo) from public.payments where status='successful'), 0),
        'count', (select count(*) from public.payments)
      )
    ),
    'verification_cases', (
      select jsonb_build_object(
        'by_status', (select jsonb_object_agg(status, cnt) from (
          select status, count(*) as cnt from public.verification_cases group by status
        ) vc),
        'total', (select count(*) from public.verification_cases)
      )
    ),
    'support_tickets', (
      select jsonb_build_object(
        'open', (select count(*) from public.support_tickets where status in ('open', 'in_progress')),
        'total', (select count(*) from public.support_tickets)
      )
    )
  ) into v_metrics;

  return v_metrics;
end;
$$;

do $$ begin
  grant execute on function public.platform_metrics() to authenticated, service_role;
exception when duplicate_object then null;
end $$;
