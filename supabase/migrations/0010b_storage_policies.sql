-- ===========================================================================
-- NetLodge Storage RLS Policies — applied via direct PG connection
-- ===========================================================================
-- This file documents the storage.objects RLS policies that were applied
-- via a direct Postgres connection (the migration runner's postgres role
-- cannot alter storage.objects because it's owned by supabase_storage_admin).
--
-- To re-apply, run this SQL in the Supabase Dashboard SQL Editor or via
-- a direct PG connection as the postgres user.
-- ===========================================================================

-- Drop existing (idempotent)
drop policy if exists "Public read property images" on storage.objects;
drop policy if exists "Authenticated upload property images" on storage.objects;
drop policy if exists "Owner/admin delete property images" on storage.objects;
drop policy if exists "Read verification evidence" on storage.objects;
drop policy if exists "Upload verification evidence" on storage.objects;
drop policy if exists "Read ticket attachments" on storage.objects;
drop policy if exists "Upload ticket attachments" on storage.objects;

-- property-images: public read (anyone can view approved property photos)
create policy "Public read property images"
  on storage.objects for select
  using (bucket_id = 'property-images');

-- property-images: authenticated users can upload to their own folder
create policy "Authenticated upload property images"
  on storage.objects for insert
  with check (
    bucket_id = 'property-images'
    and auth.uid() is not null
    and (owner = auth.uid() or owner is null)
  );

-- property-images: owner or admin can delete
create policy "Owner/admin delete property images"
  on storage.objects for delete
  using (
    bucket_id = 'property-images'
    and (owner = auth.uid() or public.is_admin(auth.uid()))
  );

-- verification-evidence: uploader + verification_officer + super_admin only
create policy "Read verification evidence"
  on storage.objects for select
  using (
    bucket_id = 'verification-evidence'
    and (
      owner = auth.uid()
      or public.has_role(auth.uid(), 'verification_officer')
      or public.has_role(auth.uid(), 'super_admin')
    )
  );

create policy "Upload verification evidence"
  on storage.objects for insert
  with check (
    bucket_id = 'verification-evidence'
    and auth.uid() is not null
    and (owner = auth.uid() or owner is null)
  );

-- ticket-attachments: owner + support staff + admin
create policy "Read ticket attachments"
  on storage.objects for select
  using (
    bucket_id = 'ticket-attachments'
    and (
      owner = auth.uid()
      or public.has_role(auth.uid(), 'support_staff')
      or public.is_admin(auth.uid())
    )
  );

create policy "Upload ticket attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'ticket-attachments'
    and auth.uid() is not null
    and (owner = auth.uid() or owner is null)
  );
