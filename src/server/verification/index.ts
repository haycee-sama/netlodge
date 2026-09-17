/**
 * Server-only verification boundary — public API.
 *
 * Phase 4 — re-exports the verification core + Server Actions. Consumers
 * should import from this single entry point.
 *
 * Per API_CONTRACTS.md §7 + DATABASE_SCHEMA.md §4.2/§4.3 + Phase 4 task
 * spec, the verification boundary enforces:
 *   - Landlord identity always derived from session (never from input).
 *   - Append-only history (DB-level trigger + RLS).
 *   - State machine (DB-level trigger + application check).
 *   - Atomic status sync (DB-level trigger).
 *   - Admin-only approval/rejection (role check + trigger).
 *   - Suspended-account enforcement (Phase 2's requireAccountActive).
 *
 * The `server-only` import guard prevents client-side usage.
 */
import "server-only";

export {
  submitVerificationCore,
  getOwnStatusCore,
  getOwnHistoryCore,
  getVerificationQueueCore,
  getDocumentUrlCore,
  approveVerificationCore,
  rejectVerificationCore,
} from "./core";
export type {
  SupabaseDbClient,
  LandlordVerificationStatus,
  VerificationHistoryEntry,
  VerificationQueueEntry,
  VerificationQueuePage,
  SignedDocumentUrlResult,
} from "./core";

export {
  submitVerification,
  getOwnVerificationStatus,
  getOwnVerificationHistory,
  getVerificationQueue,
  getVerificationDocumentUrl,
  approveVerification,
  rejectVerification,
} from "./actions";

// Re-export the landlord provisioning helper used by Phase 2's
// registerLandlord (updated in Phase 4 to also create the landlords row).
export { provisionLandlordRowCore } from "./provision";
