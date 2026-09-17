/**
 * Validation foundation.
 *
 * Phase 0 establishes the boundary: every Server Action and Route Handler
 * re-validates input server-side using Zod, regardless of any client-side
 * validation already run (TECHNICAL_ARCHITECTURE §4: "client-side validation
 * is a UX nicety, never the actual gate").
 *
 * Concrete schemas for registration, property/room creation, reservation
 * creation, payment initiation, webhook payloads, etc., are added in the
 * relevant later phase. Phase 0 defines only the shared helpers below so
 * that later phases start from a consistent shape.
 */
import { z } from "zod";

/**
 * Standard pagination schema — reused by every list endpoint.
 * Mirrors API_CONTRACTS §2 conventions. Routes may override the page-size
 * ceiling locally, but the shape stays consistent.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Generic sort-direction enum — routes extend this with the specific sort
 * fields they accept.
 */
export const sortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof sortDirectionSchema>;

/**
 * Money — every money value at every API/payment boundary is in minor units
 * (kobo for NGN), per API_CONTRACTS §2. A float is never used; this helper
 * enforces a positive integer string-or-number at the validation boundary.
 *
 * Phase 12 finding F-001: the original schema accepted `n >= 0` (non-negative),
 * which allowed zero-price rooms. PRD §18 / DATABASE_SCHEMA.md §22 explicitly
 * require `rooms.price > 0`, `bookings.reserved_price > 0`, and
 * `payment_transactions.amount > 0`. Tightened to `n > 0` (positive integer)
 * to enforce the business rule at the validation boundary. The DB-level
 * CHECK constraints (migration 0006) mirror this rule.
 *
 * If a future use case legitimately requires zero (e.g., free add-ons),
 * use a separate schema — do not relax this one.
 */
export const moneyMinorUnitsSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "string" ? Number(v) : v))
  .refine((n) => Number.isInteger(n) && n > 0, {
    message: "money must be a positive integer (kobo, minor units) — zero or negative not allowed per PRD §18",
  });

export type MoneyMinorUnits = z.infer<typeof moneyMinorUnitsSchema>;

/**
 * UUID schema — Postgres UUIDs are the canonical identifier shape across
 * the database (DATABASE_SCHEMA §4). Use this anywhere an ID is accepted
 * from a client to fail-fast on malformed input.
 */
export const uuidSchema = z
  .string()
  .uuid("id must be a valid UUID");
export type Uuid = z.infer<typeof uuidSchema>;

/**
 * Result of validating input — used to convert Zod's `SafeParseReturnType`
 * into the standardized error-model `validation_error` shape without leaking
 * internal Zod paths to the client.
 */
export type ValidationErrorDetail = {
  field: string;
  issue: string;
};

export function formatZodError(
  error: z.ZodError,
): ValidationErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "(root)",
    // Zod messages are safe to display — they describe shape, not internals.
    issue: issue.message,
  }));
}
