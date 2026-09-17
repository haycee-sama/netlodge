/**
 * Server-only Storage Server Actions.
 *
 * Phase 3 — thin Next.js Server Action wrapper around the pure functions
 * in `./core.ts`. Creates real Supabase clients (session-scoped for auth
 * + privileged for storage operations) and delegates to the core.
 *
 * The `server-only` import guard at the top of this file makes it
 * impossible to import these actions from a Client Component at build time.
 *
 * Authorization is enforced by:
 *   1. `requireAuthenticated()` / `requireAccountActive()` (from Phase 2) —
 *      establishes the caller's identity + active account.
 *   2. The core functions (`requestVerificationDocumentUploadUrlCore` etc.) —
 *      enforce role + ownership checks.
 *
 * Together these provide the per-call authorization required by
 * TECHNICAL_ARCHITECTURE.md §10.
 */
import "server-only";
import { createPrivilegedClient } from "@/server/supabase/privileged";
import { requireAuthenticated } from "@/server/auth/authorize";
import {
  requestVerificationDocumentUploadUrlCore,
  confirmVerificationDocumentUploadCore,
  requestVerificationDocumentDownloadUrlCore,
  deleteVerificationDocumentCore,
} from "@/server/storage/core";
import type {
  RequestVerificationUploadUrlResult,
  ConfirmVerificationUploadResult,
  RequestVerificationDownloadUrlResult,
  VerificationDocumentKindInput,
} from "@/server/storage/core";

// ── Verification-document upload URL ────────────────────────────────────────

/**
 * `verification.requestDocumentUploadUrl` — API_CONTRACTS.md §7.
 *
 * Issues a short-lived signed upload URL for the **private**
 * `verification-documents` bucket. File type restricted to image/PDF,
 * size-limited (configurable, default 5MB).
 *
 * Authorization:
 *   - Caller must be an authenticated landlord with an active account.
 *   - The landlordId encoded in the storage path is derived from the
 *     authenticated session — NEVER from the client request body.
 */
export async function requestVerificationDocumentUploadUrl(
  input: {
    kind: VerificationDocumentKindInput;
    mimeType: string;
    sizeBytes: number;
  },
): Promise<RequestVerificationUploadUrlResult> {
  const user = await requireAuthenticated();
  const storage = createPrivilegedClient();
  return requestVerificationDocumentUploadUrlCore(storage, user, input);
}

/**
 * `verification.confirmDocumentUpload` — companion to the above.
 *
 * Called by the client AFTER the file has been PUT to the signed upload
 * URL. The server verifies the object actually exists in Storage and
 * returns the metadata Phase 4 needs to write the `landlord_verifications`
 * row.
 *
 * Phase 4's `verification.submit` Server Action will consume the returned
 * `path` and store it on the new `landlord_verifications.submitted_id_reference`
 * (or `submitted_ownership_reference` depending on `kind`).
 */
export async function confirmVerificationDocumentUpload(
  input: {
    path: string;
    kind: VerificationDocumentKindInput;
  },
): Promise<ConfirmVerificationUploadResult> {
  const user = await requireAuthenticated();
  const storage = createPrivilegedClient();
  return confirmVerificationDocumentUploadCore(storage, user, input);
}

// ── Verification-document download URL ─────────────────────────────────────

/**
 * `adminVerification.getDocumentUrl` (admin path) — API_CONTRACTS.md §7.
 *
 * Also handles the landlord-own-document case (a landlord reviewing their
 * own submission) per API_CONTRACTS.md §7's note: "an equivalent
 * landlord-own-document contract if the landlord needs to review their own
 * submission (same short-lived-signed-URL pattern, own-submission-only)."
 *
 * PER-CALL AUTHORIZATION (Phase 3 task spec §11):
 *   This Server Action re-checks authorization on EVERY request — there is
 *   no caching. Even if a landlord was authorized yesterday, if their
 *   account is suspended today, this function will reject the request.
 */
export async function requestVerificationDocumentDownloadUrl(
  input: { path: string },
): Promise<RequestVerificationDownloadUrlResult> {
  const user = await requireAuthenticated();
  const storage = createPrivilegedClient();
  return requestVerificationDocumentDownloadUrlCore(storage, user, input);
}

// ── Verification-document admin-triggered deletion ─────────────────────────

/**
 * Admin-only: delete a verification document from Storage.
 *
 * Per Phase 3 task spec §13: "manual admin-triggered deletion only. Do NOT
 * implement automatic retention deletion yet."
 *
 * This deletes ONLY the Storage object — the DB row in `landlord_verifications`
 * (Phase 4's table) is NOT touched. Phase 4+ may surface a separate admin
 * operation to clear the `submitted_id_reference` column if needed.
 *
 * Authorization: caller must be an authenticated admin.
 */
export async function deleteVerificationDocument(
  input: { path: string },
): Promise<{ path: string; deleted: true }> {
  const user = await requireAuthenticated();
  const storage = createPrivilegedClient();
  return deleteVerificationDocumentCore(storage, user, input);
}
