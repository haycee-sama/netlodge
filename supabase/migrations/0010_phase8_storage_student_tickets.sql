-- ===========================================================================
-- NetLodge Schema Migration — Part 10: Phase 8 Storage + Student Tickets
-- ===========================================================================
-- Goals:
-- 1. Create Supabase Storage buckets for property images (public read),
--    verification evidence (private), and ticket attachments (private).
-- 2. Add a create_student_ticket RPC for student-side ticket creation
--    with input validation.
-- 3. Add a reply_to_ticket RPC for student-side replies.
-- 4. Add a close_student_ticket RPC.
--
-- Storage RLS policies on storage.objects are applied separately via the
-- Supabase Dashboard or the SQL Editor, because the storage.objects table
-- is owned by supabase_storage_admin and cannot be altered by the postgres
-- role used by the migration runner.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-images',
  'property-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-evidence',
  'verification-evidence',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'application/pdf', 'image/webp']
) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-attachments',
  'ticket-attachments',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'application/pdf', 'image/webp', 'text/plain']
) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. create_student_ticket
-- ---------------------------------------------------------------------------

create or replace function public.create_student_ticket(
  p_subject text,
  p_category text,
  p_message text,
  p_priority public.priority_level default 'medium',
  p_related_booking_id uuid default null,
  p_related_payment_reference text default null,
  p_related_property_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id    uuid := auth.uid();
  v_ticket_id    uuid;
  v_reference    text;
  v_booking      public.bookings%rowtype;
  v_property     public.properties%rowtype;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_subject is null or length(p_subject) < 5 or length(p_subject) > 200 then
    raise exception 'Subject must be 5–200 characters';
  end if;

  if p_category is null or length(p_category) < 2 or length(p_category) > 50 then
    raise exception 'Category is required (2–50 characters)';
  end if;

  if p_message is null or length(p_message) < 10 or length(p_message) > 5000 then
    raise exception 'Message must be 10–5000 characters';
  end if;

  if p_priority not in ('low', 'medium', 'high', 'urgent') then
    raise exception 'Invalid priority';
  end if;

  if p_related_booking_id is not null then
    select * into v_booking from public.bookings where id = p_related_booking_id;
    if not found then
      raise exception 'Related booking not found';
    end if;
    if v_booking.student_id <> v_caller_id then
      raise exception 'You do not own this booking';
    end if;
  end if;

  if p_related_property_id is not null then
    select * into v_property from public.properties where id = p_related_property_id;
    if not found then
      raise exception 'Related property not found';
    end if;
    if v_property.landlord_id <> v_caller_id
       and not exists (
         select 1 from public.bookings b
          where b.property_id = p_related_property_id
            and b.student_id = v_caller_id
       ) then
      raise exception 'You are not authorized to reference this property';
    end if;
  end if;

  v_reference := 'NLG-TKT-' || to_char(now(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 6);

  insert into public.support_tickets (
    reference, user_id, subject, category, priority, status, message,
    related_booking_id, related_payment_reference, related_property_id,
    sla_due_at
  ) values (
    v_reference, v_caller_id, p_subject, p_category, p_priority, 'open', p_message,
    p_related_booking_id, p_related_payment_reference, p_related_property_id,
    now() + interval '24 hours'
  ) returning id into v_ticket_id;

  perform public.record_audit(
    p_actor_id      := v_caller_id,
    p_actor_email   := coalesce((select email from public.profiles where id = v_caller_id), 'unknown@netlodge.test'),
    p_actor_role    := coalesce((select role from public.user_roles where user_id = v_caller_id limit 1), 'student'::public.user_role),
    p_category      := 'support'::public.audit_category,
    p_action        := 'ticket.created_by_student',
    p_resource_type := 'support_ticket',
    p_resource_id   := v_ticket_id::text,
    p_summary       := format('Student created ticket %s: %s', v_reference, p_subject),
    p_severity      := 'info'::public.audit_severity
  );

  -- Notify support staff
  insert into public.notifications (user_id, type, title, body, href)
  select ur.user_id, 'system'::public.notification_type,
         'New support ticket',
         format('Ticket %s: %s', v_reference, p_subject),
         '/admin/support/tickets/' || v_ticket_id::text
    from public.user_roles ur
   where ur.role in ('support_staff', 'super_admin');

  return v_ticket_id;
end;
$$;

do $$ begin
  grant execute on function public.create_student_ticket(text, text, text, public.priority_level, uuid, text, uuid) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 3. reply_to_ticket
-- ---------------------------------------------------------------------------

create or replace function public.reply_to_ticket(
  p_ticket_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id    uuid := auth.uid();
  v_ticket       public.support_tickets%rowtype;
  v_message_id   uuid;
  v_profile      public.profiles%rowtype;
  v_role         public.user_role;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_message is null or length(p_message) < 1 or length(p_message) > 5000 then
    raise exception 'Message must be 1–5000 characters';
  end if;

  select * into v_ticket from public.support_tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found';
  end if;

  if v_ticket.user_id <> v_caller_id then
    raise exception 'You do not own this ticket';
  end if;

  if v_ticket.status in ('resolved', 'closed') then
    raise exception 'This ticket is %s and cannot be replied to', v_ticket.status;
  end if;

  select * into v_profile from public.profiles where id = v_caller_id;
  select role into v_role from public.user_roles where user_id = v_caller_id limit 1;
  if v_role is null then
    v_role := 'student';
  end if;

  insert into public.ticket_messages (ticket_id, author_id, author_role, author_name, message, internal)
  values (p_ticket_id, v_caller_id, v_role,
          coalesce(v_profile.first_name || ' ' || v_profile.last_name, v_profile.email),
          p_message, false)
  returning id into v_message_id;

  if v_ticket.status = 'awaiting_user' then
    update public.support_tickets set status = 'in_progress', updated_at = now() where id = p_ticket_id;
  else
    update public.support_tickets set updated_at = now() where id = p_ticket_id;
  end if;

  if v_ticket.assigned_to is not null then
    insert into public.notifications (user_id, type, title, body, href)
    values (v_ticket.assigned_to, 'message'::public.notification_type,
            'Customer replied to ticket ' || v_ticket.reference,
            left(p_message, 200),
            '/admin/support/tickets/' || p_ticket_id::text);
  end if;

  return v_message_id;
end;
$$;

do $$ begin
  grant execute on function public.reply_to_ticket(uuid, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 4. close_student_ticket
-- ---------------------------------------------------------------------------

create or replace function public.close_student_ticket(
  p_ticket_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id    uuid := auth.uid();
  v_ticket       public.support_tickets%rowtype;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_ticket from public.support_tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found';
  end if;

  if v_ticket.user_id <> v_caller_id then
    raise exception 'You do not own this ticket';
  end if;

  if v_ticket.status = 'closed' then
    return 'already_closed';
  end if;

  update public.support_tickets set status = 'closed', resolved_at = now(), updated_at = now()
  where id = p_ticket_id;

  return 'closed';
end;
$$;

do $$ begin
  grant execute on function public.close_student_ticket(uuid) to authenticated, service_role;
exception when duplicate_object then null;
end $$;
