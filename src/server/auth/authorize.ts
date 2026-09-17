/**
 * Server-only authorization layer.
 *
 * Phase 2 — small, explicit helpers for use by every Server Action and Route
 * Handler that needs to enforce authentication or authorization.
 *
 * Per TECHNICAL_ARCHITECTURE.md §7: authorization happens in Next.js
 * server-side code (not RLS alone, not client-side checks). These helpers
 * are the canonical way to enforce it.
 *
 * Separation of concerns:
 *   - Authentication (who is this user?)  → getCurrentSession()
 *   - Authorization (what can they do?)    → requireRole / requireAccountActive
 *
 * Each helper throws an `AppError` (from `src/errors`) on failure, so
 * callers can just `await requireRole("admin")` at the top of a Server
 * Action without try/catch — the error propagates to Next.js's error
 * boundary which serializes it via the standardized error model
 * (API_CONTRACTS.md §19).
 *
 * The `server-only` import guard prevents client-side usage.
 */
import "server-only";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import type { AuthenticatedUser } from "@/lib/auth";
import { AppError, unauthenticatedError, forbiddenError } from "@/errors";

/**
 * Retrieve the currently-authenticated user + their profile, or null if
 * not authenticated.
 *
 * Two-step lookup:
 *   1. `getSession()` on the session-scoped server client (RLS-enforced).
 *   2. If a session exists, SELECT the matching `profiles` row via the
 *      same session-scoped client (RLS: id = auth.uid() — only the user's
 *      own row is returned).
 *
 * Returns null if:
 *   - no session
 *   - session exists but no `profiles` row exists (rare; partial
 *     registration failure that cleanup didn't catch)
 *
 * Never throws on auth failure — returns null. Callers that need to
 * enforce auth should use `requireAuthenticated()` instead.
 */
export async function getCurrentSession(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createSessionClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return null;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id, role, full_name, phone, university_id, account_status, suspension_reason",
      )
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      // Don't leak Supabase internals. Log server-side, return null.
      console.error("[netlodge] getCurrentSession: profile lookup failed", {
        userId: session.user.id,
      });
      return null;
    }

    if (!profile) return null;

    return {
      id: session.user.id,
      email: session.user.email ?? "",
      emailVerified: session.user.email_confirmed_at !== null,
      profile: {
        id: profile.id,
        role: profile.role,
        fullName: profile.full_name,
        phone: profile.phone,
        universityId: profile.university_id,
        accountStatus: profile.account_status,
        suspensionReason: profile.suspension_reason,
      },
    };
  } catch {
    // Supabase unreachable or session lookup failed — return null (anonymous).
    return null;
  }
}

/**
 * Require an authenticated session — throws `unauthenticated` if none
 * exists, otherwise returns the authenticated user.
 *
 * Used by every protected Server Action as the first check.
 */
export async function requireAuthenticated(): Promise<AuthenticatedUser> {
  const user = await getCurrentSession();
  if (!user) {
    throw unauthenticatedError();
  }
  return user;
}

/**
 * Require the account be active — throws `forbidden` (with a clear message)
 * if the account is suspended.
 *
 * Per TECHNICAL_ARCHITECTURE.md §6: "authentication succeeding is not the
 * same as being authorized to act". A suspended account can log in (so the
 * user can see their dashboard and the suspension notice) but cannot
 * perform any state-changing application action.
 *
 * The error message explicitly mentions suspension — this is NOT a leak
 * of internal system structure; the user owns their own account_status and
 * seeing "your account is suspended" is appropriate UX, not a security
 * disclosure.
 */
export async function requireAccountActive(): Promise<AuthenticatedUser> {
  const user = await requireAuthenticated();
  if (user.profile.accountStatus === "suspended") {
    throw new AppError({
      code: "forbidden",
      message:
        "Your account is suspended and cannot perform this action. " +
        (user.profile.suspensionReason
          ? `Reason: ${user.profile.suspensionReason}. `
          : "") +
        "Contact support if you believe this is an error.",
    });
  }
  return user;
}

/**
 * Require a specific role — throws `forbidden` if the current user's role
 * doesn't match any of the allowed roles.
 *
 * Multiple allowed roles can be passed:
 *   await requireRole("admin");                    // admin only
 *   await requireRole("landlord", "admin");         // landlord or admin
 *
 * The error message is intentionally generic ("You do not have permission
 * to do this.") per API_CONTRACTS.md §19 — never reveal which check failed
 * in a way that leaks system structure.
 */
export async function requireRole(
  ...allowedRoles: Array<"student" | "landlord" | "admin">
): Promise<AuthenticatedUser> {
  const user = await requireAuthenticated();
  if (!allowedRoles.includes(user.profile.role)) {
    throw forbiddenError();
  }
  return user;
}
