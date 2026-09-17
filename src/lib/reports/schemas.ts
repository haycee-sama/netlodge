/**
 * Reports validation schemas (Zod) — Phase 11.
 *
 * Per API_CONTRACTS.md §15 + §2 conventions + PRD §17.
 * All schemas use `.strict()` to reject protected fields.
 */
import { z } from "zod";
import { uuidSchema, paginationSchema } from "@/validation";

// ── Create report ───────────────────────────────────────────────────────────

/**
 * Closed enum for `targetType` — a client cannot submit an arbitrary
 * string and have it accepted. The architecture decision (TECHNICAL_ARCHITECTURE.md
 * §12) is server-side validation, not a trigger, so the enum check happens
 * here in Zod.
 *
 * Existence of `targetId` in the corresponding table is checked SEPARATELY
 * by the application layer (createReportCore) — Zod can't express "exists
 * in another table".
 */
export const createReportSchema = z
  .object({
    targetType: z.enum(["property", "room", "user"]),
    targetId: uuidSchema,
    reasonCategory: z
      .string()
      .trim()
      .min(1, "Reason category is required.")
      .max(100, "Reason category must be at most 100 characters."),
    description: z
      .string()
      .trim()
      .max(5000, "Description must be at most 5000 characters.")
      .optional(),
  })
  .strict();

export type CreateReportInput = z.infer<typeof createReportSchema>;

// ── Reporter: list own reports ──────────────────────────────────────────────

export const listOwnReportsSchema = paginationSchema
  .extend({
    status: z.enum(["open", "under_review", "resolved"]).optional(),
  })
  .strict();

export type ListOwnReportsInput = z.infer<typeof listOwnReportsSchema>;

// ── Admin: list report queue ────────────────────────────────────────────────

export const adminListReportsSchema = paginationSchema
  .extend({
    status: z.enum(["open", "under_review", "resolved"]).optional(),
    // Defaults to "non-resolved" (open + under_review) per API_CONTRACTS.md §15.
    includeResolved: z.coerce.boolean().optional(),
  })
  .strict();

export type AdminListReportsInput = z.infer<typeof adminListReportsSchema>;

// ── Admin: resolve report ──────────────────────────────────────────────────

export const resolveReportSchema = z
  .object({
    reportId: uuidSchema,
    resolutionNotes: z
      .string()
      .trim()
      .min(1, "Resolution notes are required.")
      .max(2000, "Resolution notes must be at most 2000 characters."),
    outcome: z.enum(["action_taken", "no_action", "other"]),
  })
  .strict();

export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

// ── Admin: mark report under review ─────────────────────────────────────────

export const markReportUnderReviewSchema = z
  .object({
    reportId: uuidSchema,
  })
  .strict();

export type MarkReportUnderReviewInput = z.infer<typeof markReportUnderReviewSchema>;

// ── Result types ────────────────────────────────────────────────────────────

export interface ReportRow {
  id: string;
  targetType: "property" | "room" | "user";
  targetId: string;
  reasonCategory: string;
  description: string | null;
  status: "open" | "under_review" | "resolved";
  resolvedBy: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface ReportListResult {
  items: ReportRow[];
  page: number;
  pageSize: number;
  totalCount: number;
}
