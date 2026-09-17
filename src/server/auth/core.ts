/**
 * Server-only auth core logic.
 *
 * Phase 2 — pure functions implementing the registration, login, logout,
 * password-reset, and profile-management logic. Each function takes its
 * Supabase client dependencies as parameters, making them testable without
 * requiring a Next.js request context (the `actions.ts` wrapper handles
 * that part).
 *
 * CRITICAL SECURITY PROPERTY (restated here because it is the single most
 * important rule in this file):
 *
 *   Role is HARDCODED per registration flow:
 *     - `registerStudentCore`  → always creates `profiles.role = 'student'`
 *     - `registerLandlordCore`  → always creates `profiles.role = 'landlord'`
 *
 *   The role is NEVER read from client input. The Zod schemas use `.strict()`
 *   so submitting `role: "admin"` produces a `validation_error`. The Phase 1
 *   column-guard trigger is the database-level second line of defense.
 *
 * Why this file does NOT import `server-only`:
 *   This module is imported by `actions.ts` (which DOES import `server-only`),
 *   and by tests. Tests run in Node (not the browser), so the `server-only`
 *   guard would be unnecessary here — but more importantly, importing
 *   `server-only` from this file would make the tests fail because the
 *   test environment can't always resolve it. The auth boundary is enforced
 *   by `actions.ts` (which IS `server-only` guarded).
 *
 * However, callers of this module should still treat it as server-only —
 * it never executes in the browser in production because its only production
 * caller is `actions.ts`.
 */
import {
  registerStudentSchema,
  registerLandlordSchema,
  loginSchema,
  requestPasswordResetSchema,
  profileUpdateSchema,
} from "@/lib/auth/schemas";
import type { AuthenticatedUser } from "@/lib/auth";
import {
  AppError,
  validationError,
  conflictError,
  unauthenticatedError,
  internalError,
} from "@/errors";
import { formatZodError } from "@/validation";
// Phase 4: import the landlord-row provisioning helper. This creates a
// dependency from auth core → verification provision module. The provision
// module is intentionally a leaf module (no further auth imports) to avoid
// a circular dependency.
import { provisionLandlordRowCore } from "@/server/verification/provision";

/**
 * Subset of the Supabase client used by the auth actions. Defined as a
 * loose structural interface — the actual Supabase client's complex
 * PostgrestBuilder typing causes TypeScript to recurse infinitely when
 * matched against a strict custom interface, so we use `unknown`-typed
 * chain methods and rely on the runtime behavior (which is well-tested).
 *
 * Tests pass a mock implementation that satisfies this same shape.
 */
export interface SupabaseSessionClient {
  auth: {
    getSession(): Promise<{
      data: {
        session: {
          user: {
            id: string;
            email?: string;
            email_confirmed_at?: string | null;
          };
        } | null;
      };
      error: unknown;
    }>;
    signUp(params: {
      email: string;
      password: string;
    }): Promise<{
      data: {
        user: {
          id: string;
          email?: string;
        } | null;
      };
      error: { message: string; status?: number } | null;
    }>;
    signInWithPassword(params: {
      email: string;
      password: string;
    }): Promise<{
      data: {
        user: {
          id: string;
          email?: string;
        } | null;
      };
      error: { message: string; status?: number } | null;
    }>;
    signOut(): Promise<{ error: unknown }>;
    resetPasswordForEmail(
      email: string,
      options?: { redirectTo?: string },
    ): Promise<{ error: unknown }>;
  };
  // Loose-typed chain — actual Supabase client returns a thenable chain
  // (PostgrestBuilder) that is awaitable. Using `any` here is intentional:
  // the strict typing caused TS2589 (infinite recursion). The runtime
  // behavior is verified by integration tests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
}

/**
 * Subset of the Supabase admin/privileged client. Same loose typing pattern.
 */
export interface SupabasePrivilegedClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  auth: {
    admin: {
      deleteUser(userId: string): Promise<{ error: unknown }>;
    };
  };
}

// ── Session retrieval ───────────────────────────────────────────────────────

/**
 * Profile row shape returned by the session client's SELECT.
 */
interface ProfileRow {
  id: string;
  role: "student" | "landlord" | "admin";
  full_name: string;
  phone: string;
  university_id: string | null;
  account_status: "active" | "suspended";
  suspension_reason: string | null;
}

/**
 * Retrieve the currently-authenticated user + their profile, or null if
 * not authenticated.
 *
 * Pure function — takes the session client as a parameter so tests can
 * inject a mock.
 */
export async function getCurrentSessionCore(
  supabase: SupabaseSessionClient,
): Promise<AuthenticatedUser | null> {
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
    console.error("[netlodge] getCurrentSessionCore: profile lookup failed", {
      userId: session.user.id,
    });
    return null;
  }

  if (!profile) return null;

  const p = profile as ProfileRow;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    emailVerified: session.user.email_confirmed_at !== null,
    profile: {
      id: p.id,
      role: p.role,
      fullName: p.full_name,
      phone: p.phone,
      universityId: p.university_id,
      accountStatus: p.account_status,
      suspensionReason: p.suspension_reason,
    },
  };
}

// ── Registration ────────────────────────────────────────────────────────────

/**
 * Internal helper: create the `profiles` row with hardcoded role.
 *
 * Throws AppError on any failure. The caller is responsible for cleanup.
 */
export async function provisionProfileCore(
  privileged: SupabasePrivilegedClient,
  params: {
    userId: string;
    role: "student" | "landlord";
    fullName: string;
    phone: string;
    universityId?: string | null;
  },
): Promise<void> {
  const insertPayload = {
    id: params.userId,
    role: params.role, // ← HARDCODED
    full_name: params.fullName,
    phone: params.phone,
    university_id: params.universityId ?? null,
    account_status: "active",
  };

  const { error } = await privileged
    .from("profiles")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error("[netlodge] provisionProfileCore: INSERT failed", {
      userId: params.userId,
      role: params.role,
    });
    throw internalError(
      "We couldn't complete your registration. Please try again.",
      { phase: "provisionProfile", error },
    );
  }
}

/**
 * Internal helper: best-effort cleanup of an auth.users row after profile
 * provisioning failed.
 */
export async function cleanupAuthUserCore(
  privileged: SupabasePrivilegedClient,
  userId: string,
): Promise<void> {
  try {
    await privileged.auth.admin.deleteUser(userId);
  } catch (err) {
    console.error(
      "[netlodge] cleanupAuthUserCore: failed to delete stranded auth.users row",
      {
        userId,
        error: err instanceof Error ? err.message : String(err),
      },
    );
  }
}

/**
 * `auth.registerStudent` core — pure function.
 *
 * Creates a Supabase Auth user, then immediately provisions a `profiles`
 * row with `role = 'student'` (HARDCODED). On profile-provisioning failure,
 * attempts to clean up the just-created auth.users row.
 *
 * Returns `{ user: AuthenticatedUser }` if a session was established.
 * Throws `unauthenticated` (with "check your email" message) if signUp
 * succeeded but no session exists (e.g., email confirmation required).
 */
export async function registerStudentCore(
  supabase: SupabaseSessionClient,
  privileged: SupabasePrivilegedClient,
  rawInput: unknown,
): Promise<{ user: AuthenticatedUser }> {
  const parsed = registerStudentSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError(
      "Invalid registration input.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (signUpError) {
    if (
      signUpError.message.toLowerCase().includes("already") ||
      signUpError.message.toLowerCase().includes("registered") ||
      signUpError.status === 400
    ) {
      throw conflictError(
        "An account with this email may already exist. Try signing in instead.",
        "email_already_registered",
      );
    }
    throw internalError(
      "We couldn't create your account. Please try again.",
      { phase: "registerStudent.signUp", error: signUpError },
    );
  }

  const authUser = authData.user;
  if (!authUser) {
    throw internalError(
      "Registration did not produce a user record. Please try again.",
      { phase: "registerStudent.noUser" },
    );
  }

  try {
    await provisionProfileCore(privileged, {
      userId: authUser.id,
      role: "student", // ← HARDCODED — never from input
      fullName: input.fullName,
      phone: input.phone,
      universityId: input.universityId,
    });
  } catch (err) {
    await cleanupAuthUserCore(privileged, authUser.id);
    throw err;
  }

  const user = await getCurrentSessionCore(supabase);
  if (!user) {
    throw new AppError({
      code: "unauthenticated",
      message:
        "Account created. Please check your email to verify your account before signing in.",
    });
  }
  return { user };
}

/**
 * `auth.registerLandlord` core — pure function.
 *
 * Same pattern as registerStudentCore, with `role = 'landlord'` (HARDCODED).
 */
export async function registerLandlordCore(
  supabase: SupabaseSessionClient,
  privileged: SupabasePrivilegedClient,
  rawInput: unknown,
): Promise<{ user: AuthenticatedUser }> {
  const parsed = registerLandlordSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError(
      "Invalid registration input.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (signUpError) {
    if (
      signUpError.message.toLowerCase().includes("already") ||
      signUpError.message.toLowerCase().includes("registered") ||
      signUpError.status === 400
    ) {
      throw conflictError(
        "An account with this email may already exist. Try signing in instead.",
        "email_already_registered",
      );
    }
    throw internalError(
      "We couldn't create your account. Please try again.",
      { phase: "registerLandlord.signUp", error: signUpError },
    );
  }

  const authUser = authData.user;
  if (!authUser) {
    throw internalError(
      "Registration did not produce a user record. Please try again.",
      { phase: "registerLandlord.noUser" },
    );
  }

  try {
    await provisionProfileCore(privileged, {
      userId: authUser.id,
      role: "landlord", // ← HARDCODED — never from input
      fullName: input.fullName,
      phone: input.phone,
      universityId: null,
    });
    // Phase 4: also create the `landlords` row. This was deferred from
    // Phase 2 — Phase 4 owns the landlords table migration. The row is
    // created in the SAME logical operation as the profiles row; if it
    // fails, the catch block cleans up the auth.users row (which
    // cascades to profiles + landlords).
    await provisionLandlordRowCore(privileged, { landlordId: authUser.id });
  } catch (err) {
    await cleanupAuthUserCore(privileged, authUser.id);
    throw err;
  }

  const user = await getCurrentSessionCore(supabase);
  if (!user) {
    throw new AppError({
      code: "unauthenticated",
      message:
        "Account created. Please check your email to verify your account before signing in.",
    });
  }
  return { user };
}

// ── Login / Logout ──────────────────────────────────────────────────────────

/**
 * `auth.login` core — pure function.
 *
 * Returns a generic "Invalid email or password" error on failure (never
 * reveals which of email/password was wrong). A suspended account CAN
 * still authenticate here — the suspension check is enforced by
 * `requireAccountActive()` on state-changing actions, NOT at login time.
 */
export async function loginCore(
  supabase: SupabaseSessionClient,
  rawInput: unknown,
): Promise<{ user: AuthenticatedUser }> {
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError(
      "Invalid login input.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    console.warn("[netlodge] loginCore: failed login attempt", {
      email: input.email,
    });
    throw new AppError({
      code: "unauthenticated",
      message: "Invalid email or password.",
    });
  }

  const user = await getCurrentSessionCore(supabase);
  if (!user) {
    throw unauthenticatedError(
      "Your account is missing required profile data. Please contact support.",
    );
  }
  return { user };
}

/**
 * `auth.logout` core — pure function. Idempotent.
 */
export async function logoutCore(
  supabase: SupabaseSessionClient,
): Promise<{ success: true }> {
  await supabase.auth.signOut();
  return { success: true };
}

/**
 * `auth.requestPasswordReset` core — pure function. Always returns success
 * (never reveals whether the email exists).
 */
export async function requestPasswordResetCore(
  supabase: SupabaseSessionClient,
  rawInput: unknown,
): Promise<{ success: true }> {
  const parsed = requestPasswordResetSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError(
      "Invalid password-reset request.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/account/password`,
  });

  return { success: true };
}

// ── Profile management ──────────────────────────────────────────────────────

/**
 * `profile.updateOwn` core — pure function.
 *
 * Accepts ONLY: fullName, phone, universityId. The schema's `.strict()`
 * rejects `role` / `accountStatus` with a validation_error.
 *
 * Requires `account_status = 'active'` — suspended accounts cannot update
 * their profile.
 */
export async function updateOwnProfileCore(
  supabase: SupabaseSessionClient,
  rawInput: unknown,
): Promise<{ user: AuthenticatedUser }> {
  const parsed = profileUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError(
      "Invalid profile update.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  // 1. Require authenticated + active account.
  const currentUser = await getCurrentSessionCore(supabase);
  if (!currentUser) {
    throw unauthenticatedError();
  }
  if (currentUser.profile.accountStatus === "suspended") {
    throw new AppError({
      code: "forbidden",
      message:
        "Your account is suspended and cannot perform this action. " +
        (currentUser.profile.suspensionReason
          ? `Reason: ${currentUser.profile.suspensionReason}. `
          : "") +
        "Contact support if you believe this is an error.",
    });
  }

  // 2. Build the update payload — only the fields present in the input.
  const update: Record<string, unknown> = {};
  if (input.fullName !== undefined) update.full_name = input.fullName;
  if (input.phone !== undefined) update.phone = input.phone;
  if (input.universityId !== undefined) {
    update.university_id = input.universityId;
  }

  if (Object.keys(update).length === 0) {
    return { user: currentUser };
  }

  // 3. Execute the update via the session-scoped server client (RLS-enforced).
  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", currentUser.id);

  if (error) {
    throw internalError("Profile update failed. Please try again.", {
      phase: "updateOwnProfile",
      error,
    });
  }

  const user = await getCurrentSessionCore(supabase);
  if (!user) throw unauthenticatedError();
  return { user };
}
