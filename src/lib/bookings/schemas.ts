/**
 * Booking validation schemas (Zod) — Phase 7.
 *
 * Per API_CONTRACTS.md §9 + §2 conventions.
 * All schemas use `.strict()` to reject protected fields.
 */
import { z } from "zod";
import { uuidSchema } from "@/validation";

// ── Create booking ──────────────────────────────────────────────────────────

export const createBookingSchema = z
  .object({
    roomId: uuidSchema,
  })
  .strict();

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// ── Get booking ──────────────────────────────────────────────────────────────

export const getBookingSchema = z
  .object({
    bookingId: uuidSchema,
  })
  .strict();

export type GetBookingInput = z.infer<typeof getBookingSchema>;

// ── List own bookings (student) ──────────────────────────────────────────────

export const listOwnBookingsSchema = z
  .object({
    status: z
      .enum([
        "reservation_pending",
        "payment_pending",
        "confirmed",
        "payment_failed",
        "expired",
        "cancelled",
        "completed",
      ])
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type ListOwnBookingsInput = z.infer<typeof listOwnBookingsSchema>;

// ── List bookings for property (landlord) ────────────────────────────────────

export const listBookingsForPropertySchema = z
  .object({
    propertyId: uuidSchema,
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type ListBookingsForPropertyInput = z.infer<
  typeof listBookingsForPropertySchema
>;

// ── Cancel booking ──────────────────────────────────────────────────────────

export const cancelBookingSchema = z
  .object({
    bookingId: uuidSchema,
    reason: z.string().trim().max(1000).optional(),
  })
  .strict();

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

// ── Result types ─────────────────────────────────────────────────────────────

export interface BookingResult {
  id: string;
  roomId: string;
  propertyId: string;
  studentId: string;
  status: string;
  reservedPriceKobo: number;
  holdExpiresAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingListResult {
  items: BookingResult[];
  page: number;
  pageSize: number;
  totalCount: number;
}
