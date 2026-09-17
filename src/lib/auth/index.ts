/**
 * Auth-related shared types and re-exports (client + server, non-privileged).
 *
 * Phase 2 implements the auth boundary per API_CONTRACTS.md §3 and
 * TECHNICAL_ARCHITECTURE.md §6:
 *
 *   - Two distinct registration Server Actions (`auth.registerStudent`,
 *     `auth.registerLandlord`) with role HARDCODED per flow — never read
 *     from client input. This is the single most important line of code
 *     in the auth phase.
 *   - The `profiles` row is created immediately following successful
 *     `auth.users` creation — no window where an authenticated session has
 *     no matching profile.
 *   - The Phase 1 column-guard trigger is the database-level second line
 *     of defense against role escalation.
 *   - Admin accounts are never self-registered — provisioned via one-time
 *     bootstrap or existing-admin Server Action (Phase 10+).
 *
 * The schemas themselves live in `./schemas.ts` so client components can
 * import them for UX-only client-side validation without dragging in
 * server-only code. The actual registration Server Actions live in
 * `src/server/auth/actions.ts` (server-only).
 */

/**
 * Authenticated identity — the canonical shape returned by `getSession()`.
 *
 * Mirrors `profiles` Row plus a few auth-side fields the client legitimately
 * needs (email, emailVerified). Never includes credentials or session
 * tokens — those stay in the HTTP-only cookie managed by Supabase SSR.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  emailVerified: boolean;
  profile: {
    id: string;
    role: "student" | "landlord" | "admin";
    fullName: string;
    phone: string;
    universityId: string | null;
    accountStatus: "active" | "suspended";
    suspensionReason: string | null;
  };
}

export {
  registerStudentSchema,
  registerLandlordSchema,
  loginSchema,
  requestPasswordResetSchema,
  profileUpdateSchema,
  hasForbiddenProfileField,
  FORBIDDEN_PROFILE_FIELDS,
} from "./schemas";

export type {
  RegisterStudentInput,
  RegisterLandlordInput,
  LoginInput,
  RequestPasswordResetInput,
  ProfileUpdateInput,
} from "./schemas";
