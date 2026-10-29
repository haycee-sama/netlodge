-- ===========================================================================
-- NetLodge Schema Migration — Part 23: In-App Messaging (Conversations)
-- ===========================================================================
-- Enables student-landlord chat within the platform. Keeps communication
-- on-platform for safety, creates an audit trail, and allows students to
-- ask questions about specific rooms without sharing contact info.
--
-- Schema:
--   conversations — one per (student, landlord, optional property) pair
--   messages — individual messages within a conversation
--
-- Real-time: the UI subscribes to messages via Supabase Realtime
-- (supabase.channel('messages').on('INSERT', ...)).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. conversations
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  rentable_unit_id uuid references public.rentable_units(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'archived', 'blocked')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, landlord_id, property_id)
);

create index if not exists idx_conversations_student on public.conversations(student_id);
create index if not exists idx_conversations_landlord on public.conversations(landlord_id);
create index if not exists idx_conversations_last_msg on public.conversations(last_message_at desc);

-- ---------------------------------------------------------------------------
-- 2. messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at desc);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_unread on public.messages(conversation_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Conversations: participants see their own; admins see all
create policy "Participants see own conversations" on public.conversations
  for select using (
    student_id = auth.uid() or landlord_id = auth.uid() or public.is_admin(auth.uid())
  );

create policy "Students create conversations" on public.conversations
  for insert with check (
    student_id = auth.uid() or public.is_admin(auth.uid())
  );

create policy "Participants update conversations" on public.conversations
  for update using (
    student_id = auth.uid() or landlord_id = auth.uid() or public.is_admin(auth.uid())
  );

-- Messages: participants see messages in their conversations
create policy "Participants see messages" on public.messages
  for select using (
    exists(
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.student_id = auth.uid() or c.landlord_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

-- Messages: participants can send messages
create policy "Participants send messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists(
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.student_id = auth.uid() or c.landlord_id = auth.uid())
      and c.status = 'active'
    )
  );

-- Messages: participants can mark messages as read
create policy "Participants update messages" on public.messages
  for update using (
    exists(
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.student_id = auth.uid() or c.landlord_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

-- Enable Realtime for messages table
alter table public.messages replica identity full;

-- ---------------------------------------------------------------------------
-- 4. Audit log
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
  '0023_in_app_messaging.sql',
  'In-app messaging: conversations + messages tables with RLS. Participants can see/send messages in their own conversations. Realtime enabled on messages.',
  'info'::public.audit_severity
);
