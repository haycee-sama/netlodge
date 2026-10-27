-- ===========================================================================
-- NetLodge Schema Migration — Part 7b: Fix review_verification_case typo
-- ===========================================================================
-- The original 0007 migration had a typo: `p_case.review_notes` instead of
-- `v_case.review_notes` in two UPDATE statements. This caused approve and
-- reject actions to fail with "missing FROM-clause entry for table p_case".
--
-- This migration re-creates the function with the fix. The migration runner
-- treats 0007 as already-applied, so we ship the fix as 0008.
-- ===========================================================================

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

  -- 4. Self-approval guard
  if v_case.entity_type in ('student', 'landlord') and v_case.entity_id = v_caller_id then
    raise exception 'Conflict of interest: you cannot review your own submission';
  end if;

  -- 5. State machine
  if v_case.status in ('approved', 'rejected') and p_action not in ('approve', 'reject') then
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
