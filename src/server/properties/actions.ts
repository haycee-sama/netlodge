/**
 * Server-only Property Server Actions — Phase 5.
 *
 * Thin Next.js Server Action wrapper around the core functions.
 * Imports `server-only`.
 */
import "server-only";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { createPrivilegedClient } from "@/server/supabase/privileged";
import { requireAuthenticated, requireAccountActive } from "@/server/auth/authorize";
import {
  createPropertyCore,
  updatePropertyCore,
  submitPropertyCore,
  getOwnPropertiesCore,
  createRoomCore,
  updateRoomCore,
  setRoomAvailabilityCore,
  getRoomsForPropertyCore,
  requestPropertyImageUploadUrlCore,
  confirmPropertyImageUploadCore,
  setPrimaryPropertyImageCore,
  deletePropertyImageCore,
  requestRoomImageUploadUrlCore,
  confirmRoomImageUploadCore,
  deleteRoomImageCore,
  getPropertyQueueCore,
  approvePropertyCore,
  rejectPropertyCore,
  getPublicPropertiesCore,
} from "@/server/properties/core";

// ── Landlord: property ──────────────────────────────────────────────────────

export async function createProperty(input: unknown) {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return createPropertyCore(db, user, input);
}

export async function updateProperty(propertyId: string, input: unknown) {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return updatePropertyCore(db, user, propertyId, input);
}

export async function submitProperty(propertyId: string) {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return submitPropertyCore(db, user, propertyId);
}

export async function getOwnProperties() {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return getOwnPropertiesCore(db, user);
}

// ── Landlord: rooms ──────────────────────────────────────────────────────────

export async function createRoom(input: unknown) {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return createRoomCore(db, user, input);
}

export async function updateRoom(roomId: string, input: unknown) {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return updateRoomCore(db, user, roomId, input);
}

export async function setRoomAvailability(input: unknown) {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return setRoomAvailabilityCore(db, user, input);
}

export async function getRoomsForProperty(propertyId: string) {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return getRoomsForPropertyCore(db, user, propertyId);
}

// ── Landlord: property images ───────────────────────────────────────────────

export async function requestPropertyImageUploadUrl(input: unknown) {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  const storage = createPrivilegedClient();
  return requestPropertyImageUploadUrlCore(db, storage, user, input);
}

export async function confirmPropertyImageUpload(input: unknown) {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return confirmPropertyImageUploadCore(db, user, input);
}

export async function setPrimaryPropertyImage(input: unknown) {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return setPrimaryPropertyImageCore(db, user, input);
}

export async function deletePropertyImage(input: unknown) {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return deletePropertyImageCore(db, user, input);
}

// ── Landlord: room images ───────────────────────────────────────────────────

export async function requestRoomImageUploadUrl(input: unknown) {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  const storage = createPrivilegedClient();
  return requestRoomImageUploadUrlCore(db, storage, user, input);
}

export async function confirmRoomImageUpload(input: unknown) {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return confirmRoomImageUploadCore(db, user, input);
}

export async function deleteRoomImage(input: unknown) {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return deleteRoomImageCore(db, user, input);
}

// ── Admin ───────────────────────────────────────────────────────────────────
//
// Phase 10 — switched admin operations from `requireAuthenticated()` to
// `requireAccountActive()` so suspended admins can no longer access the
// admin property queue or perform approve/reject. The atomic mutation +
// audit log is performed by the SECURITY DEFINER admin RPC functions
// (migration 0009), which independently re-validate caller authorization
// inside the DB transaction (defense against direct RPC bypass).

export async function getPropertyQueue() {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return getPropertyQueueCore(db, user);
}

export async function approveProperty(input: unknown) {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return approvePropertyCore(db, user, input);
}

export async function rejectProperty(input: unknown) {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return rejectPropertyCore(db, user, input);
}

// ── Public ─────────────────────────────────────────────────────────────────

export async function getPublicProperties(input: unknown) {
  const db = await createSessionClient();
  return getPublicPropertiesCore(db, input);
}
