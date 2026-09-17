/**
 * Server-only scheduled-job Server Actions — Phase 8.
 *
 * Thin wrapper around the pure functions in `./core.ts`. Creates real
 * Supabase clients (privileged for system operations) and delegates to
 * the core.
 *
 * The `server-only` import guard prevents client-side usage.
 *
 * In production, this function would be invoked by a Supabase scheduled
 * Edge Function (pg_cron) every 1-2 minutes per TECHNICAL_ARCHITECTURE.md §15.
 * The Edge Function would call this server action (or directly execute the
 * SQL query) using the service-role key.
 *
 * Phase 8 does NOT implement the actual Edge Function deployment or
 * pg_cron scheduling — that requires a real Supabase project. The server-side
 * expiry logic is fully implemented and tested.
 */
import "server-only";
import { createPrivilegedClient } from "@/server/supabase/privileged";
import { expireBookingsCore } from "@/server/jobs/core";
import type { ExpireBookingsResult } from "@/server/jobs/core";

/**
 * Expire all bookings whose hold window has passed.
 *
 * Uses the privileged (service-role) Supabase client, which bypasses RLS.
 * The Phase 7 state-machine trigger allows the expiry transition
 * (reservation_pending → expired, payment_pending → expired) only for
 * service-role (auth.uid() IS NULL).
 *
 * This function is idempotent — running it twice affects 0 rows on the
 * second run (expired bookings no longer match the WHERE clause).
 *
 * In production, this would be called by a Supabase scheduled Edge Function
 * every 1-2 minutes.
 */
export async function expireBookings(): Promise<ExpireBookingsResult> {
  const db = createPrivilegedClient();
  return expireBookingsCore(db);
}
