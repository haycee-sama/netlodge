/**
 * Server-only auth Server Actions.
 *
 * Phase 2 — implements `auth.registerStudent`, `auth.registerLandlord`,
 * `auth.login`, `auth.logout`, `auth.requestPasswordReset`, `auth.getSession`,
 * `profile.getOwn`, `profile.updateOwn` per API_CONTRACTS.md §3.
 *
 * This file is the Next.js Server Action wrapper around the pure functions
 * in `./core.ts`. The pure functions take their Supabase client dependencies
 * as parameters — making them testable without a Next.js request context.
 * This file creates the real clients (using `@/lib/supabase/server` and
 * `@/server/supabase/privileged`) and passes them in.
 *
 * CRITICAL SECURITY PROPERTY (restated in code review because it is the
 * single most important rule in this file):
 *
 *   Role is HARDCODED per registration flow:
 *     - `registerStudent`  → always creates `profiles.role = 'student'`
 *     - `registerLandlord`  → always creates `profiles.role = 'landlord'`
 *
 *   The role is NEVER read from client input. The Zod schemas
 *   (`registerStudentSchema`, `registerLandlordSchema`) use `.strict()` so
 *   submitting `role: "admin"` in the request body produces a
 *   `validation_error`, not a silent strip. The Phase 1 column-guard
 *   trigger is the database-level second line of defense.
 *
 * The `server-only` import guard at the top of this file makes it
 * impossible to import these actions from a Client Component at build time.
 */
import "server-only";
import type { AuthenticatedUser } from "@/lib/auth";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { createPrivilegedClient } from "@/server/supabase/privileged";
import {
  registerStudentCore,
  registerLandlordCore,
  loginCore,
  logoutCore,
  requestPasswordResetCore,
  updateOwnProfileCore,
} from "@/server/auth/core";
import {
  getCurrentSession,
  requireAuthenticated,
  requireAccountActive,
} from "@/server/auth/authorize";
import { assertRateLimit } from "@/server/ratelimit";
import { getClientIp } from "@/server/auth/client-ip";

// Re-export the authorize helpers from this module so consumers can import
// everything from a single entry point (`@/server/auth/actions`).
export { getCurrentSession, requireAuthenticated, requireAccountActive };
export { requireRole } from "@/server/auth/authorize";

// ── Registration ────────────────────────────────────────────────────────────

/**
 * `auth.registerStudent` — API_CONTRACTS.md §3.
 *
 * Creates a Supabase Auth user (email + password), then immediately
 * provisions a `profiles` row with `role = 'student'` (HARDCODED).
 *
 * On profile-provisioning failure, attempts to clean up the just-created
 * auth.users row to avoid a stranded identity.
 */
export async function registerStudent(
  rawInput: unknown,
): Promise<{ user: AuthenticatedUser }> {
  const supabase = await createSessionClient();
  const privileged = createPrivilegedClient();
  return registerStudentCore(supabase, privileged, rawInput);
}

/**
 * `auth.registerLandlord` — API_CONTRACTS.md §3.
 *
 * Same pattern as `registerStudent`, with `role = 'landlord'` (HARDCODED).
 *
 * NOTE: DATABASE_SCHEMA.md §4.2 mentions a corresponding `landlords` row
 * is also created at registration. Phase 4 (Landlord Verification) owns
 * the `landlords` table migration — it does NOT exist yet at Phase 2.
 * The current Server Action creates ONLY the `profiles` row; Phase 4 will
 * extend this to also create the `landlords` row. This is NOT a deviation:
 * the `landlords` table doesn't exist yet, so attempting to write to it
 * now would fail at the database level.
 */
export async function registerLandlord(
  rawInput: unknown,
): Promise<{ user: AuthenticatedUser }> {
  const supabase = await createSessionClient();
  const privileged = createPrivilegedClient();
  return registerLandlordCore(supabase, privileged, rawInput);
}

// ── Login / Logout ──────────────────────────────────────────────────────────

/**
 * `auth.login` — API_CONTRACTS.md §3.
 *
 * Returns a generic "Invalid credentials" message on failure (never
 * reveals which of email/password was wrong, to prevent enumeration).
 *
 * A suspended account CAN still authenticate here — the suspension check
 * is enforced by `requireAccountActive()` on state-changing actions.
 */
export async function login(
  rawInput: unknown,
): Promise<{ user: AuthenticatedUser }> {
  // Phase 12 — rate-limit login per API_CONTRACTS.md §22 (brute-force protection).
  // Two independent limits: IP-based (10/min) and account-based (5/min).
  // Either limit triggering blocks the request.
  //
  // NOTE: production should ALSO configure Vercel middleware-level rate
  // limiting (the InMemoryRateLimiter is per-process only — see
  // src/server/ratelimit/rate-limiter.ts for the production caveat).
  const clientIp = await getClientIp();
  await assertRateLimit("login", `ip:${clientIp}`, 10, 60_000);

  // Account-based limit — extract email from input (validated by Zod
  // in loginCore; here we do a soft extraction for rate-limit keying only).
  if (typeof rawInput === "object" && rawInput !== null && "email" in rawInput) {
    const email = String((rawInput as { email: unknown }).email ?? "unknown");
    await assertRateLimit("login", `account:${email.toLowerCase()}`, 5, 60_000);
  }

  const supabase = await createSessionClient();
  return loginCore(supabase, rawInput);
}

/**
 * `auth.logout` — API_CONTRACTS.md §3. Idempotent.
 */
export async function logout(): Promise<{ success: true }> {
  const supabase = await createSessionClient();
  return logoutCore(supabase);
}

// ── Password reset ──────────────────────────────────────────────────────────

/**
 * `auth.requestPasswordReset` — API_CONTRACTS.md §3.
 *
 * Always returns success — never reveals whether the email exists.
 */
export async function requestPasswordReset(
  rawInput: unknown,
): Promise<{ success: true }> {
  const supabase = await createSessionClient();
  return requestPasswordResetCore(supabase, rawInput);
}

// ── Profile management ──────────────────────────────────────────────────────

/**
 * `profile.getOwn` — API_CONTRACTS.md §3.
 */
export async function getOwnProfile(): Promise<AuthenticatedUser> {
  return requireAuthenticated();
}

/**
 * `profile.updateOwn` — API_CONTRACTS.md §3.
 *
 * Accepts ONLY: fullName, phone, universityId. The schema's `.strict()`
 * rejects `role` / `accountStatus` with a validation_error.
 */
export async function updateOwnProfile(
  rawInput: unknown,
): Promise<{ user: AuthenticatedUser }> {
  const supabase = await createSessionClient();
  return updateOwnProfileCore(supabase, rawInput);
}

/**
 * `auth.getSession` — API_CONTRACTS.md §3.
 */
export async function getSession(): Promise<AuthenticatedUser> {
  return requireAuthenticated();
}
