/**
 * Property & room shared types + re-exports.
 *
 * Phase 5 — public type surface for the property domain.
 */
export type {
  CreatePropertyInput,
  UpdatePropertyInput,
  CreateRoomInput,
  UpdateRoomInput,
  SetRoomAvailabilityInput,
  RequestPropertyImageUploadUrlInput,
  ConfirmPropertyImageUploadInput,
  ReorderPropertyImagesInput,
  SetPrimaryPropertyImageInput,
  DeletePropertyImageInput,
  RequestRoomImageUploadUrlInput,
  ConfirmRoomImageUploadInput,
  DeleteRoomImageInput,
  ApprovePropertyInput,
  RejectPropertyInput,
  GetPublicPropertiesInput,
} from "./schemas";

export {
  createPropertySchema,
  updatePropertySchema,
  createRoomSchema,
  updateRoomSchema,
  setRoomAvailabilitySchema,
  requestPropertyImageUploadUrlSchema,
  confirmPropertyImageUploadSchema,
  reorderPropertyImagesSchema,
  setPrimaryPropertyImageSchema,
  deletePropertyImageSchema,
  requestRoomImageUploadUrlSchema,
  confirmRoomImageUploadSchema,
  deleteRoomImageSchema,
  approvePropertySchema,
  rejectPropertySchema,
  getPublicPropertiesSchema,
} from "./schemas";
