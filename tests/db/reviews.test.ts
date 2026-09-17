/**
 * Phase 11 — Reviews DB tests.
 *
 * Direct-request bypass test matrix for review operations:
 *   - createReview: eligibility (completed booking, own booking, no duplicate)
 *   - listForRoom: public non-hidden only
 *   - updateOwn / deleteOwn: author-only
 *   - admin hide / unhide
 *
 * Per Phase 11 §27: every security-sensitive mutation tested via direct
 * DB invocation (bypassing Server Actions).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeFreshDb, setServiceRole, setJwtClaims, clearJwtClaims, createAuthUser, createProfile } from "./helpers";
import type { PGlite } from "@electric-sql/pglite";

let pg: PGlite;

const ADMIN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ADMIN_SUSPENDED_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const STUDENT_A_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const STUDENT_B_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const LANDLORD_APPROVED_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const UNIVERSITY_ID = "00000000-0000-0000-0000-000000000001";

// Fixed entity IDs for test setup.
const PROPERTY_ID = "11111111-1111-1111-1111-111111111111";
const ROOM_ID = "22222222-2222-2222-2222-222222222222";
const BOOKING_A_ID = "33333333-3333-3333-3333-333333333333";
const BOOKING_B_ID = "44444444-4444-4444-4444-444444444444";

beforeEach(async () => {
  pg = await makeFreshDb();
  await createAuthUser(pg, ADMIN_ID, "admin@example.com");
  await createProfile(pg, {
    id: ADMIN_ID,
    role: "admin",
    full_name: "Active Admin",
    phone: "+10000000000",
  });
  await createAuthUser(pg, ADMIN_SUSPENDED_ID, "suspendedadmin@example.com");
  await createProfile(pg, {
    id: ADMIN_SUSPENDED_ID,
    role: "admin",
    full_name: "Suspended Admin",
    phone: "+10000000001",
    account_status: "suspended",
    suspension_reason: "Under investigation",
  });
  await createAuthUser(pg, STUDENT_A_ID, "studenta@example.com");
  await createProfile(pg, {
    id: STUDENT_A_ID,
    role: "student",
    full_name: "Student A",
    phone: "+10000000002",
    university_id: UNIVERSITY_ID,
  });
  await createAuthUser(pg, STUDENT_B_ID, "studentb@example.com");
  await createProfile(pg, {
    id: STUDENT_B_ID,
    role: "student",
    full_name: "Student B",
    phone: "+10000000003",
    university_id: UNIVERSITY_ID,
  });
  await createAuthUser(pg, LANDLORD_APPROVED_ID, "landlord@example.com");
  await createProfile(pg, {
    id: LANDLORD_APPROVED_ID,
    role: "landlord",
    full_name: "Approved Landlord",
    phone: "+10000000004",
  });

  // Seed landlord + property + room + a completed booking for student A.
  await setServiceRole(pg);
  await pg.query(
    `INSERT INTO public.landlords (profile_id, current_verification_status, is_suspended)
     VALUES ($1, 'approved', false);`,
    [LANDLORD_APPROVED_ID],
  );
  await pg.query(
    `INSERT INTO public.properties (id, landlord_id, university_id, area, address, description, status)
     VALUES ($1, $2, $3, 'Test Area', 'Test Address', 'Desc', 'approved');`,
    [PROPERTY_ID, LANDLORD_APPROVED_ID, UNIVERSITY_ID],
  );
  await pg.query(
    `INSERT INTO public.rooms (id, property_id, room_type, price, occupancy, is_listed)
     VALUES ($1, $2, 'single', 5000.00, 1, true);`,
    [ROOM_ID, PROPERTY_ID],
  );

  // Booking A — completed by student A.
  await pg.query(
    `INSERT INTO public.bookings (id, room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
     VALUES ($1, $2, $3, $4, $5, 'reservation_pending', 5000.00, now() + interval '1 hour');`,
    [BOOKING_A_ID, ROOM_ID, PROPERTY_ID, LANDLORD_APPROVED_ID, STUDENT_A_ID],
  );
  await pg.query(`UPDATE public.bookings SET status = 'payment_pending' WHERE id = $1;`, [BOOKING_A_ID]);
  await pg.query(`UPDATE public.bookings SET status = 'confirmed', confirmed_at = now() WHERE id = $1;`, [BOOKING_A_ID]);
  await pg.query(`UPDATE public.bookings SET status = 'completed', completed_at = now() WHERE id = $1;`, [BOOKING_A_ID]);

  // Booking B — completed by student B (different student, same room — but
  // only one ACTIVE booking is allowed at a time, so we mark B as completed
  // first, which releases the room; but the partial unique index only
  // applies to active states). To make this work, BOOKING_B_ID is on a
  // DIFFERENT room we create below.
  await pg.query(
    `INSERT INTO public.rooms (id, property_id, room_type, price, occupancy, is_listed)
     VALUES ('55555555-5555-5555-5555-555555555555', $1, 'shared', 4000.00, 2, true);`,
    [PROPERTY_ID],
  );
  await pg.query(
    `INSERT INTO public.bookings (id, room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
     VALUES ($1, '55555555-5555-5555-5555-555555555555', $2, $3, $4, 'reservation_pending', 4000.00, now() + interval '1 hour');`,
    [BOOKING_B_ID, PROPERTY_ID, LANDLORD_APPROVED_ID, STUDENT_B_ID],
  );
  await pg.query(`UPDATE public.bookings SET status = 'payment_pending' WHERE id = $1;`, [BOOKING_B_ID]);
  await pg.query(`UPDATE public.bookings SET status = 'confirmed', confirmed_at = now() WHERE id = $1;`, [BOOKING_B_ID]);
  await pg.query(`UPDATE public.bookings SET status = 'completed', completed_at = now() WHERE id = $1;`, [BOOKING_B_ID]);
});

afterEach(async () => {
  await pg.close();
});

// ── Helper: attempt a review INSERT as a specific actor ──────────────────────

async function tryInsertReview(
  actor: "anon" | "studentA" | "studentB" | "landlord" | "suspendedAdmin" | "activeAdmin" | "serviceRole",
  bookingId: string,
  studentId: string,
  roomId: string = ROOM_ID,
  rating: number = 4,
  content: string = "Good stay",
): Promise<{ error: string | null }> {
  if (actor === "serviceRole") {
    await setServiceRole(pg);
  } else if (actor === "anon") {
    await clearJwtClaims(pg);
  } else {
    const map = {
      studentA: STUDENT_A_ID,
      studentB: STUDENT_B_ID,
      landlord: LANDLORD_APPROVED_ID,
      suspendedAdmin: ADMIN_SUSPENDED_ID,
      activeAdmin: ADMIN_ID,
    } as const;
    await setJwtClaims(pg, { sub: map[actor], role: "authenticated" });
  }
  try {
    await pg.query(
      `INSERT INTO public.reviews (booking_id, student_id, room_id, rating, content)
       VALUES ($1, $2, $3, $4, $5);`,
      [bookingId, studentId, roomId, rating, content],
    );
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reviews — eligibility + ownership tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 11 reviews — eligibility + ownership", () => {
  it("student A can create review on their completed booking", async () => {
    const r = await tryInsertReview("studentA", BOOKING_A_ID, STUDENT_A_ID);
    expect(r.error).toBeNull();

    // Verify the review exists.
    await setServiceRole(pg);
    const row = await pg.query<{ rating: number; content: string }>(
      `SELECT rating, content FROM public.reviews WHERE booking_id = $1;`,
      [BOOKING_A_ID],
    );
    expect(row.rows.length).toBe(1);
    expect(row.rows[0]?.rating).toBe(4);
  });

  it("anonymous cannot create a review", async () => {
    const r = await tryInsertReview("anon", BOOKING_A_ID, STUDENT_A_ID);
    expect(r.error).not.toBeNull();
  });

  it("student B cannot review student A's booking (ownership)", async () => {
    const r = await tryInsertReview("studentB", BOOKING_A_ID, STUDENT_B_ID);
    // The trigger enforces booking.student_id = review.student_id.
    expect(r.error).toMatch(/does not match booking student|check_violation/i);
  });

  it("student A cannot create a review with a forged student_id (mismatch)", async () => {
    // Student A's JWT, but the review claims student B authored it.
    // The trigger enforces booking.student_id = review.student_id where
    // booking.student_id = STUDENT_A_ID, so a forged student_id = STUDENT_B_ID
    // will fail the trigger's ownership check.
    const r = await tryInsertReview("studentA", BOOKING_A_ID, STUDENT_B_ID);
    expect(r.error).toMatch(/does not match booking student|check_violation/i);
  });

  it("student cannot review a non-completed booking (cancelled)", async () => {
    await setServiceRole(pg);
    // Insert a cancelled booking for student A on a new room.
    await pg.query(
      `INSERT INTO public.rooms (id, property_id, room_type, price, occupancy, is_listed)
       VALUES ('66666666-6666-6666-6666-666666666666', $1, 'studio', 6000.00, 1, true);`,
      [PROPERTY_ID],
    );
    await pg.query(
      `INSERT INTO public.bookings (id, room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
       VALUES ('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', $1, $2, $3, 'reservation_pending', 6000.00, now() + interval '1 hour');`,
      [PROPERTY_ID, LANDLORD_APPROVED_ID, STUDENT_A_ID],
    );
    await pg.query(`UPDATE public.bookings SET status = 'payment_pending' WHERE id = '77777777-7777-7777-7777-777777777777';`);
    await pg.query(`UPDATE public.bookings SET status = 'confirmed', confirmed_at = now() WHERE id = '77777777-7777-7777-7777-777777777777';`);
    await pg.query(`UPDATE public.bookings SET status = 'cancelled', cancelled_at = now(), cancelled_by = $1 WHERE id = '77777777-7777-7777-7777-777777777777';`, [STUDENT_A_ID]);

    const r = await tryInsertReview("studentA", "77777777-7777-7777-7777-777777777777", STUDENT_A_ID, "66666666-6666-6666-6666-666666666666");
    expect(r.error).toMatch(/Cannot review a booking in status|check_violation/i);
  });

  it("student cannot review an expired booking", async () => {
    await setServiceRole(pg);
    await pg.query(
      `INSERT INTO public.rooms (id, property_id, room_type, price, occupancy, is_listed)
       VALUES ('88888888-8888-8888-8888-888888888888', $1, 'shared', 3000.00, 1, true);`,
      [PROPERTY_ID],
    );
    await pg.query(
      `INSERT INTO public.bookings (id, room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
       VALUES ('99999999-9999-9999-9999-999999999999', '88888888-8888-8888-8888-888888888888', $1, $2, $3, 'reservation_pending', 3000.00, now() - interval '1 hour');`,
      [PROPERTY_ID, LANDLORD_APPROVED_ID, STUDENT_A_ID],
    );
    await pg.query(`UPDATE public.bookings SET status = 'expired' WHERE id = '99999999-9999-9999-9999-999999999999';`);

    const r = await tryInsertReview("studentA", "99999999-9999-9999-9999-999999999999", STUDENT_A_ID, "88888888-8888-8888-8888-888888888888");
    expect(r.error).toMatch(/Cannot review a booking in status|check_violation/i);
  });

  it("student cannot review a non-existent booking", async () => {
    const r = await tryInsertReview("studentA", "00000000-0000-0000-0000-000000000099", STUDENT_A_ID);
    expect(r.error).toMatch(/Booking not found|foreign_key_violation/i);
  });

  it("duplicate review on same booking rejected by UNIQUE constraint", async () => {
    // First review succeeds.
    const first = await tryInsertReview("studentA", BOOKING_A_ID, STUDENT_A_ID);
    expect(first.error).toBeNull();

    // Second review on the same booking fails (UNIQUE constraint).
    const second = await tryInsertReview("studentA", BOOKING_A_ID, STUDENT_A_ID);
    expect(second.error).toMatch(/unique constraint|duplicate key/i);
  });

  it("landlord cannot create a review (not a student)", async () => {
    // Landlord attempts to review their own property's booking. The
    // booking's student_id is STUDENT_A_ID, not the landlord, so the
    // trigger enforces ownership and blocks this.
    const r = await tryInsertReview("landlord", BOOKING_A_ID, LANDLORD_APPROVED_ID);
    expect(r.error).toMatch(/does not match booking student|check_violation/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Reviews — RLS visibility tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 11 reviews — RLS visibility", () => {
  beforeEach(async () => {
    // Insert a visible review for student A.
    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
    await pg.query(
      `INSERT INTO public.reviews (booking_id, student_id, room_id, rating, content)
       VALUES ($1, $2, $3, 5, 'Excellent');`,
      [BOOKING_A_ID, STUDENT_A_ID, ROOM_ID],
    );
  });

  it("anonymous can read non-hidden reviews", async () => {
    await clearJwtClaims(pg);
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    expect(r.rows.length).toBe(1);
  });

  it("student B can read non-hidden reviews", async () => {
    await setJwtClaims(pg, { sub: STUDENT_B_ID, role: "authenticated" });
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    expect(r.rows.length).toBe(1);
  });

  it("landlord can read non-hidden reviews (same as public)", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_APPROVED_ID, role: "authenticated" });
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    expect(r.rows.length).toBe(1);
  });

  it("admin can read all reviews (including hidden)", async () => {
    // Hide the review.
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const reviewRow = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    const reviewId = reviewRow.rows[0]!.id;
    await pg.query(`SELECT public.admin_hide_review($1::uuid, 'Inappropriate');`, [reviewId]);

    // Admin still sees it.
    const r = await pg.query<{ id: string; is_hidden: boolean }>(
      `SELECT id, is_hidden FROM public.reviews;`,
    );
    expect(r.rows.length).toBe(1);
    expect(r.rows[0]?.is_hidden).toBe(true);
  });

  it("anonymous CANNOT read hidden reviews", async () => {
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const reviewRow = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    const reviewId = reviewRow.rows[0]!.id;
    await pg.query(`SELECT public.admin_hide_review($1::uuid, 'Inappropriate');`, [reviewId]);

    await clearJwtClaims(pg);
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    expect(r.rows.length).toBe(0);
  });

  it("review author can still see their own hidden review", async () => {
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const reviewRow = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    const reviewId = reviewRow.rows[0]!.id;
    await pg.query(`SELECT public.admin_hide_review($1::uuid, 'Inappropriate');`, [reviewId]);

    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
    const r = await pg.query<{ id: string; is_hidden: boolean }>(
      `SELECT id, is_hidden FROM public.reviews;`,
    );
    expect(r.rows.length).toBe(1);
    expect(r.rows[0]?.is_hidden).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Reviews — author mutation tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 11 reviews — author mutation", () => {
  beforeEach(async () => {
    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
    await pg.query(
      `INSERT INTO public.reviews (booking_id, student_id, room_id, rating, content)
       VALUES ($1, $2, $3, 4, 'Initial content');`,
      [BOOKING_A_ID, STUDENT_A_ID, ROOM_ID],
    );
  });

  it("author can update own review (rating + content)", async () => {
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    const reviewId = r.rows[0]!.id;

    await pg.query(
      `UPDATE public.reviews SET rating = 5, content = 'Updated content' WHERE id = $1;`,
      [reviewId],
    );

    await setServiceRole(pg);
    const row = await pg.query<{ rating: number; content: string }>(
      `SELECT rating, content FROM public.reviews WHERE id = $1;`,
      [reviewId],
    );
    expect(row.rows[0]?.rating).toBe(5);
    expect(row.rows[0]?.content).toBe("Updated content");
  });

  it("author CANNOT set is_hidden (column-guard trigger blocks)", async () => {
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    const reviewId = r.rows[0]!.id;

    await expect(
      pg.query(`UPDATE public.reviews SET is_hidden = true WHERE id = $1;`, [reviewId]),
    ).rejects.toThrow(/Only admins can change reviews.is_hidden/);
  });

  it("student B CANNOT update student A's review (RLS blocks)", async () => {
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    const reviewId = r.rows[0]!.id;

    await setJwtClaims(pg, { sub: STUDENT_B_ID, role: "authenticated" });
    // RLS silently filters to 0 rows — UPDATE returns 0 affected.
    await pg.query(`UPDATE public.reviews SET rating = 1 WHERE id = $1;`, [reviewId]);

    // Verify the row is unchanged.
    await setServiceRole(pg);
    const row = await pg.query<{ rating: number }>(
      `SELECT rating FROM public.reviews WHERE id = $1;`,
      [reviewId],
    );
    expect(row.rows[0]?.rating).toBe(4); // Original value, not 1.
  });

  it("author can delete own review (hard delete)", async () => {
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    const reviewId = r.rows[0]!.id;

    await pg.query(`DELETE FROM public.reviews WHERE id = $1;`, [reviewId]);

    await setServiceRole(pg);
    const row = await pg.query<{ id: string }>(`SELECT id FROM public.reviews WHERE id = $1;`, [reviewId]);
    expect(row.rows.length).toBe(0);
  });

  it("student B CANNOT delete student A's review (RLS blocks)", async () => {
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    const reviewId = r.rows[0]!.id;

    await setJwtClaims(pg, { sub: STUDENT_B_ID, role: "authenticated" });
    await pg.query(`DELETE FROM public.reviews WHERE id = $1;`, [reviewId]);

    // Verify row still exists.
    await setServiceRole(pg);
    const row = await pg.query<{ id: string }>(`SELECT id FROM public.reviews WHERE id = $1;`, [reviewId]);
    expect(row.rows.length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Reviews — admin moderation tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 11 reviews — admin moderation (hide / unhide)", () => {
  let reviewId: string;

  beforeEach(async () => {
    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
    await pg.query(
      `INSERT INTO public.reviews (booking_id, student_id, room_id, rating, content)
       VALUES ($1, $2, $3, 4, 'Initial content');`,
      [BOOKING_A_ID, STUDENT_A_ID, ROOM_ID],
    );
    await setServiceRole(pg);
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    reviewId = r.rows[0]!.id;
  });

  it("active admin can hide a review + audit_logs row written", async () => {
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await pg.query(`SELECT public.admin_hide_review($1::uuid, 'Spam');`, [reviewId]);

    // Verify is_hidden = true.
    await setServiceRole(pg);
    const row = await pg.query<{ is_hidden: boolean; hidden_reason: string }>(
      `SELECT is_hidden, hidden_reason FROM public.reviews WHERE id = $1;`,
      [reviewId],
    );
    expect(row.rows[0]?.is_hidden).toBe(true);
    expect(row.rows[0]?.hidden_reason).toBe("Spam");

    // Verify audit_logs row written.
    const audit = await pg.query<{ action: string; reason: string }>(
      `SELECT action, reason FROM public.audit_logs WHERE entity_id = $1;`,
      [reviewId],
    );
    expect(audit.rows.length).toBe(1);
    expect(audit.rows[0]?.action).toBe("review.hidden");
    expect(audit.rows[0]?.reason).toBe("Spam");
  });

  it("anonymous CANNOT hide a review (RPC denies)", async () => {
    await clearJwtClaims(pg);
    await expect(
      pg.query(`SELECT public.admin_hide_review($1::uuid, 'spam');`, [reviewId]),
    ).rejects.toThrow(/Only active admins|insufficient_privilege/i);

    // Verify review is still visible.
    await setServiceRole(pg);
    const row = await pg.query<{ is_hidden: boolean }>(
      `SELECT is_hidden FROM public.reviews WHERE id = $1;`,
      [reviewId],
    );
    expect(row.rows[0]?.is_hidden).toBe(false);
  });

  it("student CANNOT hide a review (RPC denies)", async () => {
    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
    await expect(
      pg.query(`SELECT public.admin_hide_review($1::uuid, 'spam');`, [reviewId]),
    ).rejects.toThrow(/Only active admins|insufficient_privilege/i);
  });

  it("landlord CANNOT hide a review (RPC denies)", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_APPROVED_ID, role: "authenticated" });
    await expect(
      pg.query(`SELECT public.admin_hide_review($1::uuid, 'spam');`, [reviewId]),
    ).rejects.toThrow(/Only active admins|insufficient_privilege/i);
  });

  it("suspended admin CANNOT hide a review (strict admin check)", async () => {
    await setJwtClaims(pg, { sub: ADMIN_SUSPENDED_ID, role: "authenticated" });
    await expect(
      pg.query(`SELECT public.admin_hide_review($1::uuid, 'spam');`, [reviewId]),
    ).rejects.toThrow(/Only active admins|insufficient_privilege/i);
  });

  it("admin hide without reason → check_violation", async () => {
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await expect(
      pg.query(`SELECT public.admin_hide_review($1::uuid, '');`, [reviewId]),
    ).rejects.toThrow(/reason is required|check_violation/i);
  });

  it("admin cannot hide an already-hidden review", async () => {
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await pg.query(`SELECT public.admin_hide_review($1::uuid, 'First hide');`, [reviewId]);

    await expect(
      pg.query(`SELECT public.admin_hide_review($1::uuid, 'Second hide');`, [reviewId]),
    ).rejects.toThrow(/already hidden|check_violation/i);
  });

  it("admin can unhide a hidden review + audit row written", async () => {
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await pg.query(`SELECT public.admin_hide_review($1::uuid, 'Hide');`, [reviewId]);
    await pg.query(`SELECT public.admin_unhide_review($1::uuid, 'Restored');`, [reviewId]);

    await setServiceRole(pg);
    const row = await pg.query<{ is_hidden: boolean }>(
      `SELECT is_hidden FROM public.reviews WHERE id = $1;`,
      [reviewId],
    );
    expect(row.rows[0]?.is_hidden).toBe(false);

    // Two audit rows: hidden + unhidden.
    const audit = await pg.query<{ action: string }>(
      `SELECT action FROM public.audit_logs WHERE entity_id = $1 ORDER BY created_at;`,
      [reviewId],
    );
    expect(audit.rows.map((r) => r.action)).toEqual([
      "review.hidden",
      "review.unhidden",
    ]);
  });

  it("admin cannot unhide a non-hidden review", async () => {
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await expect(
      pg.query(`SELECT public.admin_unhide_review($1::uuid, 'restore');`, [reviewId]),
    ).rejects.toThrow(/not currently hidden|check_violation/i);
  });

  it("non-admin cannot hide review via direct INSERT setting is_hidden=true (column-guard trigger)", async () => {
    // Try INSERT with is_hidden = true as student A.
    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
    await expect(
      pg.query(
        `INSERT INTO public.reviews (booking_id, student_id, room_id, rating, content, is_hidden, hidden_reason)
         VALUES ($1, $2, $3, 1, 'bad', true, 'self-moderated');`,
        [BOOKING_B_ID, STUDENT_B_ID, "55555555-5555-5555-5555-555555555555"],
      ),
    ).rejects.toThrow(/Only admins can create a hidden review/);
  });
});
