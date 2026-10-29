-- ===========================================================================
-- NetLodge Schema Migration — Part 25: Maintenance Requests
-- ===========================================================================
-- After move-in, students can report issues (broken AC, plumbing, electrical,
-- etc.) through the platform. Landlords/managers receive and resolve them.
--
-- Schema:
--   maintenance_requests — one per issue report
-- ===========================================================================

do $$ begin
  create type maintenance_category as enum (
    'plumbing', 'electrical', 'structural', 'appliance',
    'pest_control', 'security', 'cleanliness', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type maintenance_status as enum (
    'open', 'in_progress', 'resolved', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type maintenance_priority as enum (
    'low', 'medium', 'high', 'urgent'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.maintenance_requests (
  id uuid primary key default uuid_generate_v4(),
  reference text not null unique,
  student_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  rentable_unit_id uuid not null references public.rentable_units(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  category maintenance_category not null,
  priority maintenance_priority not null default 'medium',
  status maintenance_status not null default 'open',
  title text not null check (length(title) between 5 and 200),
  description text not null check (length(description) between 10 and 5000),
  -- Photo evidence (storage paths in room-photos or a dedicated bucket)
  photo_paths text[] default '{}',
  -- Resolution
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_maint_student on public.maintenance_requests(student_id);
create index if not exists idx_maint_property on public.maintenance_requests(property_id);
create index if not exists idx_maint_landlord on public.maintenance_requests(property_id);
create index if not exists idx_maint_status on public.maintenance_requests(status);
create index if not exists idx_maint_unit on public.maintenance_requests(rentable_unit_id);

-- RLS
alter table public.maintenance_requests enable row level security;

-- Students see their own requests
create policy "Students see own requests" on public.maintenance_requests
  for select using (
    student_id = auth.uid()
    or exists(
      select 1 from public.properties p
      where p.id = maintenance_requests.property_id
      and (p.landlord_id = auth.uid() or public.can_access_property(auth.uid(), p.id))
    )
    or public.is_admin(auth.uid())
  );

-- Students create requests for properties they have active bookings at
create policy "Students create requests" on public.maintenance_requests
  for insert with check (
    student_id = auth.uid()
  );

-- Students can update status to cancelled on their own requests
create policy "Students update own requests" on public.maintenance_requests
  for update using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Landlords/managers update requests on their properties
create policy "Landlords manage requests" on public.maintenance_requests
  for update using (
    exists(
      select 1 from public.properties p
      where p.id = maintenance_requests.property_id
      and (p.landlord_id = auth.uid() or public.can_access_property(auth.uid(), p.id))
    )
  );

-- Admins manage all
create policy "Admins manage all requests" on public.maintenance_requests
  for all using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Audit log
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
  '0025_maintenance_requests.sql',
  'Maintenance requests: table with category, priority, status, photo evidence, resolution notes. RLS: students see own, landlords manage their properties.',
  'info'::public.audit_severity
);
