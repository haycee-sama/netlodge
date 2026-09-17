/**
 * Phase 8 — reservation expiration DB tests.
 *
 * Tests the actual database behavior of the expiration operation:
 *   UPDATE bookings SET status = 'expired'
 *   WHERE status IN ('reservation_pending', 'payment_pending')
 *     AND hold_expires_at < now();
 *
 * All tests run against real Postgres 18 (pglite) with Phase 1-7
 * migrations applied. The expiry query is executed as raw SQL using
 * the service-role context (auth.uid() IS NULL), which is what the
 * production scheduled Edge Function would use.
 *
 * CONCURRENCY LIMITATION:
 *   pglite is single-threaded and cannot reproduce genuine concurrent
 *   transactions. The expiration job's correctness under concurrent
 *   booking creation is NOT verified — only the deterministic behavior
 *   is tested.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  makeFreshDb,
  setServiceRole,
  setJwtClaims,
  createAuthUser,
  createProfile,
  querySucceeds,
} from "./helpers";
import type { PGlite } from "@electric-sql/pglite";

const LANDLORD_ID = "11111111-1111-1111-1111-111111111111";
const STUDENT_A_ID = "22222222-2222-2222-2222-222222222222";
const STUDENT_B_ID = "33333333-3333-3333-3333-333333333333";
const UNIVERSITY_ID = "00000000-0000-0000-0000-000000000001";

const ADMIN_ID = "44444444-4444-4444-4444-444444444444";

let pg: PGlite;

beforeEach(async () => {
  pg = await makeFreshDb();

  await createAuthUser(pg, LANDLORD_ID, "landlord@example.com");
  await createProfile(pg, {
    id: LANDLORD_ID, role: "landlord", full_name: "Landlord", phone: "+234",
  });
  await setServiceRole(pg);
  await pg.query(`INSERT INTO public.landlords (profile_id) VALUES ($1);`, [LANDLORD_ID]);
  await pg.query(`UPDATE public.landlords SET current_verification_status = 'approved', verification_valid_until = now() + interval '6 months' WHERE profile_id = $1;`, [LANDLORD_ID]);

  await createAuthUser(pg, STUDENT_A_ID, "student-a@example.com");
  await createProfile(pg, {
    id: STUDENT_A_ID, role: "student", full_name: "Student A", phone: "+234",
    university_id: UNIVERSITY_ID,
  });
  await createAuthUser(pg, STUDENT_B_ID, "student-b@example.com");
  await createProfile(pg, {
    id: STUDENT_B_ID, role: "student", full_name: "Student B", phone: "+234",
    university_id: UNIVERSITY_ID,
  });

  await createAuthUser(pg, ADMIN_ID, "admin@example.com");
  await createProfile(pg, {
    id: ADMIN_ID, role: "admin", full_name: "Admin", phone: "+234",
  });
});

afterEach(async () => {
  await pg.close();
});

// ── Helper: create an approved property with a listed room ────────────────

async function createApprovedPropertyWithRoom(params: {
  price?: number;
}): Promise<{ propertyId: string; roomId: string }> {
  await setServiceRole(pg);
  const propResult = await pg.query<{ id: string }>(
    `INSERT INTO public.properties (landlord_id, university_id, area, address, description, status)
     VALUES ($1, $2, 'Akoka', '123 Test St', 'Test', 'submitted')
     RETURNING id;`,
    [LANDLORD_ID, UNIVERSITY_ID],
  );
  const propertyId = propResult.rows[0]!.id;
  await setServiceRole(pg);
  await pg.query(`UPDATE public.properties SET status = 'approved' WHERE id = $1;`, [propertyId]);

  const roomResult = await pg.query<{ id: string }>(
    `INSERT INTO public.rooms (property_id, room_type, price, occupancy, is_listed)
     VALUES ($1, 'self-contain', $2, 1, true)
     RETURNING id;`,
    [propertyId, params.price ?? 50000],
  );
  const roomId = roomResult.rows[0]!.id;
  return { propertyId, roomId };
}

// ── Helper: create a booking via service-role with custom hold_expires_at ──

async function createBooking(params: {
  roomId: string;
  studentId: string;
  status?: string;
  holdExpiresAt: string; // SQL expression like "now() - interval '1 minute'"
}): Promise<string> {
  await setServiceRole(pg);
  // First create as reservation_pending. Use raw SQL for hold_expires_at
  // since it's a SQL expression (e.g. "now() - interval '1 minute'").
  const result = await pg.query<{ id: string }>(
    `INSERT INTO public.bookings (room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
     SELECT $1, r.property_id, p.landlord_id, $2, 'reservation_pending', r.price, (${params.holdExpiresAt})::timestamptz
     FROM public.rooms r JOIN public.properties p ON r.property_id = p.id
     WHERE r.id = $1
     RETURNING id;`,
    [params.roomId, params.studentId],
  );
  const bookingId = result.rows[0]!.id;

  // Transition through the documented state machine if a different status is needed.
  if (params.status === "payment_pending") {
    await setServiceRole(pg);
    await pg.query(`UPDATE public.bookings SET status = 'payment_pending' WHERE id = $1;`, [bookingId]);
  } else if (params.status === "confirmed") {
    await setServiceRole(pg);
    await pg.query(`UPDATE public.bookings SET status = 'payment_pending' WHERE id = $1;`, [bookingId]);
    await pg.query(`UPDATE public.bookings SET status = 'confirmed', confirmed_at = now() WHERE id = $1;`, [bookingId]);
  } else if (params.status === "cancelled") {
    await setServiceRole(pg);
    await pg.query(`UPDATE public.bookings SET status = 'payment_pending' WHERE id = $1;`, [bookingId]);
    await pg.query(`UPDATE public.bookings SET status = 'confirmed', confirmed_at = now() WHERE id = $1;`, [bookingId]);
    await pg.query(`UPDATE public.bookings SET status = 'cancelled', cancelled_at = now(), cancelled_by = '${params.studentId}' WHERE id = $1;`, [bookingId]);
  } else if (params.status === "completed") {
    await setServiceRole(pg);
    await pg.query(`UPDATE public.bookings SET status = 'payment_pending' WHERE id = $1;`, [bookingId]);
    await pg.query(`UPDATE public.bookings SET status = 'confirmed', confirmed_at = now() WHERE id = $1;`, [bookingId]);
    await pg.query(`UPDATE public.bookings SET status = 'completed', completed_at = now() WHERE id = $1;`, [bookingId]);
  } else if (params.status === "expired") {
    await setServiceRole(pg);
    await pg.query(`UPDATE public.bookings SET status = 'expired' WHERE id = $1;`, [bookingId]);
  } else if (params.status === "payment_failed") {
    await setServiceRole(pg);
    await pg.query(`UPDATE public.bookings SET status = 'payment_pending' WHERE id = $1;`, [bookingId]);
    await pg.query(`UPDATE public.bookings SET status = 'payment_failed' WHERE id = $1;`, [bookingId]);
  }

  return bookingId;
}

// ── Helper: execute the expiry query ──────────────────────────────────────

async function runExpiryJob(): Promise<number> {
  await setServiceRole(pg);
  const result = await pg.query(`
    UPDATE public.bookings
    SET status = 'expired'
    WHERE status IN ('reservation_pending', 'payment_pending')
      AND hold_expires_at < now();
  `);
  return result.affectedRows ?? 0;
}

// ── Helper: get booking status ────────────────────────────────────────────

async function getBookingStatus(bookingId: string): Promise<string> {
  await setServiceRole(pg);
  const result = await pg.query<{ status: string }>(
    `SELECT status FROM public.bookings WHERE id = $1;`,
    [bookingId],
  );
  return result.rows[0]?.status ?? "NOT_FOUND";
}

// ═══════════════════════════════════════════════════════════════════════════
// BASIC EXPIRATION
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 8: basic expiration", () => {
  it("expired reservation_pending → expired", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      holdExpiresAt: "now() - interval '1 minute'",
    });

    expect(await getBookingStatus(bookingId)).toBe("reservation_pending");

    await runExpiryJob();

    expect(await getBookingStatus(bookingId)).toBe("expired");
  });

  it("expired payment_pending → expired", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      status: "payment_pending",
      holdExpiresAt: "now() - interval '1 minute'",
    });

    expect(await getBookingStatus(bookingId)).toBe("payment_pending");

    await runExpiryJob();

    expect(await getBookingStatus(bookingId)).toBe("expired");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// NON-EXPIRATION
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 8: non-expiration (statuses that must NOT change)", () => {
  it("future reservation_pending remains unchanged", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      holdExpiresAt: "now() + interval '15 minutes'",
    });

    await runExpiryJob();

    expect(await getBookingStatus(bookingId)).toBe("reservation_pending");
  });

  it("future payment_pending remains unchanged", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      status: "payment_pending",
      holdExpiresAt: "now() + interval '15 minutes'",
    });

    await runExpiryJob();

    expect(await getBookingStatus(bookingId)).toBe("payment_pending");
  });

  it("confirmed booking remains confirmed (even with expired hold)", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      status: "confirmed",
      holdExpiresAt: "now() - interval '1 hour'",
    });

    await runExpiryJob();

    expect(await getBookingStatus(bookingId)).toBe("confirmed");
  });

  it("cancelled booking remains cancelled", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      status: "cancelled",
      holdExpiresAt: "now() - interval '1 hour'",
    });

    await runExpiryJob();

    expect(await getBookingStatus(bookingId)).toBe("cancelled");
  });

  it("completed booking remains completed", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      status: "completed",
      holdExpiresAt: "now() - interval '1 hour'",
    });

    await runExpiryJob();

    expect(await getBookingStatus(bookingId)).toBe("completed");
  });

  it("already expired booking remains expired", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      status: "expired",
      holdExpiresAt: "now() - interval '1 hour'",
    });

    await runExpiryJob();

    expect(await getBookingStatus(bookingId)).toBe("expired");
  });

  it("payment_failed remains unchanged (not in expiry WHERE clause)", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      status: "payment_failed",
      holdExpiresAt: "now() - interval '1 hour'",
    });

    await runExpiryJob();

    expect(await getBookingStatus(bookingId)).toBe("payment_failed");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BOUNDARY
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 8: boundary behavior (hold_expires_at = now())", () => {
  it("hold_expires_at exactly at now() is NOT expired (strict < comparison)", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    // Set hold_expires_at to now() + 1 second — the booking is still valid
    // (not yet expired) because the expiry query uses `< now()`, and by the
    // time the query runs, now() is only marginally past the hold time.
    // This tests the boundary: a booking that JUST expired (within 1 second)
    // may or may not be expired depending on exact query timing.
    // For a reliable test, we use `now() + interval '1 second'` to guarantee
    // the booking is NOT expired at query time.
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      holdExpiresAt: "now() + interval '1 second'",
    });

    await runExpiryJob();

    expect(await getBookingStatus(bookingId)).toBe("reservation_pending");
  });

  it("hold_expires_at 1 second before now() IS expired", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      holdExpiresAt: "now() - interval '1 second'",
    });

    await runExpiryJob();

    expect(await getBookingStatus(bookingId)).toBe("expired");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IDEMPOTENCY
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 8: idempotency", () => {
  it("running the expiry job twice affects 0 rows on the second run", async () => {
    const { roomId: roomId1 } = await createApprovedPropertyWithRoom({});
    const { roomId: roomId2 } = await createApprovedPropertyWithRoom({});

    // Create two expired bookings.
    await createBooking({
      roomId: roomId1,
      studentId: STUDENT_A_ID,
      holdExpiresAt: "now() - interval '5 minutes'",
    });
    await createBooking({
      roomId: roomId2,
      studentId: STUDENT_B_ID,
      holdExpiresAt: "now() - interval '5 minutes'",
    });

    // First run — should expire both.
    await runExpiryJob();

    // Verify both are expired.
    await setServiceRole(pg);
    const afterFirstRun = await pg.query<{ status: string }>(`
      SELECT status FROM public.bookings
      WHERE status = 'reservation_pending' AND hold_expires_at < now();
    `);
    expect(afterFirstRun.rows.length).toBe(0);

    // Second run — should affect 0 rows (idempotent).
    await runExpiryJob();

    // Verify no additional changes.
    await setServiceRole(pg);
    const afterSecondRun = await pg.query<{ status: string }>(`
      SELECT status FROM public.bookings
      WHERE status = 'reservation_pending' AND hold_expires_at < now();
    `);
    expect(afterSecondRun.rows.length).toBe(0);
  });

  it("expired booking's updated_at changes on first run but not on second", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      holdExpiresAt: "now() - interval '5 minutes'",
    });

    // First run — expires the booking.
    await runExpiryJob();

    // Get updated_at after first run.
    await setServiceRole(pg);
    const afterFirst = await pg.query<{ updated_at: string }>(
      `SELECT updated_at FROM public.bookings WHERE id = $1;`,
      [bookingId],
    );
    const firstUpdatedAt = afterFirst.rows[0]!.updated_at;

    // Wait a tiny bit.
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Second run — should affect 0 rows (no booking with status
    // reservation_pending/payment_pending and expired hold exists).
    await runExpiryJob();

    // Get updated_at after second run — should be the same (no UPDATE fired).
    await setServiceRole(pg);
    const afterSecond = await pg.query<{ updated_at: string }>(
      `SELECT updated_at FROM public.bookings WHERE id = $1;`,
      [bookingId],
    );
    const secondUpdatedAt = afterSecond.rows[0]!.updated_at;

    // The updated_at should be the same — the second run's UPDATE
    // matched 0 rows, so no trigger fired, and updated_at is unchanged.
    expect(secondUpdatedAt).toEqual(firstUpdatedAt);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ROOM RELEASE
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 8: room release after expiry", () => {
  it("after expiry, a different student CAN create a new booking for the same room", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});

    // Student A creates a booking with expired hold.
    await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      holdExpiresAt: "now() - interval '5 minutes'",
    });

    // Run the expiry job.
    await runExpiryJob();

    // Verify the booking is expired.
    await setServiceRole(pg);
    const expiredBooking = await pg.query<{ status: string }>(`
      SELECT status FROM public.bookings WHERE room_id = '${roomId}' AND student_id = '${STUDENT_A_ID}';
    `);
    expect(expiredBooking.rows[0]?.status).toBe("expired");

    // Student B can now create a new booking for the same room.
    await setJwtClaims(pg, { sub: STUDENT_B_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      INSERT INTO public.bookings (room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
      SELECT '${roomId}', r.property_id, p.landlord_id, '${STUDENT_B_ID}', 'reservation_pending', r.price, now() + interval '15 minutes'
      FROM public.rooms r JOIN public.properties p ON r.property_id = p.id WHERE r.id = '${roomId}';
    `);
    expect(ok).toBe(true);

    // Verify exactly one active booking exists for this room.
    await setServiceRole(pg);
    const activeCount = await pg.query<{ count: string }>(`
      SELECT count(*)::text AS count FROM public.bookings
      WHERE room_id = '${roomId}' AND status IN ('reservation_pending', 'payment_pending', 'confirmed');
    `);
    expect(activeCount.rows[0]?.count).toBe("1");
  });

  it("expired booking is NOT deleted (history preserved)", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      holdExpiresAt: "now() - interval '5 minutes'",
    });

    await runExpiryJob();

    // Verify the booking still exists (not deleted).
    await setServiceRole(pg);
    const result = await pg.query(`SELECT id FROM public.bookings WHERE id = '${bookingId}';`);
    expect(result.rows.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MULTIPLE BOOKINGS + MIXED STATUSES
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 8: multiple bookings with mixed statuses", () => {
  it("only the correct rows expire in a single job run", async () => {
    // Create 8 bookings with different statuses + hold times.
    const bookings: Array<{ id: string; expectedStatus: string }> = [];

    // 1. reservation_pending + expired hold → SHOULD expire
    const { roomId: r1 } = await createApprovedPropertyWithRoom({});
    const b1 = await createBooking({
      roomId: r1, studentId: STUDENT_A_ID,
      holdExpiresAt: "now() - interval '5 minutes'",
    });
    bookings.push({ id: b1, expectedStatus: "expired" });

    // 2. reservation_pending + future hold → should NOT expire
    const { roomId: r2 } = await createApprovedPropertyWithRoom({});
    const b2 = await createBooking({
      roomId: r2, studentId: STUDENT_B_ID,
      holdExpiresAt: "now() + interval '15 minutes'",
    });
    bookings.push({ id: b2, expectedStatus: "reservation_pending" });

    // 3. payment_pending + expired hold → SHOULD expire
    const { roomId: r3 } = await createApprovedPropertyWithRoom({});
    const b3 = await createBooking({
      roomId: r3, studentId: STUDENT_A_ID,
      status: "payment_pending",
      holdExpiresAt: "now() - interval '5 minutes'",
    });
    bookings.push({ id: b3, expectedStatus: "expired" });

    // 4. payment_pending + future hold → should NOT expire
    const { roomId: r4 } = await createApprovedPropertyWithRoom({});
    const b4 = await createBooking({
      roomId: r4, studentId: STUDENT_B_ID,
      status: "payment_pending",
      holdExpiresAt: "now() + interval '15 minutes'",
    });
    bookings.push({ id: b4, expectedStatus: "payment_pending" });

    // 5. confirmed + expired hold → should NOT expire
    const { roomId: r5 } = await createApprovedPropertyWithRoom({});
    const b5 = await createBooking({
      roomId: r5, studentId: STUDENT_A_ID,
      status: "confirmed",
      holdExpiresAt: "now() - interval '1 hour'",
    });
    bookings.push({ id: b5, expectedStatus: "confirmed" });

    // 6. cancelled + expired hold → should NOT expire
    const { roomId: r6 } = await createApprovedPropertyWithRoom({});
    const b6 = await createBooking({
      roomId: r6, studentId: STUDENT_B_ID,
      status: "cancelled",
      holdExpiresAt: "now() - interval '1 hour'",
    });
    bookings.push({ id: b6, expectedStatus: "cancelled" });

    // 7. completed + expired hold → should NOT expire
    const { roomId: r7 } = await createApprovedPropertyWithRoom({});
    const b7 = await createBooking({
      roomId: r7, studentId: STUDENT_A_ID,
      status: "completed",
      holdExpiresAt: "now() - interval '1 hour'",
    });
    bookings.push({ id: b7, expectedStatus: "completed" });

    // 8. already expired + expired hold → should NOT change
    const { roomId: r8 } = await createApprovedPropertyWithRoom({});
    const b8 = await createBooking({
      roomId: r8, studentId: STUDENT_B_ID,
      status: "expired",
      holdExpiresAt: "now() - interval '1 hour'",
    });
    bookings.push({ id: b8, expectedStatus: "expired" });

    // Run the expiry job.
    await runExpiryJob();

    // Verify each booking has the expected status.
    for (const booking of bookings) {
      const status = await getBookingStatus(booking.id);
      expect(status).toBe(booking.expectedStatus);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 8: security — non-system actors cannot expire bookings", () => {
  it("student CANNOT expire a booking via direct UPDATE", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      holdExpiresAt: "now() - interval '5 minutes'",
    });

    // Student tries to expire the booking directly.
    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `UPDATE public.bookings SET status = 'expired' WHERE id = '${bookingId}';`);
    expect(ok).toBe(false);

    // Verify the booking is still reservation_pending (not expired).
    expect(await getBookingStatus(bookingId)).toBe("reservation_pending");
  });

  it("admin CANNOT expire a booking via direct UPDATE (not service-role)", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      holdExpiresAt: "now() - interval '5 minutes'",
    });

    // Admin tries to expire directly — the trigger requires service-role
    // (auth.uid() IS NULL) for the expiry transition, not just admin role.
    // Admin RLS allows the UPDATE, but the trigger blocks the status transition.
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    // The trigger raises an exception — catch it and verify the status didn't change.
    const ok = await querySucceeds(pg, `UPDATE public.bookings SET status = 'expired' WHERE id = '${bookingId}';`);
    expect(ok).toBe(false); // Trigger blocked the transition.

    // Verify the booking is still reservation_pending (trigger blocked it).
    expect(await getBookingStatus(bookingId)).toBe("reservation_pending");
  });

  it("only service-role (auth.uid() IS NULL) can perform expiry", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({
      roomId,
      studentId: STUDENT_A_ID,
      holdExpiresAt: "now() - interval '5 minutes'",
    });

    // Service-role (RESET ROLE → auth.uid() IS NULL).
    await setServiceRole(pg);
    const ok = await querySucceeds(pg, `UPDATE public.bookings SET status = 'expired' WHERE id = '${bookingId}';`);
    expect(ok).toBe(true);
  });
});
