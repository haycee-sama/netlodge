/**
 * Server-only Audit log Server Actions — Phase 10.
 *
 * Thin Next.js Server Action wrapper around the read-only `listAuditLogsCore`.
 *
 * There is NO `createAuditLog` / `updateAuditLog` / `deleteAuditLog` Server
 * Action — by design. Audit rows are inserted ONLY by SECURITY DEFINER
 * admin mutation functions inside their atomic transaction (migration 0009).
 */
import "server-only";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { requireAccountActive } from "@/server/auth/authorize";
import { listAuditLogsCore } from "@/server/audit/core";
import type { AdminListResult, AdminAuditLogRow } from "@/lib/admin/schemas";

/**
 * `adminAuditLogs.list` — API_CONTRACTS.md §17.
 *
 * Authorization: authenticated admin with an active account.
 *
 * A suspended admin cannot read audit logs — admin monitoring is a
 * state-changing-adjacent capability and PRD §8 explicitly restricts
 * suspended accounts to "view read-only history" of THEIR OWN data
 * (bookings/payments), not admin monitoring.
 */
export async function listAuditLogs(
  input: unknown,
): Promise<AdminListResult<AdminAuditLogRow>> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return listAuditLogsCore(db, user, input);
}
