/**
 * Server-only Admin Server Actions — Phase 10.
 *
 * Thin Next.js Server Action wrappers around the admin core functions.
 *
 * Authorization layering (defense in depth, per TECHNICAL_ARCHITECTURE.md §21):
 *   1. `requireAccountActive()` — establishes authenticated + active admin
 *      identity. Suspended admins are blocked here.
 *   2. Core function — checks `user.profile.role === "admin"` (defense
 *      against any non-admin somehow passing step 1, e.g., a student
 *      with an active account).
 *   3. SECURITY DEFINER RPC function (migration 0009) — independently
 *      re-validates caller as active admin via
 *      `netlodge_is_current_user_active_admin()`. This is the layer that
 *      blocks DIRECT PostgREST invocation by non-admins (the test that
 *      Phase 10 §46 requires).
 *
 * The `server-only` import guard prevents client-side usage.
 */
import "server-only";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { requireAccountActive } from "@/server/auth/authorize";
// Re-export the property approve/reject Server Actions from the properties
// module — they're defined there because they were originally Phase 5
// operations and Phase 10 simply refactored them to use the new atomic
// SECURITY DEFINER RPC functions (migration 0009).
export { approveProperty, rejectProperty } from "@/server/properties/actions";
import {
  suspendPropertyCore,
  liftSuspensionPropertyCore,
  listBookingsAdminCore,
  listPaymentsAdminCore,
  listWebhookEventsAdminCore,
} from "@/server/admin/core";
import type {
  AdminListResult,
  AdminBookingRow,
  AdminPaymentRow,
  AdminWebhookEventRow,
} from "@/lib/admin/schemas";

// ── Admin: suspend / lift suspension ────────────────────────────────────────

export async function suspendProperty(input: unknown): Promise<void> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return suspendPropertyCore(db, user, input);
}

export async function liftSuspensionProperty(input: unknown): Promise<void> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return liftSuspensionPropertyCore(db, user, input);
}

// ── Admin: monitoring reads (bookings / payments / webhook events) ──────────

export async function listBookingsAdmin(
  input: unknown,
): Promise<AdminListResult<AdminBookingRow>> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return listBookingsAdminCore(db, user, input);
}

export async function listPaymentsAdmin(
  input: unknown,
): Promise<AdminListResult<AdminPaymentRow>> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return listPaymentsAdminCore(db, user, input);
}

export async function listWebhookEventsAdmin(
  input: unknown,
): Promise<AdminListResult<AdminWebhookEventRow>> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return listWebhookEventsAdminCore(db, user, input);
}
