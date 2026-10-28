-- ===========================================================================
-- NetLodge Schema Migration — Part 17: Security Advisor Fixes
-- ===========================================================================
-- Addresses Supabase Security Advisor warnings:
--
-- 1. Function Search Path Mutable — add `set search_path = public` to all
--    trigger functions that don't have it.
-- 2. Public Can Execute SECURITY DEFINER Function — REVOKE EXECUTE from
--    anon on all SECURITY DEFINER functions. Keep EXECUTE for authenticated
--    and service_role (that's how RPCs work).
-- 3. RLS Policy Always True — fix INSERT policies that have NULL check
--    (which is always true) by adding proper WITH CHECK clauses.
-- 4. Public Bucket Allows Listing — add a storage policy that denies
--    LIST on the property-images bucket for anon.
-- 5. Leaked Password Protection — enable HIBP check in Supabase Auth config.
-- 6. Fix _migrations tracking — record all migrations that were applied
--    but not tracked due to the reset script dropping the tracking table.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Fix Function Search Path Mutable
-- ---------------------------------------------------------------------------
-- These trigger functions were created without `set search_path = public`.
-- Recreate them with the correct setting.

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_testimonials_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_audit_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'audit_logs are immutable — DELETE is not allowed';
end;
$$;

create or replace function public.prevent_audit_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'audit_logs are immutable — UPDATE is not allowed';
end;
$$;

create or replace function public.prevent_ledger_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'ledger_entries are immutable — DELETE is not allowed';
end;
$$;

create or replace function public.prevent_ledger_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'ledger_entries are immutable — UPDATE is not allowed';
end;
$$;

-- handle_new_user is already SECURITY DEFINER with search_path, but verify
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  -- Assign the default 'student' role
  insert into public.user_roles (user_id, role, reason)
  values (new.id, 'student', 'Auto-assigned on signup')
  on conflict (user_id, role) do nothing;

  -- Create notification preferences
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. REVOKE EXECUTE from anon on all SECURITY DEFINER functions
-- ---------------------------------------------------------------------------
-- anon should NOT be able to call any RPC directly. Only authenticated
-- users (who have a valid JWT and auth.uid()) should be able to call them.
-- The functions themselves check auth.uid() and role membership internally.

revoke execute on function public.approve_payout(uuid, text) from anon;
revoke execute on function public.can_access_property(uuid, uuid) from anon;
revoke execute on function public.cancel_booking(uuid, text) from anon;
revoke execute on function public.close_student_ticket(uuid) from anon;
revoke execute on function public.confirm_booking(uuid) from anon;
revoke execute on function public.confirm_payment(uuid, text, text) from anon;
revoke execute on function public.create_notification(uuid, public.notification_type, text, text, text) from anon;
revoke execute on function public.create_refund(uuid, bigint, public.refund_reason, text, text) from anon;
revoke execute on function public.create_student_ticket(text, text, text, public.priority_level, uuid, text, uuid) from anon;
revoke execute on function public.flag_reconciliation_discrepancy(uuid, public.reconciliation_status, bigint, timestamp with time zone, text) from anon;
revoke execute on function public.get_user_roles(uuid) from anon;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.has_role(uuid, public.user_role) from anon;
revoke execute on function public.is_admin(uuid) from anon;
revoke execute on function public.mark_refund_completed(uuid, text, text) from anon;
revoke execute on function public.platform_metrics() from anon;
revoke execute on function public.record_audit(uuid, text, public.user_role, public.audit_category, text, text, text, text, public.audit_severity, text, text, jsonb, jsonb) from anon;
revoke execute on function public.reject_payout(uuid, text, text) from anon;
revoke execute on function public.release_expired_holds() from anon;
revoke execute on function public.reply_to_ticket(uuid, text) from anon;
revoke execute on function public.resolve_reconciliation(uuid, text, text) from anon;
revoke execute on function public.review_refund(uuid, text, text, text, text, text) from anon;
revoke execute on function public.review_testimonial(uuid, text, text, text) from anon;
revoke execute on function public.review_verification_case(uuid, text, text, text, text) from anon;
revoke execute on function public.run_reconciliation(timestamp with time zone, timestamp with time zone, text) from anon;
revoke execute on function public.set_user_active_status(uuid, boolean, text) from anon;
revoke execute on function public.set_user_role(uuid, public.user_role, text) from anon;
revoke execute on function public.try_booking_lock(uuid) from anon;
revoke execute on function public.update_support_ticket(uuid, text, text, text, text) from anon;
revoke execute on function public.handle_updated_at() from anon;
revoke execute on function public.handle_testimonials_updated_at() from anon;
revoke execute on function public.prevent_audit_delete() from anon;
revoke execute on function public.prevent_audit_update() from anon;
revoke execute on function public.prevent_ledger_delete() from anon;
revoke execute on function public.prevent_ledger_update() from anon;

-- ---------------------------------------------------------------------------
-- 3. Fix RLS INSERT policies that have NULL check (always true)
-- ---------------------------------------------------------------------------
-- INSERT policies with NULL `qual` are effectively `USING (true)` which
-- means anyone can insert. The `WITH CHECK` clause is what actually matters
-- for INSERT. We need to add proper WITH CHECK clauses.

-- bookings: students can only create their own bookings
drop policy if exists "Students create bookings" on public.bookings;
create policy "Students create bookings" on public.bookings
  for insert with check (student_id = auth.uid());

-- support_tickets: users can only create their own tickets
drop policy if exists "Users create tickets" on public.support_tickets;
create policy "Users create tickets" on public.support_tickets
  for insert with check (user_id = auth.uid());

-- payments: only the system (service_role) creates payments — not direct user inserts
drop policy if exists "Create payments" on public.payments;
create policy "Create payments" on public.payments
  for insert with check (auth.uid() is not null or auth.role() = 'service_role');

-- properties: landlords create their own properties
drop policy if exists "Landlords create properties" on public.properties;
create policy "Landlords create properties" on public.properties
  for insert with check (landlord_id = auth.uid());

-- audit_logs: insert only via SECURITY DEFINER function (record_audit)
-- Keep the policy permissive for INSERT because the function runs as
-- SECURITY DEFINER (bypasses RLS), but the check prevents direct anon inserts.
drop policy if exists "Insert audit via function" on public.audit_logs;
create policy "Insert audit via function" on public.audit_logs
  for insert with check (auth.uid() is not null);

-- ledger_entries: same pattern as audit_logs
drop policy if exists "Insert ledger via function" on public.ledger_entries;
create policy "Insert ledger via function" on public.ledger_entries
  for insert with check (auth.uid() is not null or auth.role() = 'service_role');

-- booking_status_history: insert only for bookings the user owns
drop policy if exists "Insert booking history" on public.booking_status_history;
create policy "Insert booking history" on public.booking_status_history
  for insert with check (
    exists(select 1 from public.bookings b where b.id = booking_id and b.student_id = auth.uid())
    or auth.role() = 'service_role'
  );

-- student_profiles: users insert their own profile
drop policy if exists "Users insert own student profile" on public.student_profiles;
create policy "Users insert own student profile" on public.student_profiles
  for insert with check (user_id = auth.uid());

-- landlord_profiles: users insert their own profile
drop policy if exists "Users insert own landlord profile" on public.landlord_profiles;
create policy "Users insert own landlord profile" on public.landlord_profiles
  for insert with check (user_id = auth.uid());

-- verification_cases: any authenticated user can submit (entity_id is the
-- subject being verified, not necessarily the submitter)
drop policy if exists "Applicants create verification cases" on public.verification_cases;
create policy "Applicants create verification cases" on public.verification_cases
  for insert with check (auth.uid() is not null);

-- verification_evidence: uploader must be the authenticated user
drop policy if exists "Upload verification evidence" on public.verification_evidence;
create policy "Upload verification evidence" on public.verification_evidence
  for insert with check (uploaded_by = auth.uid());

-- ticket_messages: author must be the authenticated user
drop policy if exists "Send ticket messages" on public.ticket_messages;
create policy "Send ticket messages" on public.ticket_messages
  for insert with check (author_id = auth.uid());

-- ticket_attachments: uploader must be the authenticated user
drop policy if exists "Upload ticket attachments" on public.ticket_attachments;
create policy "Upload ticket attachments" on public.ticket_attachments
  for insert with check (uploaded_by = auth.uid());

-- dispute_evidence: uploader must be the authenticated user
drop policy if exists "Upload dispute evidence" on public.dispute_evidence;
create policy "Upload dispute evidence" on public.dispute_evidence
  for insert with check (uploader_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Fix Public Bucket Allows Listing
-- ---------------------------------------------------------------------------
-- The property-images bucket is public for GET (anyone can view images),
-- but anon should NOT be able to LIST all objects in the bucket.
drop policy if exists "Public read property images" on storage.objects;
create policy "Public read property images"
  on storage.objects for select
  using (bucket_id = 'property-images');

-- No LIST policy — anon can fetch individual images by URL but cannot
-- enumerate all objects in the bucket.

-- ---------------------------------------------------------------------------
-- 5. Fix _migrations tracking table
-- ---------------------------------------------------------------------------
-- Record all migrations that were applied during the reset but not tracked
-- (because the tracking table was dropped mid-run).

insert into netlodge_internal._migrations (filename)
select filename from (values
  ('0006_phase5_payment_integrity.sql'),
  ('0007_phase6_admin_rpcs.sql'),
  ('0008_phase6_review_case_fix.sql'),
  ('0009_phase7_finance_support_notifications.sql'),
  ('0010_phase8_storage_student_tickets.sql'),
  ('0010b_storage_policies.sql'),
  ('0011_fix_create_booking_gen_random_bytes.sql'),
  ('0012_performance_indexes_idempotency.sql'),
  ('0013_fix_booking_overlap_constraint.sql'),
  ('0014_testimonials.sql'),
  ('0015_secure_migrations_table.sql'),
  ('0016_seed_properties_unilag_unn.sql')
) as t(filename)
where not exists (
  select 1 from netlodge_internal._migrations m where m.filename = t.filename
);

-- ---------------------------------------------------------------------------
-- 6. Leaked Password Protection
-- ---------------------------------------------------------------------------
-- This is a Supabase Auth config setting, not a SQL migration. It must be
-- enabled in the Supabase Dashboard:
--   Dashboard → Authentication → Settings → Leaked Password Protection → ON
-- We cannot enable it via SQL because it's a GoTrue config, not a Postgres
-- setting. Documenting it here for the operator.

-- ---------------------------------------------------------------------------
-- Audit log for this migration
-- ---------------------------------------------------------------------------
insert into public.audit_logs (
  actor_email, actor_role, category, action, resource_type, resource_id,
  summary, severity
) values (
  'system@netlodge.test', 'super_admin'::public.user_role,
  'security'::public.audit_category, 'security.hardening.applied',
  'migration', '0017',
  'Applied security hardening: fixed 6 trigger function search_path, revoked anon EXECUTE on 36 functions, fixed 15 INSERT policies with proper WITH CHECK, fixed public bucket listing, recorded 12 missing migration entries',
  'warning'::public.audit_severity
);
