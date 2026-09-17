/**
 * Auth validation schemas (Zod).
 *
 * Phase 2 — implements the validation boundary for authentication and
 * profile-management operations per API_CONTRACTS.md §3.
 *
 * CRITICAL security property:
 *   None of these schemas accept a `role` or `accountStatus` field. Zod's
 *   `.strict()` mode makes any unrecognized key a validation error rather
 *   than silently stripping it — so a malicious payload like
 *   `{ "role": "admin" }` is REJECTED at the validation layer, not quietly
 *   dropped. This is the explicit API_CONTRACTS §3 rule:
 *   "fails closed, not silently ignored, so a malicious payload is visibly
 *   rejected rather than quietly stripped."
 *
 * Even if a malicious payload somehow bypassed validation (it can't via
 * this path), the Phase 1 column-guard trigger on `profiles.role` is the
 * database-level second line of defense — also tested.
 */
import { z } from "zod";
import { uuidSchema } from "@/validation";

// ── Registration ───────────────────────────────────────────────────────────

/**
 * Email validation — Supabase Auth stores whatever email is provided, but we
 * do a basic shape check at the validation boundary so malformed input is
 * rejected before any Supabase call is made.
 */
const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .max(254, "Email must be at most 254 characters.")
  .email("Must be a valid email address.");

/**
 * Password policy — Supabase Auth enforces its own minimum (6 chars by
 * default), but we apply a slightly stronger baseline here. The planning
 * documents do not specify a particular policy, so this is conservative:
 *   - 8+ characters
 *   - At least one letter and one number
 *   - Reasonable max length to prevent DoS
 *
 * NOTE: this is NOT a UX gate that gets bypassed server-side. Server-side
 * validation is authoritative — but the real credential storage happens in
 * Supabase Auth, which has its own limits.
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.")
  .regex(
    /[a-zA-Z]/,
    "Password must contain at least one letter.",
  )
  .regex(
    /[0-9]/,
    "Password must contain at least one number.",
  );

/**
 * Phone — Nigerian-format-tolerant, not strict (we don't want to reject
 * valid numbers because of formatting). Min length only.
 */
const phoneSchema = z
  .string()
  .trim()
  .min(7, "Phone must be at least 7 characters.")
  .max(20, "Phone must be at most 20 characters.");

/**
 * Full name — non-empty, reasonable length.
 */
const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Full name is required.")
  .max(100, "Full name must be at most 100 characters.");

/**
 * Student registration schema.
 *
 * Required fields per API_CONTRACTS.md §3 auth.registerStudent:
 *   email, password, fullName, phone, universityId
 *
 * `role` is HARDCODED server-side to "student" — never accepted as input.
 * `.strict()` rejects any unknown key (e.g., `role`, `accountStatus`)
 * with a validation error, not silent strip.
 */
export const registerStudentSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    fullName: fullNameSchema,
    phone: phoneSchema,
    universityId: uuidSchema,
  })
  .strict();

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;

/**
 * Landlord registration schema.
 *
 * Required fields per API_CONTRACTS.md §3 auth.registerLandlord:
 *   email, password, fullName, phone
 *
 * No `universityId` (landlords don't belong to a university).
 *
 * `role` is HARDCODED server-side to "landlord" — never accepted as input.
 * `.strict()` rejects any unknown key.
 */
export const registerLandlordSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    fullName: fullNameSchema,
    phone: phoneSchema,
  })
  .strict();

export type RegisterLandlordInput = z.infer<typeof registerLandlordSchema>;

// ── Login ───────────────────────────────────────────────────────────────────

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Password is required."),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

// ── Password reset ──────────────────────────────────────────────────────────

export const requestPasswordResetSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;

// ── Profile updates ─────────────────────────────────────────────────────────

/**
 * Profile update schema — API_CONTRACTS.md §3 profile.updateOwn.
 *
 * Accepts ONLY: fullName, phone, universityId (student only).
 *
 * `role` and `accountStatus` are NOT in this schema. With `.strict()`,
 * submitting either field as a key produces a validation_error.
 *
 * All fields are optional — a PATCH semantics, where omitted fields remain
 * unchanged. But any field that IS present must be valid.
 */
export const profileUpdateSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    phone: phoneSchema.optional(),
    // universityId may be null (landlord) or a UUID (student). Optional
    // because not every update touches it.
    universityId: uuidSchema.nullable().optional(),
  })
  .strict();

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the input object contains any key that's forbidden on
 * the registration/profile-update contracts. Used as a defense-in-depth
 * pre-check (the `.strict()` Zod parse already handles this, but having
 * the helper makes it possible to write very explicit tests).
 */
export const FORBIDDEN_PROFILE_FIELDS = [
  "role",
  "accountStatus",
  "account_status",
] as const;

export function hasForbiddenProfileField(
  input: unknown,
): boolean {
  if (typeof input !== "object" || input === null) return false;
  const keys = Object.keys(input);
  return FORBIDDEN_PROFILE_FIELDS.some((forbidden) =>
    keys.includes(forbidden),
  );
}
