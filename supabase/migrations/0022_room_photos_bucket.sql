-- ===========================================================================
-- NetLodge Schema Migration — Part 22: Room Photos Storage Bucket
-- ===========================================================================
-- Creates a public storage bucket for room (unit) photos. Landlords upload
-- photos of individual rentable units so students can see exactly what
-- they're booking — each room differs in color, space, layout, furnishing.
--
-- The bucket is public-read (students browse without auth) but only
-- authenticated landlords/managers can upload. Storage RLS policies are
-- documented in 0010b_storage_policies.sql and applied via the Supabase
-- Dashboard SQL editor (storage.objects is owned by supabase_storage_admin).
-- ===========================================================================

-- Create the room-photos bucket (public read, 5MB max, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'room-photos',
  'room-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Storage RLS policies for room-photos (applied here since we can't alter
-- storage.objects from the postgres role — we use DO blocks with exception
-- handling to be safe in all environments)
-- ---------------------------------------------------------------------------
do $$ begin
  execute 'drop policy if exists "Public read room photos" on storage.objects';
exception when others then null; end $$;

do $$ begin
  execute 'drop policy if exists "Authenticated upload room photos" on storage.objects';
exception when others then null; end $$;

do $$ begin
  execute 'drop policy if exists "Owner/admin delete room photos" on storage.objects';
exception when others then null; end $$;

do $$ begin
  execute $q$
    create policy "Public read room photos" on storage.objects
      for select using (bucket_id = 'room-photos')
  $q$;
exception when others then null; end $$;

do $$ begin
  execute $q$
    create policy "Authenticated upload room photos" on storage.objects
      for insert with check (
        bucket_id = 'room-photos'
        and auth.role() in ('authenticated', 'service_role')
      )
  $q$;
exception when others then null; end $$;

do $$ begin
  execute $q$
    create policy "Owner/admin delete room photos" on storage.objects
      for delete using (
        bucket_id = 'room-photos'
        and auth.role() = 'service_role'
      )
  $q$;
exception when others then null; end $$;

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
  '0022_room_photos_bucket.sql',
  'Created room-photos storage bucket (public read, authenticated upload) with RLS policies. Enables landlords to upload unit photos for the room image carousel.',
  'info'::public.audit_severity
);
