-- ===========================================================================
-- NetLodge Schema Migration — Part 21: Agent Referral Tracking System
-- ===========================================================================
-- Builds a real referral tracking system so agents can:
--   1. Share a referral link with their unique code
--   2. Track clicks, signups, and completed bookings
--   3. Earn commissions on converted referrals
--
-- Schema:
--   referrals — one row per referral relationship (agent → referred user)
--   referral_clicks — tracks each time a referral link is clicked
--
-- The agent's referral_code is stored on profiles.referral_code (existing
-- column from migration 0001). This migration adds the tracking tables.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. referrals — tracks the relationship between an agent and a referred user
-- ---------------------------------------------------------------------------
create table if not exists public.referrals (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  referral_code text not null,
  status text not null default 'signed_up' check (status in ('signed_up', 'booked', 'completed', 'cancelled')),
  -- Commission tracking (in kobo)
  commission_kobo bigint not null default 0,
  commission_paid boolean not null default false,
  -- Metadata
  signed_up_at timestamptz not null default now(),
  first_booking_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, referred_user_id)
);

-- ---------------------------------------------------------------------------
-- 2. referral_clicks — tracks each click on a referral link
-- ---------------------------------------------------------------------------
create table if not exists public.referral_clicks (
  id uuid primary key default uuid_generate_v4(),
  referral_code text not null,
  agent_id uuid references public.profiles(id) on delete set null,
  ip_address text,
  user_agent text,
  clicked_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_referrals_agent_id on public.referrals(agent_id);
create index if not exists idx_referrals_referred_user_id on public.referrals(referred_user_id);
create index if not exists idx_referrals_status on public.referrals(status);
create index if not exists idx_referral_clicks_code on public.referral_clicks(referral_code);

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
alter table public.referrals enable row level security;
alter table public.referral_clicks enable row level security;

-- Referrals: agents see their own; admins see all
create policy "Agents see own referrals" on public.referrals
  for select using (
    agent_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create policy "Agents insert own referrals" on public.referrals
  for insert with check (true); -- inserted by the registration flow / RPC

create policy "Admins manage referrals" on public.referrals
  for all using (public.is_admin(auth.uid()));

-- Referral clicks: anyone can insert (anonymous clicks), agents see their own
create policy "Anyone logs referral clicks" on public.referral_clicks
  for insert with check (true);

create policy "Agents see own clicks" on public.referral_clicks
  for select using (
    agent_id = auth.uid()
    or public.is_admin(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 5. Audit log
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
  '0021_referral_tracking.sql',
  'Agent referral tracking system: referrals + referral_clicks tables with RLS. Agents can track clicks, signups, and conversions.',
  'info'::public.audit_severity
);
