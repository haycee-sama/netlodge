-- ===========================================================================
-- NetLodge Schema Migration — Part 14: Testimonials
-- ===========================================================================
-- Admin-managed testimonials shown on the public homepage.
--
-- Testimonials are submitted by users (students, landlords) via a public form
-- or created directly by admins. Admins review and approve them before they
-- appear on the site. Only approved testimonials with `published=true` are
-- shown to the public.
--
-- RLS:
--   - Public (anon) can read approved + published testimonials only.
--   - Authenticated users can read their own submissions (any status).
--   - Super admins can read, create, update, delete all testimonials.
--
-- This replaces the fabricated testimonial that was removed from the homepage
-- in Phase 34. No invented quotes — every testimonial is a real submission
-- reviewed by an admin.
-- ===========================================================================

do $$ begin
  create type testimonial_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.testimonials (
  id uuid primary key default uuid_generate_v4(),
  -- The person the testimonial is about / from
  author_name text not null,
  author_role text not null check (author_role in ('student', 'landlord', 'parent', 'staff')),
  author_university text,
  author_level text,
  -- The testimonial content
  quote text not null,
  -- Rating 1-5 (optional — only show if the admin is confident it's genuine)
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  -- Workflow
  status testimonial_status not null default 'pending',
  published boolean not null default false,
  -- Who submitted it (null if created directly by admin)
  submitted_by uuid references public.profiles(id) on delete set null,
  -- Who reviewed it
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  -- Admin can set a display order (lower = first)
  display_order integer not null default 0,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_testimonials_status on public.testimonials(status);
create index if not exists idx_testimonials_published on public.testimonials(published);
create index if not exists idx_testimonials_display_order on public.testimonials(display_order);
create index if not exists idx_testimonials_submitted_by on public.testimonials(submitted_by);

-- Enable RLS
alter table public.testimonials enable row level security;

-- Public can read only approved + published testimonials
create policy "Public read approved testimonials"
  on public.testimonials for select
  using (status = 'approved' and published = true);

-- Authenticated users can read their own submissions (any status)
create policy "Users read own testimonials"
  on public.testimonials for select
  using (submitted_by = auth.uid());

-- Super admins can read all testimonials
create policy "Super admin read all testimonials"
  on public.testimonials for select
  using (public.has_role(auth.uid(), 'super_admin'));

-- Authenticated users can create testimonials (submit for review)
create policy "Users submit testimonials"
  on public.testimonials for insert
  with check (
    submitted_by = auth.uid()
    or public.has_role(auth.uid(), 'super_admin')
  );

-- Super admins can update any testimonial (approve, reject, edit, publish)
create policy "Super admin update testimonials"
  on public.testimonials for update
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- Users can update their own testimonials only while pending (e.g., to edit the quote)
create policy "Users update own pending testimonials"
  on public.testimonials for update
  using (submitted_by = auth.uid() and status = 'pending')
  with check (submitted_by = auth.uid() and status = 'pending');

-- Super admins can delete testimonials
create policy "Super admin delete testimonials"
  on public.testimonials for delete
  using (public.has_role(auth.uid(), 'super_admin'));

-- Users can delete their own pending testimonials (withdraw submission)
create policy "Users delete own pending testimonials"
  on public.testimonials for delete
  using (submitted_by = auth.uid() and status = 'pending');

-- ---------------------------------------------------------------------------
-- Trigger: update updated_at on every change
-- ---------------------------------------------------------------------------
create or replace function public.handle_testimonials_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_testimonials_updated_at on public.testimonials;
create trigger trg_testimonials_updated_at
  before update on public.testimonials
  for each row execute function public.handle_testimonials_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: review_testimonial
-- Allows a super admin to approve or reject a testimonial.
-- Sets published=true automatically when approved.
-- ---------------------------------------------------------------------------
create or replace function public.review_testimonial(
  p_testimonial_id uuid,
  p_action text,
  p_review_notes text default null,
  p_actor_email text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_testimonial  public.testimonials%rowtype;
  v_caller_id    uuid := auth.uid();
  v_is_super     boolean := false;
  v_actor_email  text;
begin
  -- 1. Auth + role check
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select public.has_role(v_caller_id, 'super_admin') into v_is_super;
  if not v_is_super then
    raise exception 'Not authorized: super_admin role required';
  end if;

  -- 2. Validate action
  if p_action not in ('approve', 'reject') then
    raise exception 'Invalid action: must be approve or reject';
  end if;

  -- 3. Lock the testimonial row
  select * into v_testimonial from public.testimonials where id = p_testimonial_id for update;
  if not found then
    raise exception 'Testimonial not found';
  end if;

  -- 4. Apply the action
  if p_action = 'approve' then
    update public.testimonials set
      status = 'approved',
      published = true,
      reviewed_by = v_caller_id,
      reviewed_at = now(),
      review_notes = p_review_notes
    where id = p_testimonial_id;
  else
    update public.testimonials set
      status = 'rejected',
      published = false,
      reviewed_by = v_caller_id,
      reviewed_at = now(),
      review_notes = p_review_notes
    where id = p_testimonial_id;
  end if;

  -- 5. Audit log
  select email into v_actor_email from public.profiles where id = v_caller_id;

  perform public.record_audit(
    p_actor_id      := v_caller_id,
    p_actor_email   := coalesce(p_actor_email, v_actor_email, 'unknown@netlodge.test'),
    p_actor_role    := 'super_admin'::public.user_role,
    p_category      := 'configuration'::public.audit_category,
    p_action        := 'testimonial.' || p_action,
    p_resource_type := 'testimonial',
    p_resource_id   := p_testimonial_id::text,
    p_summary       := format('Testimonial by %s %s — quote: "%s"',
                              v_testimonial.author_name, p_action,
                              left(v_testimonial.quote, 80)),
    p_severity      := 'info'::public.audit_severity
  );

  return p_action;
end;
$$;

do $$ begin
  grant execute on function public.review_testimonial(uuid, text, text, text) to authenticated, service_role;
exception when duplicate_object then null;
end $$;
