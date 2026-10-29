-- ===========================================================================
-- NetLodge Schema Migration — Part 24: Property Reviews & Ratings
-- ===========================================================================
-- After a booking is completed, students can rate the property and landlord.
-- Reviews build trust on the marketplace and help future students decide.
--
-- Schema:
--   reviews — one review per (booking, student). A student can only review
--   a property they actually booked and whose booking status is 'completed'
--   or 'active'.
-- ===========================================================================

create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  -- Ratings (1-5 stars)
  overall_rating integer not null check (overall_rating between 1 and 5),
  cleanliness_rating integer check (cleanliness_rating between 1 and 5),
  location_rating integer check (location_rating between 1 and 5),
  value_rating integer check (value_rating between 1 and 5),
  -- Text
  title text not null check (length(title) between 3 and 200),
  body text check (body is null or length(body) <= 2000),
  -- Landlord response
  landlord_response text,
  landlord_response_at timestamptz,
  -- Metadata
  status text not null default 'published' check (status in ('published', 'hidden', 'flagged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id) -- one review per booking
);

create index if not exists idx_reviews_property on public.reviews(property_id);
create index if not exists idx_reviews_student on public.reviews(student_id);
create index if not exists idx_reviews_landlord on public.reviews(landlord_id);
create index if not exists idx_reviews_status on public.reviews(status);

-- RLS
alter table public.reviews enable row level security;

-- Public can read published reviews
create policy "Public read published reviews" on public.reviews
  for select using (
    status = 'published' or student_id = auth.uid() or landlord_id = auth.uid() or public.is_admin(auth.uid())
  );

-- Students can create reviews for their own bookings
create policy "Students create own reviews" on public.reviews
  for insert with check (
    student_id = auth.uid()
  );

-- Students can update their own review (but not landlord_response)
create policy "Students update own reviews" on public.reviews
  for update using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Landlords can update only the landlord_response field on reviews for their properties
create policy "Landlords respond to reviews" on public.reviews
  for update using (landlord_id = auth.uid())
  with check (landlord_id = auth.uid());

-- Admins manage all reviews
create policy "Admins manage reviews" on public.reviews
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
  '0024_property_reviews.sql',
  'Property reviews: reviews table with overall + cleanliness + location + value ratings, landlord responses, RLS. One review per booking.',
  'info'::public.audit_severity
);
