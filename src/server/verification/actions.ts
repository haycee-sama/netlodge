/**
 * Server-only Verification Server Actions.
 *
 * Phase 4 — thin Next.js Server Action wrapper around the pure functions
 * in `./core.ts`. Creates real Supabase clients and delegates to the core.
 *
 * The `server-only` import guard at the top of this file makes it
 * impossible to import these actions from a Client Component at build time.
 *
 * Authorization is enforced by:
 *   1. `requireAuthenticated()` / `requireAccountActive()` (from Phase 2) —
 *      establishes the caller's identity + active account.
 *   2. The core functions — enforce role + ownership + state-machine checks.
 *   3. Database triggers (migration 0005) — defense-in-depth at the DB
 *      level (append-only, state machine, status sync).
 */
import "server-only";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { createPrivilegedClient } from "@/server/supabase/privileged";
import { requireAuthenticated, requireAccountActive } from "@/server/auth/authorize";
import {
  submitVerificationCore,
  getOwnStatusCore,
  getOwnHistoryCore,
  getVerificationQueueCore,
  getDocumentUrlCore,
  approveVerificationCore,
  rejectVerificationCore,
} from "@/server/verification/core";
import type {
  LandlordVerificationStatus,
  VerificationHistoryEntry,
  VerificationQueuePage,
  SignedDocumentUrlResult,
} from "@/server/verification/core";

// ── Landlord: submit verification ────────────────────────────────────────────

/**
 * `verification.submit` — API_CONTRACTS.md §7.
 *
 * Creates a new landlord_verifications row with status='submitted'.
 * Append-only — never modifies an existing row.
 *
 * Authorization: authenticated landlord with active account.
 */
export async function submitVerification(
  input: unknown,
): Promise<{ verificationId: string; status: "submitted" }> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  const storage = createPrivilegedClient();
  return submitVerificationCore(db, storage, user, input);
}

// ── Landlord: get own status ─────────────────────────────────────────────────

/**
 * `verification.getOwnStatus` — API_CONTRACTS.md §7.
 *
 * Authorization: authenticated landlord.
 */
export async function getOwnVerificationStatus(): Promise<LandlordVerificationStatus> {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return getOwnStatusCore(db, user);
}

// ── Landlord: get own history ────────────────────────────────────────────────

/**
 * `verification.getOwnHistory` — API_CONTRACTS.md §7.
 *
 * Authorization: authenticated landlord.
 */
export async function getOwnVerificationHistory(): Promise<{
  history: VerificationHistoryEntry[];
}> {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return getOwnHistoryCore(db, user);
}

// ── Admin: get verification queue ───────────────────────────────────────────

/**
 * `adminVerification.getQueue` — API_CONTRACTS.md §7.
 *
 * Authorization: authenticated admin with an active account.
 *
 * Phase 10 — switched from `requireAuthenticated()` to
 * `requireAccountActive()` so suspended admins can no longer view the
 * admin verification queue (consistent with PRD §8: "A suspended account
 * can log in to view read-only history but cannot perform state-changing
 * actions"; admin monitoring is a state-changing-adjacent capability,
 * not the user's own read-only history).
 */
export async function getVerificationQueue(
  input: unknown,
): Promise<VerificationQueuePage> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return getVerificationQueueCore(db, user, input);
}

// ── Admin: get document URL ─────────────────────────────────────────────────

/**
 * `adminVerification.getDocumentUrl` — API_CONTRACTS.md §7.
 *
 * Authorization: authenticated admin with an active account.
 *
 * Phase 10 — `requireAccountActive()` (suspended admins cannot access
 * verification document URLs).
 */
export async function getVerificationDocumentUrl(
  input: unknown,
): Promise<SignedDocumentUrlResult> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  const storage = createPrivilegedClient();
  return getDocumentUrlCore(db, storage, user, input);
}

// ── Admin: approve ───────────────────────────────────────────────────────────

/**
 * `adminVerification.approve` — API_CONTRACTS.md §7.
 *
 * Authorization: authenticated admin with an active account. Phase 10
 * — `requireAccountActive()` (suspended admins cannot approve
 * verifications). The actual mutation + audit log insert is performed
 * atomically by the `admin_approve_verification` SECURITY DEFINER
 * function (migration 0009), which independently re-validates caller
 * authorization.
 */
export async function approveVerification(
  input: unknown,
): Promise<{ verificationId: string; status: "approved" }> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return approveVerificationCore(db, user, input);
}

// ── Admin: reject ───────────────────────────────────────────────────────────

/**
 * `adminVerification.reject` — API_CONTRACTS.md §7.
 *
 * Authorization: authenticated admin with an active account. Phase 10
 * — `requireAccountActive()`. Atomic mutation + audit log via the
 * `admin_reject_verification` SECURITY DEFINER function.
 */
export async function rejectVerification(
  input: unknown,
): Promise<{
  verificationId: string;
  status: "rejected";
  decisionReason: string;
}> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return rejectVerificationCore(db, user, input);
}
