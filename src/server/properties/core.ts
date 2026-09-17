/**
 * Property & room management core — testable pure functions.
 *
 * Phase 5 — implements the property/room/image domain per API_CONTRACTS.md
 * §5/§6/§8. Each function takes Supabase clients as parameters (dependency
 * injection) so tests can pass mocks.
 *
 * CRITICAL SECURITY PROPERTIES:
 *   1. landlordId is ALWAYS derived from the authenticated session —
 *      never from request input. Zod `.strict()` rejects `landlordId`.
 *   2. Property status changes go through the DB-level state machine trigger
 *      + the verification precondition trigger (migration 0006).
 *   3. Image ownership verified via the RLS policies (landlord_id = auth.uid()
 *      chain through properties → rooms).
 *   4. Publication visibility enforced by RLS — only `status = 'approved'`
 *      properties are readable by anon/authenticated non-owners.
 */
import {
  validationError,
  forbiddenError,
  notFoundError,
  conflictError,
  internalError,
} from "@/errors";
import type { AuthenticatedUser } from "@/lib/auth";
import { formatZodError } from "@/validation";
import {
  createPropertySchema,
  updatePropertySchema,
  createRoomSchema,
  updateRoomSchema,
  setRoomAvailabilitySchema,
  confirmPropertyImageUploadSchema,
  confirmRoomImageUploadSchema,
  deleteRoomImageSchema,
  setPrimaryPropertyImageSchema,
  deletePropertyImageSchema,
  approvePropertySchema,
  rejectPropertySchema,
  getPublicPropertiesSchema,
  requestPropertyImageUploadUrlSchema,
  requestRoomImageUploadUrlSchema,
} from "@/lib/properties/schemas";
import { validatePropertyImageFile } from "@/server/storage/validation";
import { buildPropertyImagePath, buildRoomImagePath } from "@/server/storage/paths";
import { STORAGE_BUCKETS } from "@/server/storage/buckets";
import { SIGNED_URL_EXPIRY_SECONDS } from "@/server/storage/config";
import type { SupabaseStorageClient } from "@/server/storage/core";

// ── Types ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseDbClient = { from(table: string): any; rpc(fn: string, params?: Record<string, unknown>): any };

export interface PropertySummary {
  id: string;
  landlordId: string;
  universityId: string;
  area: string;
  address: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomSummary {
  id: string;
  propertyId: string;
  roomType: string;
  price: string;
  occupancy: number;
  amenities: string[];
  isListed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicPropertyResult {
  id: string;
  landlordId: string;
  universityId: string;
  area: string;
  description: string;
  rooms: Array<{
    id: string;
    roomType: string;
    price: string;
    occupancy: number;
    amenities: string[];
  }>;
  images: Array<{
    id: string;
    storagePath: string;
    position: number;
    isPrimary: boolean;
  }>;
}

// ── Property: create ────────────────────────────────────────────────────────

export async function createPropertyCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<{ propertyId: string }> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError("Only landlords can create properties.");
  }
  if (user.profile.accountStatus === "suspended") {
    throw forbiddenError("Your account is suspended.");
  }

  const parsed = createPropertySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid property input.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // Check landlord verification status.
  const { data: landlord, error: lErr } = await db
    .from("landlords")
    .select("current_verification_status, is_suspended")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (lErr || !landlord) {
    throw forbiddenError("Only verified landlords can create properties.");
  }

  if (landlord.is_suspended) {
    throw forbiddenError("Your landlord account is suspended.");
  }

  // The DB trigger will also enforce this on status='submitted', but
  // we check at creation time for a better error message.
  if (landlord.current_verification_status !== "approved") {
    throw forbiddenError(
      "Property creation requires landlord verification to be approved.",
    );
  }

  const { data, error } = await db
    .from("properties")
    .insert({
      landlord_id: user.id,
      university_id: input.universityId,
      area: input.area,
      address: input.address,
      description: input.description,
      status: "draft", // ← hardcoded
    })
    .select("id")
    .single();

  if (error || !data) {
    throw internalError("Could not create property.", { phase: "createProperty", error });
  }

  return { propertyId: data.id };
}

// ── Property: update ───────────────────────────────────────────────────────

export async function updatePropertyCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  propertyId: string,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError("Only landlords can update properties.");
  }

  const parsed = updatePropertySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid property update.", formatZodError(parsed.error));
  }

  // RLS will enforce ownership (landlord_id = auth.uid()).
  const { error } = await db
    .from("properties")
    .update(parsed.data)
    .eq("id", propertyId)
    .eq("landlord_id", user.id);

  if (error) {
    throw internalError("Could not update property.", { phase: "updateProperty", error });
  }
}

// ── Property: submit ───────────────────────────────────────────────────────

export async function submitPropertyCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  propertyId: string,
): Promise<void> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError("Only landlords can submit properties.");
  }

  // Check property has at least one room.
  const { count, error: countErr } = await db
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  if (countErr) {
    throw internalError("Could not check rooms.", { phase: "submitProperty.roomCount", error: countErr });
  }

  if ((count ?? 0) === 0) {
    throw validationError("Property must have at least one room before submission.", [
      { field: "rooms", issue: "At least one room is required." },
    ]);
  }

  // Update status to 'submitted' — the DB triggers enforce:
  //   1. Verification precondition (landlord must be approved).
  //   2. State machine (draft/rejected → submitted is allowed).
  const { error } = await db
    .from("properties")
    .update({ status: "submitted" })
    .eq("id", propertyId)
    .eq("landlord_id", user.id);

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("verification") || msg.includes("approved")) {
      throw conflictError("Property submission requires landlord verification to be approved.", "verification_required");
    }
    if (msg.includes("status transition") || msg.includes("check_violation")) {
      throw conflictError("Invalid property status transition.", "invalid_state_transition");
    }
    throw internalError("Could not submit property.", { phase: "submitProperty", error });
  }
}

// ── Property: get own list ─────────────────────────────────────────────────

export async function getOwnPropertiesCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
): Promise<{ properties: PropertySummary[] }> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError("Only landlords can view their properties.");
  }

  const { data, error } = await db
    .from("properties")
    .select("id, landlord_id, university_id, area, address, description, status, created_at, updated_at")
    .eq("landlord_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw internalError("Could not retrieve properties.", { phase: "getOwnProperties", error });
  }

  return { properties: (data ?? []) as unknown as PropertySummary[] };
}

// ── Room: create ───────────────────────────────────────────────────────────

export async function createRoomCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<{ roomId: string }> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError("Only landlords can create rooms.");
  }
  if (user.profile.accountStatus === "suspended") {
    throw forbiddenError("Your account is suspended.");
  }

  const parsed = createRoomSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid room input.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // RLS enforces property ownership (property must belong to the caller).
  // is_listed defaults to false — the room listing precondition trigger
  // blocks setting it to true unless the parent property is approved.
  const { data, error } = await db
    .from("rooms")
    .insert({
      property_id: input.propertyId,
      room_type: input.roomType,
      price: input.price / 100, // Convert kobo to naira (numeric(12,2))
      occupancy: input.occupancy,
      amenities: input.amenities,
      is_listed: false, // ← hardcoded default
    })
    .select("id")
    .single();

  if (error || !data) {
    throw internalError("Could not create room.", { phase: "createRoom", error });
  }

  return { roomId: data.id };
}

// ── Room: update ───────────────────────────────────────────────────────────

export async function updateRoomCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  roomId: string,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError("Only landlords can update rooms.");
  }

  const parsed = updateRoomSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid room update.", formatZodError(parsed.error));
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.roomType !== undefined) update.room_type = parsed.data.roomType;
  if (parsed.data.price !== undefined) update.price = parsed.data.price / 100;
  if (parsed.data.occupancy !== undefined) update.occupancy = parsed.data.occupancy;
  if (parsed.data.amenities !== undefined) update.amenities = parsed.data.amenities;

  if (Object.keys(update).length === 0) return;

  // RLS enforces ownership via the property chain.
  const { error } = await db.from("rooms").update(update).eq("id", roomId);

  if (error) {
    throw internalError("Could not update room.", { phase: "updateRoom", error });
  }
}

// ── Room: set availability ─────────────────────────────────────────────────

export async function setRoomAvailabilityCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError("Only landlords can set room availability.");
  }

  const parsed = setRoomAvailabilitySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid availability input.", formatZodError(parsed.error));
  }

  const { error } = await db
    .from("rooms")
    .update({ is_listed: parsed.data.isListed })
    .eq("id", parsed.data.roomId);

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("approved") || msg.includes("property status")) {
      throw conflictError("Room can only be listed when parent property is approved.", "property_not_approved");
    }
    throw internalError("Could not update room availability.", { phase: "setRoomAvailability", error });
  }
}

// ── Room: get rooms for property ────────────────────────────────────────────

export async function getRoomsForPropertyCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  propertyId: string,
): Promise<{ rooms: RoomSummary[] }> {
  if (user.profile.role !== "landlord" && user.profile.role !== "admin") {
    throw forbiddenError("Only landlords or admins can view room details.");
  }

  const { data, error } = await db
    .from("rooms")
    .select("id, property_id, room_type, price, occupancy, amenities, is_listed, created_at, updated_at")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw internalError("Could not retrieve rooms.", { phase: "getRoomsForProperty", error });
  }

  return { rooms: (data ?? []) as unknown as RoomSummary[] };
}

// ── Image: request upload URL ──────────────────────────────────────────────

export async function requestPropertyImageUploadUrlCore(
  db: SupabaseDbClient,
  storage: SupabaseStorageClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<{ signedUploadUrl: string; path: string; expiresAt: string }> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError("Only landlords can upload property images.");
  }

  const parsed = requestPropertyImageUploadUrlSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid upload request.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // Validate file.
  const validation = validatePropertyImageFile({
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });
  if (!validation.ok) {
    throw validationError("Invalid file.", validation.details);
  }

  // Verify ownership (RLS will also enforce, but fail fast for better UX).
  const { data: prop, error: propErr } = await db
    .from("properties")
    .select("id")
    .eq("id", input.propertyId)
    .eq("landlord_id", user.id)
    .maybeSingle();

  if (propErr || !prop) {
    throw forbiddenError("You do not own this property.");
  }

  // Generate server-side path.
  const path = buildPropertyImagePath({
    propertyId: input.propertyId,
    mimeType: validation.mimeType,
  });

  // Issue signed upload URL.
  const bucket = storage.storage.from(STORAGE_BUCKETS.propertyImages);
  const { data, error } = await bucket.createSignedUploadUrl(path, { upsert: false });

  if (error || !data) {
    throw internalError("Could not issue upload URL.", { phase: "requestPropertyImageUploadUrl", error });
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000).toISOString();

  return { signedUploadUrl: data.signedUrl, path: data.path, expiresAt };
}

// ── Image: confirm upload ───────────────────────────────────────────────────

export async function confirmPropertyImageUploadCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<{ imageId: string }> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError("Only landlords can confirm image uploads.");
  }

  const parsed = confirmPropertyImageUploadSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid confirm input.", formatZodError(parsed.error));
  }

  // RLS enforces: property must belong to the caller + uploaded_by = auth.uid().
  const { data, error } = await db
    .from("property_images")
    .insert({
      property_id: parsed.data.propertyId,
      storage_path: parsed.data.storagePath,
      position: parsed.data.position,
      is_primary: false,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw internalError("Could not confirm image upload.", { phase: "confirmPropertyImageUpload", error });
  }

  return { imageId: data.id };
}

// ── Image: set primary ──────────────────────────────────────────────────────

export async function setPrimaryPropertyImageCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError("Only landlords can set primary images.");
  }

  const parsed = setPrimaryPropertyImageSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid input.", formatZodError(parsed.error));
  }

  // Get the image to find its property_id.
  const { data: img, error: imgErr } = await db
    .from("property_images")
    .select("property_id")
    .eq("id", parsed.data.imageId)
    .maybeSingle();

  if (imgErr || !img) {
    throw notFoundError("Image not found.");
  }

  // Unset all primaries for this property, then set the new one.
  // RLS enforces ownership — only the property owner can UPDATE.
  await db
    .from("property_images")
    .update({ is_primary: false })
    .eq("property_id", img.property_id)
    .eq("is_primary", true);

  const { error } = await db
    .from("property_images")
    .update({ is_primary: true })
    .eq("id", parsed.data.imageId);

  if (error) {
    throw internalError("Could not set primary image.", { phase: "setPrimaryPropertyImage", error });
  }
}

// ── Image: delete ──────────────────────────────────────────────────────────

export async function deletePropertyImageCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError("Only landlords can delete property images.");
  }

  const parsed = deletePropertyImageSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid input.", formatZodError(parsed.error));
  }

  // RLS enforces ownership.
  const { error } = await db
    .from("property_images")
    .delete()
    .eq("id", parsed.data.imageId);

  if (error) {
    throw internalError("Could not delete image.", { phase: "deletePropertyImage", error });
  }

  // NOTE: the Storage object deletion is a follow-up server-side action.
  // In production, the Server Action would call Storage.remove() here.
  // Phase 3's storage boundary provides the deleteVerificationDocumentCore
  // pattern — property-image deletion follows the same pattern but uses
  // the public bucket. This is intentionally not implemented in the core
  // function (which doesn't have a Storage client) — the actions wrapper
  // handles the Storage deletion.
}

// ── Room images (same patterns) ─────────────────────────────────────────────

export async function requestRoomImageUploadUrlCore(
  db: SupabaseDbClient,
  storage: SupabaseStorageClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<{ signedUploadUrl: string; path: string; expiresAt: string }> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError("Only landlords can upload room images.");
  }

  const parsed = requestRoomImageUploadUrlSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid upload request.", formatZodError(parsed.error));
  }

  const validation = validatePropertyImageFile({
    mimeType: parsed.data.mimeType,
    sizeBytes: parsed.data.sizeBytes,
  });
  if (!validation.ok) {
    throw validationError("Invalid file.", validation.details);
  }

  // Verify room ownership via property chain.
  const { data: room, error: roomErr } = await db
    .from("rooms")
    .select("property_id")
    .eq("id", parsed.data.roomId)
    .maybeSingle();

  if (roomErr || !room) {
    throw notFoundError("Room not found.");
  }

  const { data: prop, error: propErr } = await db
    .from("properties")
    .select("id")
    .eq("id", room.property_id)
    .eq("landlord_id", user.id)
    .maybeSingle();

  if (propErr || !prop) {
    throw forbiddenError("You do not own this room's property.");
  }

  const path = buildRoomImagePath({
    roomId: parsed.data.roomId,
    mimeType: validation.mimeType,
  });

  const bucket = storage.storage.from(STORAGE_BUCKETS.propertyImages);
  const { data, error } = await bucket.createSignedUploadUrl(path, { upsert: false });

  if (error || !data) {
    throw internalError("Could not issue upload URL.", { phase: "requestRoomImageUploadUrl", error });
  }

  return {
    signedUploadUrl: data.signedUrl,
    path: data.path,
    expiresAt: new Date(Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000).toISOString(),
  };
}

export async function confirmRoomImageUploadCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<{ imageId: string }> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError("Only landlords can confirm room image uploads.");
  }

  const parsed = confirmRoomImageUploadSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid confirm input.", formatZodError(parsed.error));
  }

  const { data, error } = await db
    .from("room_images")
    .insert({
      room_id: parsed.data.roomId,
      storage_path: parsed.data.storagePath,
      position: parsed.data.position,
      is_primary: false,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw internalError("Could not confirm image upload.", { phase: "confirmRoomImageUpload", error });
  }

  return { imageId: data.id };
}

export async function deleteRoomImageCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError("Only landlords can delete room images.");
  }

  const parsed = deleteRoomImageSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid input.", formatZodError(parsed.error));
  }

  const { error } = await db
    .from("room_images")
    .delete()
    .eq("id", parsed.data.imageId);

  if (error) {
    throw internalError("Could not delete image.", { phase: "deleteRoomImage", error });
  }
}

// ── Admin: get property queue ───────────────────────────────────────────────

export async function getPropertyQueueCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
): Promise<{ properties: PropertySummary[]; total: number }> {
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can view the property queue.");
  }

  const { data, error, count } = await db
    .from("properties")
    .select("id, landlord_id, university_id, area, address, description, status, created_at, updated_at", { count: "exact" })
    .in("status", ["submitted", "under_review"])
    .order("created_at", { ascending: false });

  if (error) {
    throw internalError("Could not retrieve property queue.", { phase: "getPropertyQueue", error });
  }

  return { properties: (data ?? []) as unknown as PropertySummary[], total: count ?? 0 };
}

// ── Admin: approve ─────────────────────────────────────────────────────────
//
// Phase 10 — this function now delegates to the `admin_approve_property`
// SECURITY DEFINER RPC function (migration 0009) so that:
//   1. The caller is independently re-validated as an active admin INSIDE
//      the DB transaction (defense against direct RPC invocation by
//      non-admins).
//   2. The property status UPDATE and the audit_logs INSERT happen in a
//      single atomic transaction (IMPLEMENTATION_PLAN.md §17).
//
// The previous implementation used two separate statements
// (`properties.update()` then no audit row) — that left an audit-record
// gap (Phase 9 open decision #3). The RPC approach closes the gap.

export async function approvePropertyCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can approve properties.");
  }

  const parsed = approvePropertySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid approval.", formatZodError(parsed.error));
  }

  const { error } = await db.rpc("admin_approve_property", {
    p_property_id: parsed.data.propertyId,
    p_reason: parsed.data.reason ?? null,
  });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (
      msg.includes("insufficient_privilege") ||
      msg.includes("only active admins")
    ) {
      throw forbiddenError("You do not have permission to do this.");
    }
    if (
      msg.includes("check_violation") ||
      msg.includes("cannot approve") ||
      msg.includes("status")
    ) {
      throw conflictError(
        "Invalid property status transition.",
        "invalid_state_transition",
      );
    }
    if (msg.includes("not found")) {
      throw notFoundError("Property not found.");
    }
    throw internalError("Could not approve property.", {
      phase: "approveProperty",
      error,
    });
  }

  // Phase 11 — dispatch notification AFTER the RPC commits.
  try {
    const { data: property } = await db
      .from("properties")
      .select("landlord_id, area")
      .eq("id", parsed.data.propertyId)
      .maybeSingle();
    const { data: landlordProfile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", property?.landlord_id ?? "")
      .maybeSingle();

    if (property?.landlord_id) {
      const { dispatchNotification } = await import("@/server/notifications/core");
      await dispatchNotification({
        event: "property.approved",
        recipientUserId: property.landlord_id,
        data: {
          landlordFullName: landlordProfile?.full_name ?? "Landlord",
          propertyArea: property.area ?? "",
        },
      }, { db });
    }
  } catch (err) {
    console.error("[netlodge] post-approve-property notification dispatch failed", {
      propertyId: parsed.data.propertyId,
      error: err,
    });
  }
}

// ── Admin: reject ───────────────────────────────────────────────────────────
//
// Phase 10 — same RPC-refactor as approvePropertyCore. The RPC atomically:
//   1. Re-validates caller.
//   2. Validates reason is non-empty, ≤ 2000 chars.
//   3. Validates property is in a reviewable state.
//   4. Updates properties.status = 'rejected'.
//   5. Appends a property_reviews row (append-only).
//   6. Inserts audit_logs row.
// All in one transaction.

export async function rejectPropertyCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can reject properties.");
  }

  const parsed = rejectPropertySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid rejection.", formatZodError(parsed.error));
  }

  const { error } = await db.rpc("admin_reject_property", {
    p_property_id: parsed.data.propertyId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (
      msg.includes("insufficient_privilege") ||
      msg.includes("only active admins")
    ) {
      throw forbiddenError("You do not have permission to do this.");
    }
    if (msg.includes("reason is required") || msg.includes("2000 characters")) {
      throw validationError("Invalid rejection reason.", [
        { field: "reason", issue: error.message },
      ]);
    }
    if (
      msg.includes("check_violation") ||
      msg.includes("cannot reject") ||
      msg.includes("status")
    ) {
      throw conflictError(
        "Invalid property status transition.",
        "invalid_state_transition",
      );
    }
    if (msg.includes("not found")) {
      throw notFoundError("Property not found.");
    }
    throw internalError("Could not reject property.", {
      phase: "rejectProperty",
      error,
    });
  }

  // Phase 11 — dispatch rejection notification AFTER the RPC commits.
  try {
    const { data: property } = await db
      .from("properties")
      .select("landlord_id, area")
      .eq("id", parsed.data.propertyId)
      .maybeSingle();
    const { data: landlordProfile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", property?.landlord_id ?? "")
      .maybeSingle();

    if (property?.landlord_id) {
      const { dispatchNotification } = await import("@/server/notifications/core");
      await dispatchNotification({
        event: "property.rejected",
        recipientUserId: property.landlord_id,
        data: {
          landlordFullName: landlordProfile?.full_name ?? "Landlord",
          propertyArea: property.area ?? "",
          reason: parsed.data.reason,
        },
      }, { db });
    }
  } catch (err) {
    console.error("[netlodge] post-reject-property notification dispatch failed", {
      propertyId: parsed.data.propertyId,
      error: err,
    });
  }
}

// ── Public: get approved properties ──────────────────────────────────────────

export async function getPublicPropertiesCore(
  db: SupabaseDbClient,
  rawInput: unknown,
): Promise<{ properties: PublicPropertyResult[]; total: number }> {
  const parsed = getPublicPropertiesSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid query.", formatZodError(parsed.error));
  }

  const { data, error, count } = await db
    .from("properties")
    .select("id, landlord_id, university_id, area, description", { count: "exact" })
    .eq("university_id", parsed.data.universityId)
    .eq("status", "approved")
    .range(
      (parsed.data.page - 1) * parsed.data.pageSize,
      parsed.data.page * parsed.data.pageSize - 1,
    );

  if (error) {
    throw internalError("Could not retrieve properties.", { phase: "getPublicProperties", error });
  }

  const properties = (data ?? []) as unknown as Array<{
    id: string;
    landlord_id: string;
    university_id: string;
    area: string;
    description: string;
  }>;

  // Fetch rooms + images for each property (N+1 queries are acceptable at
  // MVP scale — DATABASE_SCHEMA.md §27 notes the total row count is
  // small enough that well-indexed queries are sufficient).
  const results: PublicPropertyResult[] = [];
  for (const prop of properties) {
    const [roomsResult, imagesResult] = await Promise.all([
      db.from("rooms")
        .select("id, room_type, price, occupancy, amenities")
        .eq("property_id", prop.id)
        .eq("is_listed", true),
      db.from("property_images")
        .select("id, storage_path, position, is_primary")
        .eq("property_id", prop.id)
        .order("position", { ascending: true }),
    ]);

    results.push({
      id: prop.id,
      landlordId: prop.landlord_id,
      universityId: prop.university_id,
      area: prop.area,
      description: prop.description,
      rooms: (roomsResult.data ?? []) as unknown as PublicPropertyResult["rooms"],
      images: (imagesResult.data ?? []) as unknown as PublicPropertyResult["images"],
    });
  }

  return { properties: results, total: count ?? 0 };
}
