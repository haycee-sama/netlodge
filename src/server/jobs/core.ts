/**
 * Reservation expiration core — testable pure function.
 *
 * Phase 8 — implements the reservation expiration job per
 * IMPLEMENTATION_PLAN.md §11 + TECHNICAL_ARCHITECTURE.md §15.
 *
 * The expiration operation:
 *   UPDATE bookings SET status = 'expired'
 *   WHERE status IN ('reservation_pending', 'payment_pending')
 *     AND hold_expires_at < now();
 *
 * CRITICAL PROPERTIES:
 *
 *   1. IDEMPOTENT: The WHERE clause only matches rows with status IN
 *      ('reservation_pending', 'payment_pending'). Once a row is 'expired',
 *      it no longer matches. Running the query twice affects 0 rows on
 *      the second run.
 *
 *   2. SYSTEM-AUTHORIZED: The expiry transition (reservation_pending → expired,
 *      payment_pending → expired) is allowed by the Phase 7 state-machine
 *      trigger ONLY for service-role (auth.uid() IS NULL). The privileged
 *      Supabase client bypasses RLS, so auth.uid() returns NULL. No
 *      authenticated client can perform this transition.
 *
 *   3. ROOM RELEASE: When a booking's status changes to 'expired', it
 *      falls OUTSIDE the partial unique index's WHERE clause
 *      (status IN ('reservation_pending', 'payment_pending', 'confirmed')).
 *      The room immediately becomes eligible for a new active booking.
 *      No separate "release" step is needed.
 *
 *   4. NO DELETION: Expired bookings are NOT deleted — they remain as
 *      historical records per DATABASE_SCHEMA.md §4.9.
 *
 *   5. FAILURE RECOVERY: A missed or failed run has no permanent consequence.
 *      The next run's time-based WHERE clause catches everything that should
 *      have expired, regardless of how many runs were missed.
 *
 * This function does NOT import `server-only` — the auth boundary is enforced
 * by the actions wrapper (`./actions.ts` which DOES import `server-only`)
 * and by the database trigger (which checks auth.uid() IS NULL for the
 * expiry transition). Tests can import this core function directly.
 */
import { internalError } from "@/errors";

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * Loose-typed Supabase client (same pattern as Phase 2/4/5/7).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseDbClient = { from(table: string): any };

/**
 * Result of the expiration operation.
 */
export interface ExpireBookingsResult {
  /** Number of bookings that were expired in this run. */
  expiredCount: number;
  /** Whether the operation completed successfully. */
  success: boolean;
}

// ── Expire bookings ────────────────────────────────────────────────────────

/**
 * Expire all bookings whose hold window has passed.
 *
 * This is the core implementation of the reservation expiration job.
 * In production, this would be invoked by a Supabase scheduled Edge
 * Function (pg_cron) every 1-2 minutes per TECHNICAL_ARCHITECTURE.md §15.
 *
 * The function uses the privileged (service-role) Supabase client, which
 * bypasses RLS — auth.uid() returns NULL, and the Phase 7 state-machine
 * trigger allows the expiry transition only for service-role.
 *
 * The WHERE clause is:
 *   status IN ('reservation_pending', 'payment_pending')
 *   AND hold_expires_at < now()
 *
 * Using `< now()` (strict less-than), NOT `<= now()` — a booking whose
 * hold_expires_at is exactly equal to now() is NOT yet expired (it expires
 * the instant after now()). This is consistent with the documented
 * "hold_expires_at < now()" in TECHNICAL_ARCHITECTURE.md §15.
 *
 * @param db - A privileged (service-role) Supabase client.
 * @returns The number of bookings expired and whether the operation succeeded.
 */
export async function expireBookingsCore(
  db: SupabaseDbClient,
): Promise<ExpireBookingsResult> {
  // The UPDATE query:
  //   UPDATE bookings SET status = 'expired'
  //   WHERE status IN ('reservation_pending', 'payment_pending')
  //     AND hold_expires_at < now();
  //
  // Using Supabase's query builder, this is:
  //   db.from("bookings")
  //     .update({ status: "expired" })
  //     .in("status", ["reservation_pending", "payment_pending"])
  //     .lt("hold_expires_at", new Date().toISOString());
  //
  // However, there's a subtlety: using `new Date().toISOString()` as the
  // JavaScript-side timestamp introduces a small clock drift between the
  // application and the database. For correctness, we should use the
  // database's `now()` function. Supabase's query builder doesn't directly
  // support `now()` as a filter value, so we use a raw SQL RPC approach
  // via the `rpc` method — OR we accept the tiny clock drift (milliseconds)
  // which is acceptable at MVP scale (the hold window is 15 minutes, so
  // a few milliseconds of drift is negligible).
  //
  // For the test environment (pglite), we need a different approach since
  // pglite's Supabase client adapter may not support all features. The
  // test harness uses raw SQL queries via `pg.query()` — so the core
  // function accepts a loose-typed client that can be either a Supabase
  // client or a pglite-backed adapter.
  //
  // APPROACH: Use the Supabase query builder with `.lt("hold_expires_at", ...)`
  // for production, and a raw SQL query for tests. The core function
  // detects which type of client it has and dispatches accordingly.
  //
  // Actually, the simplest correct approach is to use a Supabase RPC
  // function or a raw SQL query. Since we can't create a Postgres function
  // without a migration (and we don't need one — the trigger already
  // supports the transition), we use the query builder with JavaScript-side
  // timestamp. The clock drift is negligible (< 1 second) and the hold
  // window is 15 minutes, so this is safe.
  //
  // For pglite tests, the test harness will call a raw SQL query directly
  // (not through this core function) to verify the DB-level behavior. The
  // core function is for the production server action path.

  const nowIso = new Date().toISOString();

  // Phase 11 — fetch the IDs of bookings that WILL be expired BEFORE the
  // UPDATE, so we can dispatch expiration notifications to each affected
  // student after the transaction commits. (Postgres doesn't natively
  // return affected rows from .update() in a portable way via Supabase.)
  const { data: toExpireRows } = await db
    .from("bookings")
    .select(
      `id, student_id,
       rooms ( property_id, properties ( area ) )`,
    )
    .in("status", ["reservation_pending", "payment_pending"])
    .lt("hold_expires_at", nowIso);

  const expiredBookings = (toExpireRows ?? []) as Array<{
    id: string;
    student_id: string;
    rooms?: { properties?: { area?: string } };
  }>;

  const { data, error, count } = await db
    .from("bookings")
    .update({ status: "expired" })
    .in("status", ["reservation_pending", "payment_pending"])
    .lt("hold_expires_at", nowIso)
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("[netlodge] expireBookingsCore: UPDATE failed", {
      error: error.message,
    });
    throw internalError("Could not expire bookings.", {
      phase: "expireBookings",
      error,
    });
  }

  // `count` is the number of rows that matched the WHERE clause.
  // In Supabase, the `update()` response doesn't always return `count`
  // reliably — we use `data` length as a fallback.
  const expiredCount = count ?? (Array.isArray(data) ? data.length : 0);

  console.log(`[netlodge] expireBookingsCore: expired ${expiredCount} bookings`);

  // Phase 11 — dispatch expiration notification to each affected student
  // AFTER the expiry commits. Per PRD §15 / IMPLEMENTATION_PLAN.md §16,
  // reservation expiry triggers an email to the student.
  //
  // CRITICAL: any failure in dispatch is logged but does NOT affect the
  // expiry outcome returned to the caller. The bookings are already 'expired'
  // in the database; the notification is a best-effort post-commit side effect.
  if (expiredBookings.length > 0) {
    try {
      const { dispatchNotification } = await import("@/server/notifications/core");
      for (const b of expiredBookings) {
        const propertyArea = b.rooms?.properties?.area ?? "";
        try {
          // Look up the student's name.
          const { data: studentProfile } = await db
            .from("profiles")
            .select("full_name")
            .eq("id", b.student_id)
            .maybeSingle();
          await dispatchNotification({
            event: "booking.expired.student",
            recipientUserId: b.student_id,
            data: {
              studentFullName:
                (studentProfile as { full_name?: string } | null)?.full_name ??
                "Student",
              propertyArea,
            },
          }, { db });
        } catch (err) {
          // Per-booking failure isolation — one bad dispatch doesn't stop the loop.
          console.error("[netlodge] expiry notification dispatch failed for booking", {
            bookingId: b.id,
            error: err,
          });
        }
      }
    } catch (err) {
      // Module-level failure (e.g., dynamic import failed) — log + continue.
      console.error("[netlodge] expiry notification bulk dispatch failed", {
        error: err,
      });
    }
  }

  return {
    expiredCount,
    success: true,
  };
}
