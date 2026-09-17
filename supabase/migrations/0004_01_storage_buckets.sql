-- ─────────────────────────────────────────────────────────────────────────────
-- NetLodge migration 0004 — Phase 3: Storage buckets + access policies
--
-- Implements the two approved storage buckets per TECHNICAL_ARCHITECTURE.md §9:
--
--   1. `property-images`     — PUBLIC read, restricted write
--                              (property/room photos — marketing content)
--
--   2. `verification-documents` — PRIVATE: never public read, signed-URL only
--                                  (landlord ID + ownership evidence —
--                                   sensitive personal data)
--
-- Critical security property:
--   The `verification-documents` bucket has NO public read policy. Access
--   is exclusively via short-lived signed URLs minted server-side after
--   per-request authorization (own-document OR admin role).
--
--   The `property-images` bucket has public read (intended — these are
--   marketing photos meant for unauthenticated browsers). Uploads are
--   gated by a server-issued signed upload URL after ownership check
--   (Phase 5 wires in property ownership; Phase 3 establishes the bucket +
--   upload policy primitives).
--
-- Source of truth:
--   TECHNICAL_ARCHITECTURE.md §9 (Supabase Storage Architecture)
--   TECHNICAL_ARCHITECTURE.md §10 (Verification Document Security flow)
--   API_CONTRACTS.md §6 (Image Contracts) + §7 (Landlord Verification Contracts)
--   IMPLEMENTATION_PLAN.md §7 (Storage Implementation) + §22 Phase 3
--
-- Migration ordering note:
--   This migration only touches the `storage` schema (Supabase-managed).
--   It does NOT touch `public.*` tables — Phase 5's `property_images` and
--   `room_images` tables belong to migration group 5 (§5). Phase 4's
--   `landlord_verifications` table belongs to migration group 4. Phase 3
--   is purely storage infrastructure.
--
-- pglite compatibility:
--   pglite does not include Supabase's `storage` schema (it's not part of
--   vanilla PostgreSQL). The migration is written to be safe to apply on
--   a real Supabase project. The test harness (tests/db/helpers.ts) skips
--   this migration when running on pglite — storage tests use a separate
--   mocked Supabase Storage client (see tests/integration/storage-core.test.ts).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Bucket: property-images (PUBLIC) ───────────────────────────────────────
-- Insert the bucket if it doesn't already exist. `public` = true means
-- public read is allowed (anyone with the URL can GET the object without
-- a signed URL). This is intentional for marketing content per
-- TECHNICAL_ARCHITECTURE.md §9.
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket: verification-documents (PRIVATE)
-- `public` = false. NO public read policy at all. Access is exclusively
-- via short-lived signed URLs minted server-side after per-request
-- authorization (own-document OR admin role).
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- ── Storage policies: property-images (public read, restricted write) ──────
-- Per TECHNICAL_ARCHITECTURE.md §9: "Served via Supabase's public URL, no
-- signed URL needed, no per-request authorization overhead for what is, by
-- design, public content."

-- Public read policy — anyone (anon + authenticated) can SELECT objects
-- in the property-images bucket.
DROP POLICY IF EXISTS "property_images_public_read" ON storage.objects;
CREATE POLICY "property_images_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'property-images');

-- Authenticated write — uploads go through the server-issued signed-upload-URL
-- flow (Phase 5 wires in actual property-ownership verification; Phase 3
-- establishes the bucket + upload policy primitive). We allow authenticated
-- users to INSERT — the actual authorization (does the caller own the
-- target property/room?) happens in the Server Action BEFORE the signed
-- upload URL is issued. The signed URL is scoped to a single object path.
DROP POLICY IF EXISTS "property_images_authenticated_upload" ON storage.objects;
CREATE POLICY "property_images_authenticated_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-images');

-- Owners can delete their own property-image uploads. The `uploaded_by`
-- column (added by Phase 5's `property_images` table; the storage object's
-- `owner` field is set to the uploading user's id by Supabase Storage
-- during the signed-upload-URL flow) identifies the owner.
DROP POLICY IF EXISTS "property_images_owner_delete" ON storage.objects;
CREATE POLICY "property_images_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'property-images'
    AND owner = auth.uid()
  );

-- ── Storage policies: verification-documents (PRIVATE — never public) ──────
-- Per TECHNICAL_ARCHITECTURE.md §9: "A student — or any unauthenticated
-- request — guessing or constructing a storage path gets nothing, because
-- the bucket itself has no public read policy at all."
--
-- NO SELECT policy for `anon` — anonymous users cannot read.
-- NO SELECT policy for `authenticated` in general — ordinary authenticated
-- users cannot read either. Access is exclusively via signed URLs, which
-- are minted server-side after per-request authorization (own-document
-- OR admin role). The signed URL itself contains a signature that Supabase
-- Storage verifies independently of RLS — RLS would otherwise block the
-- GET even with a signed URL.
--
-- Therefore, the SELECT policy here must allow the service-role to read
-- (service-role bypasses RLS, so no explicit policy needed) AND must allow
-- signed-URL GETs (which Supabase Storage handles via its own signed-URL
-- verification, not via RLS — see Supabase Storage docs on signed URLs).
--
-- For the INSERT path (uploads via signed upload URL), we need a policy
-- that allows authenticated landlords to upload to their own subpath:
DROP POLICY IF EXISTS "verification_documents_landlord_upload" ON storage.objects;
CREATE POLICY "verification_documents_landlord_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents'
    -- Landlord can upload to their own subpath:
    -- `verification/{landlord_id}/{uuid}`
    AND owner = auth.uid()
  );

-- NO SELECT policy for verification-documents — neither anon nor
-- authenticated can SELECT directly. Access is exclusively via signed URLs
-- (minted server-side by the privileged client after authorization).
-- Supabase Storage's signed-URL verification handles the GET independently
-- of RLS — this is the standard Supabase pattern for private buckets.

-- NO DELETE policy for verification-documents — only the service-role
-- client (used by the manual admin-triggered deletion Server Action) can
-- delete. This is intentional: a landlord cannot delete their own
-- submitted verification documents (audit trail must be preserved per
-- DATABASE_SCHEMA.md §4.3 "rows in this table are never deleted by the
-- application — this is the audit trail for the single most
-- trust-critical decision in the product").

SELECT 1 AS migration_0004_applied;
