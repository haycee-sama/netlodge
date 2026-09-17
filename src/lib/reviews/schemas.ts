/**
 * Reviews validation schemas (Zod) — Phase 11.
 *
 * Per API_CONTRACTS.md §14 + §2 conventions + PRD §17.
 * All schemas use `.strict()` to reject protected fields — a client
 * cannot smuggle `studentId`, `reviewerId`, `roomId`, `bookingId`-mismatch,
 * `is_hidden`, `hidden_reason`, or other server-derived fields into the request.
 */
import { z } from "zod";
import { uuidSchema, paginationSchema } from "@/validation";

// ── Student: create review ───────────────────────────────────────────────────

export const createReviewSchema = z
  .object({
    bookingId: uuidSchema,
    rating: z.coerce.number().int().min(1).max(5),
    content: z
      .string()
      .trim()
      .min(1, "Review content is required.")
      .max(5000, "Review content must be at most 5000 characters."),
  })
  .strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// ── Public: list reviews for a room ──────────────────────────────────────────

export const listReviewsForRoomSchema = paginationSchema
  .extend({
    roomId: uuidSchema,
  })
  .strict();

export type ListReviewsForRoomInput = z.infer<typeof listReviewsForRoomSchema>;

// ── Student: update own review ───────────────────────────────────────────────

export const updateOwnReviewSchema = z
  .object({
    reviewId: uuidSchema,
    rating: z.coerce.number().int().min(1).max(5),
    content: z
      .string()
      .trim()
      .min(1, "Review content is required.")
      .max(5000, "Review content must be at most 5000 characters."),
  })
  .strict();

export type UpdateOwnReviewInput = z.infer<typeof updateOwnReviewSchema>;

// ── Student: delete own review ───────────────────────────────────────────────

export const deleteOwnReviewSchema = z
  .object({
    reviewId: uuidSchema,
  })
  .strict();

export type DeleteOwnReviewInput = z.infer<typeof deleteOwnReviewSchema>;

// ── Admin: hide review ───────────────────────────────────────────────────────

export const hideReviewSchema = z
  .object({
    reviewId: uuidSchema,
    reason: z
      .string()
      .trim()
      .min(1, "A reason is required to hide a review.")
      .max(2000, "Reason must be at most 2000 characters."),
  })
  .strict();

export type HideReviewInput = z.infer<typeof hideReviewSchema>;

// ── Admin: unhide review ─────────────────────────────────────────────────────

export const unhideReviewSchema = z
  .object({
    reviewId: uuidSchema,
    reason: z
      .string()
      .trim()
      .min(1, "A reason is required to unhide a review.")
      .max(2000, "Reason must be at most 2000 characters."),
  })
  .strict();

export type UnhideReviewInput = z.infer<typeof unhideReviewSchema>;

// ── Admin: get all reviews (including hidden) ───────────────────────────────

export const adminListReviewsSchema = paginationSchema
  .extend({
    roomId: uuidSchema.optional(),
    studentId: uuidSchema.optional(),
    hiddenOnly: z.coerce.boolean().optional(),
  })
  .strict();

export type AdminListReviewsInput = z.infer<typeof adminListReviewsSchema>;

// ── Result types ─────────────────────────────────────────────────────────────

export interface ReviewRow {
  id: string;
  bookingId: string;
  roomId: string;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewListResult {
  items: ReviewRow[];
  page: number;
  pageSize: number;
  totalCount: number;
}
