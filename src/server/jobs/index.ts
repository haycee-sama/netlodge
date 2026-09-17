/**
 * Server-only scheduled-job boundary — public API.
 *
 * Phase 8 — re-exports the expiry core + Server Action.
 *
 * Per TECHNICAL_ARCHITECTURE.md §15 / IMPLEMENTATION_PLAN.md §11:
 *   - The reservation expiration job runs as a Supabase scheduled Edge
 *     Function (pg_cron) every 1-2 minutes.
 *   - It updates all bookings where status IN ('reservation_pending',
 *     'payment_pending') AND hold_expires_at < now() to status = 'expired'.
 *   - The WHERE clause is naturally idempotent.
 *   - Expired bookings fall outside the partial unique index, releasing
 *     the room for new bookings.
 *   - No separate "release" step is needed.
 *
 * The `server-only` import guard prevents client-side usage.
 */
import "server-only";

export type { SupabaseDbClient, ExpireBookingsResult } from "./core";
export { expireBookingsCore } from "./core";
export { expireBookings } from "./actions";
