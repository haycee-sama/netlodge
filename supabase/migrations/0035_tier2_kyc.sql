-- ===========================================================================
-- NetLodge Migration — Part 35: Tier 2 KYC Verification
-- ===========================================================================
-- Creates the kyc_verifications table for document-based identity
-- verification. Tier 2 KYC gates booking (students) and property listing
-- (landlords) until the user's identity documents are approved by a
-- verification officer.
--
-- Tier 1 (basic onboarding): profile_completed = true (already exists)
-- Tier 2 (document KYC): kyc_verifications row with status='approved'
--
-- Student Tier 2: student_id card + NIN
-- Landlord Tier 2: government_id + proof_of_address (+ CAC if business)
-- ===========================================================================

do $$ begin create type kyc_status as enum ('pending', 'approved', 'rejected'); exception when duplicate_object then null; end $$;

create table if not exists public.kyc_verifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier int not null default 2 check (tier in (1, 2)),
  status kyc_status not null default 'pending',
  document_type text not null check (document_type in (
    'student_id', 'nin', 'government_id', 'proof_of_address', 'cac', 'utility_bill'
  )),
  document_url text not null,
  document_number text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_kyc_user on public.kyc_verifications(user_id);
create index if not exists idx_kyc_status on public.kyc_verifications(status);

-- RLS
alter table public.kyc_verifications enable row level security;

-- Users can read their own KYC records
create policy "Users read own KYC" on public.kyc_verifications
  for select using (
    user_id = auth.uid()
    or public.has_role(auth.uid(), 'verification_officer'::public.user_role)
    or public.has_role(auth.uid(), 'super_admin'::public.user_role)
  );

-- Users can submit (insert) their own KYC records
create policy "Users submit own KYC" on public.kyc_verifications
  for insert with check (user_id = auth.uid());

-- Users can update their own pending records (e.g. re-upload)
create policy "Users update own pending KYC" on public.kyc_verifications
  for update using (
    (user_id = auth.uid() and status = 'pending')
    or public.has_role(auth.uid(), 'verification_officer'::public.user_role)
    or public.has_role(auth.uid(), 'super_admin'::public.user_role)
  ) with check (
    user_id = auth.uid()
    or public.has_role(auth.uid(), 'verification_officer'::public.user_role)
    or public.has_role(auth.uid(), 'super_admin'::public.user_role)
  );

-- Grant to authenticated
grant select, insert, update on public.kyc_verifications to authenticated;

-- Helper function: check if a user has approved Tier 2 KYC
create or replace function public.has_kyc_tier2(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.kyc_verifications
    where user_id = p_user_id
    and tier = 2
    and status = 'approved'
  );
$$;

do $$ begin
  grant execute on function public.has_kyc_tier2(uuid) to authenticated, service_role;
exception when duplicate_object then null; end $$;

-- Audit log
insert into public.audit_logs (actor_email, actor_role, category, action, resource_type, resource_id, summary, severity)
values ('system@netlodge.test', 'super_admin'::public.user_role, 'security'::public.audit_category, 'migration.applied', 'migration', '0035_tier2_kyc.sql', 'Created kyc_verifications table + has_kyc_tier2() function for Tier 2 document-based identity verification. RLS: users read/submit own records, verification_officer/super_admin can review. Gates booking (student) and listing (landlord).', 'info'::public.audit_severity);
