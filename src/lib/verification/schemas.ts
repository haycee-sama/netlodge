/**
 * Verification validation schemas (Zod) — Phase 4.
 *
 * Implements the validation boundary for landlord verification operations
 * per API_CONTRACTS.md §7.
 *
 * CRITICAL security property:
 *   None of these schemas accept `landlordId`, `status`, `decision`,
 *   `reviewedBy`, or other protected fields. Zod's `.strict()` mode makes
 *   any unrecognized key a validation error rather than silently stripping
 *   it — so a malicious payload like `{ "landlordId": "<other landlord>" }`
 *   is REJECTED at the validation layer, not quietly dropped.
 *
 * The landlord identity is ALWAYS derived from the authenticated session
 * (`requireAuthenticated()` from Phase 2), never from the request body.
 */
import { z } from "zod";
import { uuidSchema } from "@/validation";

// ── Verification document kinds (mirrors Phase 3 storage paths) ─────────────

export const verificationDocumentKindSchema = z.enum(["id", "ownership_evidence"]);
export type VerificationDocumentKind = z.infer<typeof verificationDocumentKindSchema>;

// ── Submit verification ──────────────────────────────────────────────────────

/**
 * `verification.submit` — API_CONTRACTS.md §7.
 *
 * The landlord provides references to the two uploaded documents (confirmed
 * uploads via Phase 3's confirm-upload flow). The server:
 *   1. Validates the storage paths belong to the caller (parsed from path).
 *   2. Inserts a new landlord_verifications row with status='submitted'.
 *
 * Input shape: `{ idDocumentPath, ownershipEvidencePath }` — both are the
 * storage paths returned by Phase 3's confirm-upload step.
 *
 * `.strict()` — rejects `landlordId`, `status`, `decision`, etc.
 */
export const submitVerificationSchema = z
  .object({
    idDocumentPath: z
      .string()
      .min(1, "ID document path is required.")
      .max(512, "ID document path must be at most 512 characters."),
    ownershipEvidencePath: z
      .string()
      .min(1, "Ownership evidence path is required.")
      .max(512, "Ownership evidence path must be at most 512 characters."),
  })
  .strict();

export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>;

// ── Get own status / history ─────────────────────────────────────────────────

/**
 * `verification.getOwnStatus` / `verification.getOwnHistory` — no input.
 * The landlord identity is derived from the session.
 */
export const getOwnStatusSchema = z.object({}).strict();
export type GetOwnStatusInput = z.infer<typeof getOwnStatusSchema>;

// ── Admin: get verification queue ────────────────────────────────────────────

/**
 * `adminVerification.getQueue` — API_CONTRACTS.md §7.
 *
 * Optional `status` filter (defaults to 'submitted'/'under_review').
 * Pagination via page + pageSize.
 */
export const verificationStatusFilterSchema = z.enum([
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "unsubmitted",
]);

export const getVerificationQueueSchema = z
  .object({
    status: verificationStatusFilterSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type GetVerificationQueueInput = z.infer<typeof getVerificationQueueSchema>;

// ── Admin: get document URL ──────────────────────────────────────────────────

/**
 * `adminVerification.getDocumentUrl` — API_CONTRACTS.md §7.
 *
 * Takes a `verificationId` (the landlord_verifications row id). The server
 * looks up the row, then issues a signed download URL for the requested
 * document kind (id / ownership_evidence).
 *
 * The `documentKind` field tells the server WHICH of the two stored
 * documents to issue a URL for.
 */
export const getDocumentUrlSchema = z
  .object({
    verificationId: uuidSchema,
    documentKind: verificationDocumentKindSchema,
  })
  .strict();

export type GetDocumentUrlInput = z.infer<typeof getDocumentUrlSchema>;

// ── Admin: approve ──────────────────────────────────────────────────────────

/**
 * `adminVerification.approve` — API_CONTRACTS.md §7.
 *
 * Takes only a `verificationId`. No reason required for approval (rejection
 * requires a reason, approval does not).
 *
 * `.strict()` — rejects `status`, `decision`, `landlordId`, etc.
 */
export const approveVerificationSchema = z
  .object({
    verificationId: uuidSchema,
    // Approval reason is OPTIONAL per PRD §11 ("Actions requiring a reason
    // (recommended, not enforced): approval"). Phase 10 adds this optional
    // field so admin approvals can record a reason that gets stored in the
    // audit log metadata.
    reason: z.string().trim().max(2000).optional(),
  })
  .strict();

export type ApproveVerificationInput = z.infer<typeof approveVerificationSchema>;

// ── Admin: reject ────────────────────────────────────────────────────────────

/**
 * `adminVerification.reject` — API_CONTRACTS.md §7.
 *
 * Takes a `verificationId` and a non-empty `reason`. Per API_CONTRACTS §7:
 * "Sets decision = 'rejected', decisionReason = reason verbatim".
 *
 * The reason is required and must be 1–2000 characters. Empty strings,
 * whitespace-only, and excessively long reasons are rejected.
 *
 * `.strict()` — rejects `status`, `decision`, `landlordId`, etc.
 */
export const rejectVerificationSchema = z
  .object({
    verificationId: uuidSchema,
    reason: z
      .string()
      .trim()
      .min(1, "Rejection reason is required.")
      .max(2000, "Rejection reason must be at most 2000 characters."),
  })
  .strict();

export type RejectVerificationInput = z.infer<typeof rejectVerificationSchema>;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the input object contains any key that's forbidden on
 * the verification contracts. Defense-in-depth alongside Zod `.strict()`.
 */
export const FORBIDDEN_VERIFICATION_FIELDS = [
  "landlordId",
  "landlord_id",
  "status",
  "decision",
  "reviewedBy",
  "reviewed_by",
  "reviewedAt",
  "reviewed_at",
  "decisionReason",
  "decision_reason",
  "submittedIdReference",
  "submitted_id_reference",
  "submittedOwnershipReference",
  "submitted_ownership_reference",
  "submittedAt",
  "submitted_at",
] as const;

export function hasForbiddenVerificationField(input: unknown): boolean {
  if (typeof input !== "object" || input === null) return false;
  const keys = Object.keys(input);
  return FORBIDDEN_VERIFICATION_FIELDS.some((forbidden) => keys.includes(forbidden));
}
