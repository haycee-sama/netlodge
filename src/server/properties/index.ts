/**
 * Server-only property boundary — public API.
 * Phase 5 — re-exports the core + Server Actions.
 */
import "server-only";

export type {
  SupabaseDbClient,
  PropertySummary,
  RoomSummary,
  PublicPropertyResult,
} from "./core";

export {
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
} from "./core";

export {
  createProperty,
  updateProperty,
  submitProperty,
  getOwnProperties,
  createRoom,
  updateRoom,
  setRoomAvailability,
  getRoomsForProperty,
  requestPropertyImageUploadUrl,
  confirmPropertyImageUpload,
  setPrimaryPropertyImage,
  deletePropertyImage,
  requestRoomImageUploadUrl,
  confirmRoomImageUpload,
  deleteRoomImage,
  getPropertyQueue,
  approveProperty,
  rejectProperty,
  getPublicProperties,
} from "./actions";
