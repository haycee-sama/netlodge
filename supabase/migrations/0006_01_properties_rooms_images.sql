-- ─────────────────────────────────────────────────────────────────────────────
-- NetLodge migration 0006 — Phase 5: properties, rooms, property_images,
-- room_images, property_reviews
--
-- Implements migration group 5 per IMPLEMENTATION_PLAN.md §5.
-- Uses dedicated property_images/room_images tables (NOT the polymorphic
-- `images` table from DATABASE_SCHEMA.md §4.8 — superseded by
-- TECHNICAL_ARCHITECTURE.md §11's schema-change recommendation).
--
-- Tables created:
--   1. `properties`         — landlord-owned, university-scoped property
--                               records with approval-lifecycle status.
--   2. `property_reviews`    — append-only admin decision history per
--                               property (mirrors landlord_verifications).
--   3. `rooms`               — bookable units within a property.
--   4. `property_images`     — image metadata for properties (native FK).
--   5. `room_images`         — image metadata for rooms (native FK).
--
-- Critical database-level invariants enforced:
--   * Verification precondition: a property can only reach `submitted`
--     status if its landlord's `current_verification_status = 'approved'`.
--   * Property state machine: only documented transitions allowed.
--   * Append-only property_reviews: decision fields admin-only; no
--     UPDATE/DELETE of historical rows by non-admin.
--   * Image ownership: RLS enforces landlord can only manage images on
--     their own properties/rooms.
--   * Publication visibility: only `approved` properties are publicly
--     readable; draft/submitted/under_review/rejected are invisible to
--     anon/public.
--
-- Source of truth:
--   DATABASE_SCHEMA.md §4.5 (properties), §4.6 (property_reviews),
--   §4.7 (rooms), §4.8 (images — SUPERSEDED by TECHNICAL_ARCHITECTURE.md §11)
--   §22 (constraints), §23 (indexes), §24 (RLS), §28.2 (property state machine)
--   TECHNICAL_ARCHITECTURE.md §11 (dedicated image tables decision)
--   API_CONTRACTS.md §5 (Property & Room Contracts), §6 (Image Contracts),
--   §8 (Property Verification & Moderation Contracts), §20 (State Transitions)
--   IMPLEMENTATION_PLAN.md §5 migration group 5, §8 stages 7–12, §22 Phase 5
-- ─────────────────────────────────────────────────────────────────────────────

-- ── properties table ──────────────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §4.5.
CREATE TABLE IF NOT EXISTS public.properties (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id     uuid            NOT NULL,
  university_id   uuid            NOT NULL,
  area            text            NOT NULL,
  address         text            NOT NULL,
  description     text            NOT NULL,
  status          property_status NOT NULL DEFAULT 'draft',
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now(),
  -- FK to landlords — RESTRICT so a landlord with properties can't be
  -- hard-deleted (DATABASE_SCHEMA.md §21).
  CONSTRAINT properties_landlord_id_fkey
    FOREIGN KEY (landlord_id) REFERENCES public.landlords (profile_id)
    ON DELETE RESTRICT,
  -- FK to universities — RESTRICT.
  CONSTRAINT properties_university_id_fkey
    FOREIGN KEY (university_id) REFERENCES public.universities (id)
    ON DELETE RESTRICT
);

-- updated_at trigger (same pattern as profiles/landlords).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS properties_set_updated_at ON public.properties;
CREATE TRIGGER properties_set_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── Verification precondition trigger ─────────────────────────────────────
--
-- CRITICAL: per DATABASE_SCHEMA.md §4.5 + API_CONTRACTS.md §5, a property
-- can only reach `submitted` status if its landlord's
-- `current_verification_status = 'approved'`. This is enforced at the
-- database level via a SECURITY DEFINER trigger — NOT just application
-- code. This is the single most important Phase 5 invariant.
--
-- The trigger fires BEFORE INSERT or UPDATE of `status` on properties.
-- If the new status is `submitted`, it checks the landlord's verification
-- status. If not `approved`, the trigger raises an exception.
--
-- SECURITY DEFINER + search_path = public, pg_temp — same pattern as
-- Phase 1's netlodge_is_current_user_admin(). The function bypasses RLS
-- to read the landlords row.
CREATE OR REPLACE FUNCTION public.check_property_verification_precondition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  landlord_verification_status verification_status;
BEGIN
  -- Only check when status is transitioning TO 'submitted'.
  IF NEW.status = 'submitted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT current_verification_status INTO landlord_verification_status
    FROM public.landlords
    WHERE profile_id = NEW.landlord_id;

    IF landlord_verification_status IS NULL THEN
      RAISE EXCEPTION 'Landlord record not found for property creation'
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF landlord_verification_status != 'approved' THEN
      RAISE EXCEPTION 'Property submission requires landlord verification status = approved (current: %)',
        landlord_verification_status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS properties_check_verification_precondition ON public.properties;
CREATE TRIGGER properties_check_verification_precondition
  BEFORE INSERT OR UPDATE OF status ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.check_property_verification_precondition();

-- ── Property state machine trigger ─────────────────────────────────────────
--
-- Per DATABASE_SCHEMA.md §28.2 + API_CONTRACTS.md §20, enforce the
-- property approval lifecycle state machine. Only admin (or service-role)
-- can change status beyond the landlord's `draft → submitted` action.
--
-- Allowed transitions:
--   draft → submitted (landlord)
--   submitted → under_review (admin)
--   submitted → approved (admin, direct)
--   submitted → rejected (admin, direct)
--   under_review → approved (admin)
--   under_review → rejected (admin)
--   rejected → submitted (landlord resubmits)
--   approved → submitted (landlord edits substantive fields — per API_CONTRACTS.md §5)
--   approved → archived (landlord)
--
-- Blocked: all other transitions, and ALL status changes by non-admin
-- callers except the two landlord-allowed ones (draft→submitted,
-- rejected→submitted).
CREATE OR REPLACE FUNCTION public.guard_property_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Only fire when status changes.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT public.netlodge_is_current_user_admin() INTO is_admin;

    -- Non-admin: only allowed draft → submitted and rejected → submitted.
    IF NOT is_admin THEN
      IF NOT (
        (OLD.status = 'draft' AND NEW.status = 'submitted')
        OR (OLD.status = 'rejected' AND NEW.status = 'submitted')
      ) THEN
        RAISE EXCEPTION 'Non-admin cannot perform property status transition: % → %',
          OLD.status, NEW.status
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    -- Admin: check the documented state machine.
    IF is_admin THEN
      IF NOT (
        (OLD.status = 'draft' AND NEW.status = 'submitted')
        OR (OLD.status = 'rejected' AND NEW.status = 'submitted')
        OR (OLD.status = 'submitted' AND NEW.status IN ('under_review', 'approved', 'rejected'))
        OR (OLD.status = 'under_review' AND NEW.status IN ('approved', 'rejected'))
        OR (OLD.status = 'approved' AND NEW.status IN ('submitted', 'archived'))
        OR (OLD.status = 'archived' AND NEW.status = 'submitted')
      ) THEN
        RAISE EXCEPTION 'Invalid property status transition: % → %',
          OLD.status, NEW.status
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS properties_guard_status_transitions ON public.properties;
CREATE TRIGGER properties_guard_status_transitions
  BEFORE UPDATE OF status ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_property_status_transitions();

-- ── property_reviews table ────────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §4.6: append-only, mirrors landlord_verifications.
CREATE TABLE IF NOT EXISTS public.property_reviews (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid            NOT NULL,
  submitted_at    timestamptz     NOT NULL DEFAULT now(),
  reviewed_by     uuid            NULL,
  reviewed_at     timestamptz     NULL,
  decision        decision_type   NULL,
  decision_reason text            NULL,
  CONSTRAINT property_reviews_decision_reason_required
    CHECK (
      decision IS DISTINCT FROM 'rejected'
      OR decision_reason IS NOT NULL
    ),
  CONSTRAINT property_reviews_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties (id)
    ON DELETE CASCADE,
  CONSTRAINT property_reviews_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES public.profiles (id)
    ON DELETE SET NULL
);

-- Index: admin property queue.
CREATE INDEX IF NOT EXISTS property_reviews_property_id_submitted_at_idx
  ON public.property_reviews (property_id, submitted_at DESC);

-- ── Property reviews append-only trigger ──────────────────────────────────
-- Same pattern as Phase 4's landlord_verifications append-only trigger.
-- Blocks UPDATE/DELETE by non-admin; blocks re-deciding decided rows.
CREATE OR REPLACE FUNCTION public.guard_property_reviews_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT public.netlodge_is_current_user_admin() INTO is_admin;

  IF TG_OP = 'DELETE' THEN
    IF NOT is_admin THEN
      RAISE EXCEPTION 'property_reviews rows cannot be deleted by non-admin (append-only audit trail)'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Protected columns: never changeable.
    IF NEW.property_id IS DISTINCT FROM OLD.property_id THEN
      RAISE EXCEPTION 'property_id is not updateable (append-only)' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
      RAISE EXCEPTION 'submitted_at is not updateable (append-only)' USING ERRCODE = 'check_violation';
    END IF;

    -- Decision fields: admin-only, one-time fill.
    IF (
         NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
      OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
      OR NEW.decision IS DISTINCT FROM OLD.decision
      OR NEW.decision_reason IS DISTINCT FROM OLD.decision_reason
    ) THEN
      IF NOT is_admin THEN
        RAISE EXCEPTION 'decision fields can only be modified by an admin (append-only)' USING ERRCODE = 'check_violation';
      END IF;
      IF OLD.decision IS NOT NULL THEN
        RAISE EXCEPTION 'decision has already been recorded on this row (append-only)' USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS property_reviews_guard_append_only ON public.property_reviews;
CREATE TRIGGER property_reviews_guard_append_only
  BEFORE UPDATE OR DELETE ON public.property_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_property_reviews_append_only();

-- ── rooms table ───────────────────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §4.7.
CREATE TABLE IF NOT EXISTS public.rooms (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid          NOT NULL,
  room_type     text          NOT NULL,
  price         numeric(12,2) NOT NULL,
  occupancy     integer       NOT NULL,
  amenities     text[]        NOT NULL DEFAULT '{}',
  is_listed     boolean       NOT NULL DEFAULT false,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT rooms_price_positive CHECK (price > 0),
  CONSTRAINT rooms_occupancy_positive CHECK (occupancy > 0),
  CONSTRAINT rooms_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties (id)
    ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS rooms_set_updated_at ON public.rooms;
CREATE TRIGGER rooms_set_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Index: search by university + status (DATABASE_SCHEMA.md §23).
CREATE INDEX IF NOT EXISTS properties_university_id_status_idx
  ON public.properties (university_id, status);

-- Index: price range filtering (DATABASE_SCHEMA.md §23).
CREATE INDEX IF NOT EXISTS rooms_price_idx
  ON public.rooms (price);

-- Index: loading a property's rooms (DATABASE_SCHEMA.md §23).
CREATE INDEX IF NOT EXISTS rooms_property_id_idx
  ON public.rooms (property_id);

-- ── Room availability guard trigger ────────────────────────────────────────
-- Per API_CONTRACTS.md §5: is_listed can only be set true if the parent
-- property is `approved`. This is a database-level check — not just
-- application logic.
CREATE OR REPLACE FUNCTION public.check_room_listing_precondition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  property_status property_status;
BEGIN
  -- Only check when is_listed is being set to true.
  IF (TG_OP = 'UPDATE' AND NEW.is_listed = true AND OLD.is_listed = false)
     OR (TG_OP = 'INSERT' AND NEW.is_listed = true) THEN
    SELECT status INTO property_status
    FROM public.properties
    WHERE id = NEW.property_id;

    IF property_status IS NULL THEN
      RAISE EXCEPTION 'Parent property not found for room' USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF property_status != 'approved' THEN
      RAISE EXCEPTION 'Room can only be listed when parent property is approved (current property status: %)',
        property_status USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_check_listing_precondition ON public.rooms;
CREATE TRIGGER rooms_check_listing_precondition
  BEFORE INSERT OR UPDATE OF is_listed ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.check_room_listing_precondition();

-- ── property_images table ─────────────────────────────────────────────────
-- Per TECHNICAL_ARCHITECTURE.md §11: dedicated table with native FK
-- (NOT the polymorphic images table from DATABASE_SCHEMA.md §4.8).
CREATE TABLE IF NOT EXISTS public.property_images (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid          NOT NULL,
  storage_path  text          NOT NULL,
  position      integer       NOT NULL DEFAULT 0,
  is_primary    boolean       NOT NULL DEFAULT false,
  uploaded_by   uuid          NOT NULL,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT property_images_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties (id)
    ON DELETE CASCADE,
  CONSTRAINT property_images_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles (id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS property_images_property_id_position_idx
  ON public.property_images (property_id, position);

-- ── room_images table ─────────────────────────────────────────────────────
-- Per TECHNICAL_ARCHITECTURE.md §11: dedicated table with native FK.
CREATE TABLE IF NOT EXISTS public.room_images (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       uuid          NOT NULL,
  storage_path  text          NOT NULL,
  position      integer       NOT NULL DEFAULT 0,
  is_primary    boolean       NOT NULL DEFAULT false,
  uploaded_by   uuid          NOT NULL,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT room_images_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.rooms (id)
    ON DELETE CASCADE,
  CONSTRAINT room_images_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles (id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS room_images_room_id_position_idx
  ON public.room_images (room_id, position);

-- ── RLS: properties ─────────────────────────────────────────────────────────
-- Per DATABASE_SCHEMA.md §24 + API_CONTRACTS.md §4/§5.
--
-- Public: SELECT only WHERE status = 'approved' (publication visibility —
-- the Phase 5 exit criterion). Draft/submitted/under_review/rejected are
-- invisible to anon and to authenticated non-owners.
--
-- Landlord: SELECT/INSERT/UPDATE own properties (WHERE landlord_id =
-- auth.uid()). Cannot UPDATE status (the state-machine trigger blocks
-- non-admin status changes beyond draft→submitted/rejected→submitted).
-- Cannot DELETE (properties are never hard-deleted by the application;
-- the RESTRICT FK prevents landlord deletion while properties exist).
--
-- Admin: full read + UPDATE (for status transitions). No INSERT (admin
-- doesn't create properties). No DELETE through the application surface.
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties FORCE ROW LEVEL SECURITY;

-- Public read of APPROVED properties only (publication visibility).
DROP POLICY IF EXISTS properties_public_read ON public.properties;
CREATE POLICY properties_public_read
  ON public.properties
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Landlord self-read (own properties, any status).
DROP POLICY IF EXISTS properties_landlord_select ON public.properties;
CREATE POLICY properties_landlord_select
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (landlord_id = auth.uid());

-- Landlord INSERT (new property — landlord_id derived from session, not
-- from client input; the application code sets landlord_id = user.id).
DROP POLICY IF EXISTS properties_landlord_insert ON public.properties;
CREATE POLICY properties_landlord_insert
  ON public.properties
  FOR INSERT
  TO authenticated
  WITH CHECK (landlord_id = auth.uid());

-- Landlord self-update (own properties, non-status fields).
DROP POLICY IF EXISTS properties_landlord_update ON public.properties;
CREATE POLICY properties_landlord_update
  ON public.properties
  FOR UPDATE
  TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Admin full read + update (for status transitions).
DROP POLICY IF EXISTS properties_admin_select ON public.properties;
CREATE POLICY properties_admin_select
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (public.netlodge_is_current_user_admin());

DROP POLICY IF EXISTS properties_admin_update ON public.properties;
CREATE POLICY properties_admin_update
  ON public.properties
  FOR UPDATE
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

-- NO DELETE policy — properties are never hard-deleted by the application.
-- The RESTRICT FK on landlord_id prevents landlord deletion while
-- properties exist.

-- ── RLS: property_reviews ───────────────────────────────────────────────────
ALTER TABLE public.property_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_reviews FORCE ROW LEVEL SECURITY;

-- Landlord self-read (reviews on own properties).
DROP POLICY IF EXISTS property_reviews_landlord_select ON public.property_reviews;
CREATE POLICY property_reviews_landlord_select
  ON public.property_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_reviews.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Admin full read + update (for the one-time review action).
DROP POLICY IF EXISTS property_reviews_admin_select ON public.property_reviews;
CREATE POLICY property_reviews_admin_select
  ON public.property_reviews
  FOR SELECT
  TO authenticated
  USING (public.netlodge_is_current_user_admin());

DROP POLICY IF EXISTS property_reviews_admin_update ON public.property_reviews;
CREATE POLICY property_reviews_admin_update
  ON public.property_reviews
  FOR UPDATE
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

-- Landlord INSERT (create a new review row on property submission).
-- The property must belong to the landlord.
DROP POLICY IF EXISTS property_reviews_landlord_insert ON public.property_reviews;
CREATE POLICY property_reviews_landlord_insert
  ON public.property_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_reviews.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord self-UPDATE — allows the UPDATE to pass RLS so the
-- append-only trigger can fire and produce a meaningful error message
-- for non-admin callers attempting to change decision fields.
DROP POLICY IF EXISTS property_reviews_landlord_update ON public.property_reviews;
CREATE POLICY property_reviews_landlord_update
  ON public.property_reviews
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_reviews.property_id
        AND p.landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_reviews.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord self-DELETE — allows DELETE to pass RLS so the append-only
-- trigger can fire and block the attempt.
DROP POLICY IF EXISTS property_reviews_landlord_delete ON public.property_reviews;
CREATE POLICY property_reviews_landlord_delete
  ON public.property_reviews
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_reviews.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- NO DELETE policy for non-admin — append-only trigger blocks non-admin DELETE.

-- ── RLS: rooms ───────────────────────────────────────────────────────────────
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms FORCE ROW LEVEL SECURITY;

-- Public read: rooms under APPROVED properties AND is_listed = true.
-- Publication visibility — only listed rooms in approved properties are
-- visible to the public. Unlisted rooms are invisible (even in approved
-- properties) until the landlord explicitly lists them.
DROP POLICY IF EXISTS rooms_public_read ON public.rooms;
CREATE POLICY rooms_public_read
  ON public.rooms
  FOR SELECT
  TO anon, authenticated
  USING (
    is_listed = true
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = rooms.property_id
        AND p.status = 'approved'
    )
  );

-- Landlord self-read (rooms under own properties).
DROP POLICY IF EXISTS rooms_landlord_select ON public.rooms;
CREATE POLICY rooms_landlord_select
  ON public.rooms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = rooms.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord INSERT (room under own property only).
DROP POLICY IF EXISTS rooms_landlord_insert ON public.rooms;
CREATE POLICY rooms_landlord_insert
  ON public.rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = rooms.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord UPDATE (room under own property only).
DROP POLICY IF EXISTS rooms_landlord_update ON public.rooms;
CREATE POLICY rooms_landlord_update
  ON public.rooms
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = rooms.property_id
        AND p.landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = rooms.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord DELETE (room under own property only — CASCADE on property
-- delete also removes rooms).
DROP POLICY IF EXISTS rooms_landlord_delete ON public.rooms;
CREATE POLICY rooms_landlord_delete
  ON public.rooms
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = rooms.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Admin full access.
DROP POLICY IF EXISTS rooms_admin_all ON public.rooms;
CREATE POLICY rooms_admin_all
  ON public.rooms
  FOR ALL
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

-- ── RLS: property_images ────────────────────────────────────────────────────
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images FORCE ROW LEVEL SECURITY;

-- Public read: images on APPROVED properties (publication visibility).
DROP POLICY IF EXISTS property_images_public_read ON public.property_images;
CREATE POLICY property_images_public_read
  ON public.property_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.status = 'approved'
    )
  );

-- Landlord self-read (images on own properties).
DROP POLICY IF EXISTS property_images_landlord_select ON public.property_images;
CREATE POLICY property_images_landlord_select
  ON public.property_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord INSERT (uploaded_by must be the caller).
DROP POLICY IF EXISTS property_images_landlord_insert ON public.property_images;
CREATE POLICY property_images_landlord_insert
  ON public.property_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord UPDATE (reorder, set primary).
DROP POLICY IF EXISTS property_images_landlord_update ON public.property_images;
CREATE POLICY property_images_landlord_update
  ON public.property_images
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord DELETE.
DROP POLICY IF EXISTS property_images_landlord_delete ON public.property_images;
CREATE POLICY property_images_landlord_delete
  ON public.property_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Admin full access.
DROP POLICY IF EXISTS property_images_admin_all ON public.property_images;
CREATE POLICY property_images_admin_all
  ON public.property_images
  FOR ALL
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

-- ── RLS: room_images ───────────────────────────────────────────────────────
ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_images FORCE ROW LEVEL SECURITY;

-- Public read: images on rooms in APPROVED properties (publication visibility).
DROP POLICY IF EXISTS room_images_public_read ON public.room_images;
CREATE POLICY room_images_public_read
  ON public.room_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE r.id = room_images.room_id
        AND p.status = 'approved'
    )
  );

-- Landlord self-read (images on rooms under own properties).
DROP POLICY IF EXISTS room_images_landlord_select ON public.room_images;
CREATE POLICY room_images_landlord_select
  ON public.room_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE r.id = room_images.room_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord INSERT.
DROP POLICY IF EXISTS room_images_landlord_insert ON public.room_images;
CREATE POLICY room_images_landlord_insert
  ON public.room_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE r.id = room_images.room_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord UPDATE.
DROP POLICY IF EXISTS room_images_landlord_update ON public.room_images;
CREATE POLICY room_images_landlord_update
  ON public.room_images
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE r.id = room_images.room_id
        AND p.landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE r.id = room_images.room_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Landlord DELETE.
DROP POLICY IF EXISTS room_images_landlord_delete ON public.room_images;
CREATE POLICY room_images_landlord_delete
  ON public.room_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE r.id = room_images.room_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Admin full access.
DROP POLICY IF EXISTS room_images_admin_all ON public.room_images;
CREATE POLICY room_images_admin_all
  ON public.room_images
  FOR ALL
  TO authenticated
  USING (public.netlodge_is_current_user_admin())
  WITH CHECK (public.netlodge_is_current_user_admin());

SELECT 1 AS migration_0006_applied;
