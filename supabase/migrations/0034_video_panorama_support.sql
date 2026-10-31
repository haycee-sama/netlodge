-- ===========================================================================
-- NetLodge Migration — Part 34: Video & 360 Panorama Support
-- ===========================================================================
-- Adds media_type, video_url, and panorama_url to unit_images and
-- property_images. Existing rows default to media_type='image' (backward
-- compatible). Video and panorama media are rendered in the room/property
-- gallery alongside regular images.
-- ===========================================================================

do $$ begin create type media_type as enum ('image', 'video', 'panorama'); exception when duplicate_object then null; end $$;

-- unit_images
do $$ begin alter table public.unit_images add column if not exists media_type media_type default 'image'; exception when duplicate_column then null; end $$;
do $$ begin alter table public.unit_images add column if not exists video_url text; exception when duplicate_column then null; end $$;
do $$ begin alter table public.unit_images add column if not exists panorama_url text; exception when duplicate_column then null; end $$;

-- property_images
do $$ begin alter table public.property_images add column if not exists media_type media_type default 'image'; exception when duplicate_column then null; end $$;
do $$ begin alter table public.property_images add column if not exists video_url text; exception when duplicate_column then null; end $$;
do $$ begin alter table public.property_images add column if not exists panorama_url text; exception when duplicate_column then null; end $$;

-- Backfill existing rows
update public.unit_images set media_type = 'image' where media_type is null;
update public.property_images set media_type = 'image' where media_type is null;

-- Storage bucket for media (video/panorama) — reuse existing buckets if present
-- Property images and room photos buckets already exist (migrations 0010, 0022)

insert into public.audit_logs (actor_email, actor_role, category, action, resource_type, resource_id, summary, severity)
values ('system@netlodge.test', 'super_admin'::public.user_role, 'security'::public.audit_category, 'migration.applied', 'migration', '0034_video_panorama_support.sql', 'Added media_type/video_url/panorama_url to unit_images + property_images for video and 360 panorama support in room and property galleries.', 'info'::public.audit_severity);
