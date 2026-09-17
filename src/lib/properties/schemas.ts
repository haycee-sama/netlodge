/**
 * Property & room validation schemas (Zod) — Phase 5.
 *
 * Per API_CONTRACTS.md §5/§6: all schemas use `.strict()` to reject
 * protected fields like `status`, `landlordId`, `approvedBy`, etc.
 */
import { z } from "zod";
import { uuidSchema, moneyMinorUnitsSchema } from "@/validation";

// ── Property ────────────────────────────────────────────────────────────────

export const createPropertySchema = z
  .object({
    universityId: uuidSchema,
    area: z.string().trim().min(1, "Area is required.").max(200),
    address: z.string().trim().min(1, "Address is required.").max(500),
    description: z.string().trim().min(1, "Description is required.").max(5000),
  })
  .strict();

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

export const updatePropertySchema = z
  .object({
    area: z.string().trim().min(1).max(200).optional(),
    address: z.string().trim().min(1).max(500).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
  })
  .strict();

export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

// ── Room ─────────────────────────────────────────────────────────────────────

export const createRoomSchema = z
  .object({
    propertyId: uuidSchema,
    roomType: z.string().trim().min(1, "Room type is required.").max(100),
    price: moneyMinorUnitsSchema,
    occupancy: z.number().int().min(1, "Occupancy must be at least 1.").max(20),
    amenities: z.array(z.string()).default([]),
  })
  .strict();

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = z
  .object({
    roomType: z.string().trim().min(1).max(100).optional(),
    price: moneyMinorUnitsSchema.optional(),
    occupancy: z.number().int().min(1).max(20).optional(),
    amenities: z.array(z.string()).optional(),
  })
  .strict();

export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

export const setRoomAvailabilitySchema = z
  .object({
    roomId: uuidSchema,
    isListed: z.boolean(),
  })
  .strict();

export type SetRoomAvailabilityInput = z.infer<typeof setRoomAvailabilitySchema>;

// ── Image ───────────────────────────────────────────────────────────────────

export const requestPropertyImageUploadUrlSchema = z
  .object({
    propertyId: uuidSchema,
    mimeType: z.string(),
    sizeBytes: z.number().int().positive(),
  })
  .strict();

export type RequestPropertyImageUploadUrlInput = z.infer<typeof requestPropertyImageUploadUrlSchema>;

export const confirmPropertyImageUploadSchema = z
  .object({
    propertyId: uuidSchema,
    storagePath: z.string().min(1).max(512),
    position: z.number().int().min(0).default(0),
  })
  .strict();

export type ConfirmPropertyImageUploadInput = z.infer<typeof confirmPropertyImageUploadSchema>;

export const reorderPropertyImagesSchema = z
  .object({
    propertyId: uuidSchema,
    imageIds: z.array(uuidSchema).min(1),
  })
  .strict();

export type ReorderPropertyImagesInput = z.infer<typeof reorderPropertyImagesSchema>;

export const setPrimaryPropertyImageSchema = z
  .object({
    imageId: uuidSchema,
  })
  .strict();

export type SetPrimaryPropertyImageInput = z.infer<typeof setPrimaryPropertyImageSchema>;

export const deletePropertyImageSchema = z
  .object({
    imageId: uuidSchema,
  })
  .strict();

export type DeletePropertyImageInput = z.infer<typeof deletePropertyImageSchema>;

// Room image schemas follow the same pattern.
export const requestRoomImageUploadUrlSchema = z
  .object({
    roomId: uuidSchema,
    mimeType: z.string(),
    sizeBytes: z.number().int().positive(),
  })
  .strict();

export type RequestRoomImageUploadUrlInput = z.infer<typeof requestRoomImageUploadUrlSchema>;

export const confirmRoomImageUploadSchema = z
  .object({
    roomId: uuidSchema,
    storagePath: z.string().min(1).max(512),
    position: z.number().int().min(0).default(0),
  })
  .strict();

export type ConfirmRoomImageUploadInput = z.infer<typeof confirmRoomImageUploadSchema>;

export const deleteRoomImageSchema = z
  .object({ imageId: uuidSchema })
  .strict();

export type DeleteRoomImageInput = z.infer<typeof deleteRoomImageSchema>;

// ── Admin ──────────────────────────────────────────────────────────────────
//
// Phase 10 — `approvePropertySchema` accepts an optional `reason` so admin
// approvals can record a rationale in the audit log (PRD §11: "Actions
// requiring a reason (recommended, not enforced): approval").

export const approvePropertySchema = z
  .object({
    propertyId: uuidSchema,
    reason: z.string().trim().max(2000).optional(),
  })
  .strict();

export type ApprovePropertyInput = z.infer<typeof approvePropertySchema>;

export const rejectPropertySchema = z
  .object({
    propertyId: uuidSchema,
    reason: z.string().trim().min(1, "Rejection reason is required.").max(2000),
  })
  .strict();

export type RejectPropertyInput = z.infer<typeof rejectPropertySchema>;

// ── Public ─────────────────────────────────────────────────────────────────

export const getPublicPropertiesSchema = z
  .object({
    universityId: uuidSchema,
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type GetPublicPropertiesInput = z.infer<typeof getPublicPropertiesSchema>;
