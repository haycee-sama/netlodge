/**
 * Server-only auth boundary — public API.
 *
 * Phase 2 — re-exports the authorization helpers and Server Actions
 * implemented in `./authorize.ts` and `./actions.ts`. Consumers should
 * import from this single entry point.
 *
 * Per TECHNICAL_ARCHITECTURE.md §7, every protected Server Action should
 * call `requireAuthenticated()` / `requireRole()` / `requireAccountActive()`
 * at its top to enforce the auth boundary.
 *
 * The `server-only` import guard prevents client-side usage.
 */
import "server-only";

export {
  getCurrentSession,
  requireAuthenticated,
  requireAccountActive,
  requireRole,
} from "./authorize";

export {
  registerStudent,
  registerLandlord,
  login,
  logout,
  requestPasswordReset,
  getSession,
  getOwnProfile,
  updateOwnProfile,
} from "./actions";
