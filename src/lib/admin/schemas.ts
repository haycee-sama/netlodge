/**
 * Admin validation schemas (Zod) — Phase 10.
 *
 * Per API_CONTRACTS.md §16 (admin contracts), §17 (audit log contracts),
 * §19 (error model), §2 (conventions).
 *
 * Every schema uses `.strict()` to reject protected fields — a client
 * cannot smuggle `actorId`, `performedBy`, `metadata`, or other server-
 * derived fields into the request.
 */
import { z } from "zod";
import { uuidSchema, paginationSchema } from "@/validation";

// ── Admin: list verification queue ───────────────────────────────────────────
//
// Re-exported from Phase 4 — kept here for discovery, but the canonical
// schema lives in src/lib/verification/schemas.ts.
export { getVerificationQueueSchema } from "@/lib/verification/schemas";

// ── Admin: approve / reject verification ──────────────────────────────────────
//
// Re-exported from Phase 4.
export {
  approveVerificationSchema,
  rejectVerificationSchema,
} from "@/lib/verification/schemas";

// ── Admin: approve / reject / suspend / lift suspension on property ───────────
//
// `approvePropertySchema` and `rejectPropertySchema` are imported from
// `@/lib/properties/schemas` to avoid duplication. Phase 10 added an
// optional `reason` field to `approvePropertySchema` for audit-log metadata.
export {
  approvePropertySchema,
  rejectPropertySchema,
  type ApprovePropertyInput,
  type RejectPropertyInput,
} from "@/lib/properties/schemas";

export const suspendPropertySchema = z
  .object({
    propertyId: uuidSchema,
    reason: z
      .string()
      .trim()
      .min(1, "Suspension reason is required.")
      .max(2000, "Suspension reason must be at most 2000 characters."),
  })
  .strict();

export type SuspendPropertyInput = z.infer<typeof suspendPropertySchema>;

export const liftSuspensionPropertySchema = z
  .object({
    propertyId: uuidSchema,
    reason: z
      .string()
      .trim()
      .min(1, "A reason is required to lift a suspension.")
      .max(2000, "Reason must be at most 2000 characters."),
  })
  .strict();

export type LiftSuspensionPropertyInput = z.infer<
  typeof liftSuspensionPropertySchema
>;

// ── Admin: list bookings (monitoring) ─────────────────────────────────────────

export const adminListBookingsSchema = z
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
    propertyId: uuidSchema.optional(),
    studentId: uuidSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type AdminListBookingsInput = z.infer<typeof adminListBookingsSchema>;

// ── Admin: list payment transactions (monitoring) ──────────────────────────────

export const adminListPaymentsSchema = z
  .object({
    status: z
      .enum(["initiated", "pending", "success", "failed", "expired"])
      .optional(),
    bookingId: uuidSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type AdminListPaymentsInput = z.infer<typeof adminListPaymentsSchema>;

// ── Admin: list payment webhook events (monitoring) ───────────────────────────

export const adminListWebhookEventsSchema = z
  .object({
    outcome: z
      .enum([
        "processed",
        "duplicate",
        "verification_failed",
        "reconciliation_needed",
        "malformed_payload",
      ])
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type AdminListWebhookEventsInput = z.infer<
  typeof adminListWebhookEventsSchema
>;

// ── Admin: list audit logs ────────────────────────────────────────────────────

export const adminListAuditLogsSchema = paginationSchema
  .extend({
    entityType: z.string().trim().max(100).optional(),
    entityId: uuidSchema.optional(),
    actorId: uuidSchema.optional(),
    // ISO date range — bounded to prevent unbounded scans.
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
  })
  .strict();

export type AdminListAuditLogsInput = z.infer<typeof adminListAuditLogsSchema>;

// ── Result types ──────────────────────────────────────────────────────────────

export interface AdminBookingRow {
  id: string;
  roomId: string;
  propertyId: string;
  studentId: string;
  landlordId: string;
  status: string;
  reservedPriceKobo: number;
  holdExpiresAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentRow {
  id: string;
  bookingId: string;
  paystackReference: string;
  amountKobo: number;
  currency: string;
  status: string;
  initiatedAt: string;
  verifiedAt: string | null;
  failureReason: string | null;
  // providerMetadata is admin-only per API_CONTRACTS.md §16 — explicitly
  // included in the admin response shape to demonstrate the privilege
  // boundary is enforced server-side.
  providerMetadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWebhookEventRow {
  id: string;
  providerEventId: string;
  paystackReference: string | null;
  receivedAt: string;
  processedAt: string | null;
  processingOutcome: string | null;
  // rawPayload is admin-only per API_CONTRACTS.md §16.
  rawPayload: unknown;
}

export interface AdminAuditLogRow {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface AdminListResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}
