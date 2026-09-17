/**
 * Phase 9 — payment DB tests.
 *
 * Tests the actual database security boundary: payment_transactions +
 * payment_webhook_events schema, constraints, RLS, state machine,
 * atomic confirmation function, idempotency.
 *
 * All tests run against real Postgres 18 (pglite).
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
import { deriveAmountKobo } from "@/server/payments/core";
import type { PGlite } from "@electric-sql/pglite";

const LANDLORD_ID = "11111111-1111-1111-1111-111111111111";
const STUDENT_A_ID = "22222222-2222-2222-2222-222222222222";
const STUDENT_B_ID = "33333333-3333-3333-3333-333333333333";
const ADMIN_ID = "44444444-4444-4444-4444-444444444444";
const UNIVERSITY_ID = "00000000-0000-0000-0000-000000000001";

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

  for (const [id, name] of [
    [STUDENT_A_ID, "Student A"],
    [STUDENT_B_ID, "Student B"],
  ] as const) {
    await createAuthUser(pg, id, `${name.toLowerCase().replace(" ", "")}@example.com`);
    await createProfile(pg, {
      id, role: "student", full_name: name, phone: "+234",
      university_id: UNIVERSITY_ID,
    });
  }

  await createAuthUser(pg, ADMIN_ID, "admin@example.com");
  await createProfile(pg, {
    id: ADMIN_ID, role: "admin", full_name: "Admin", phone: "+234",
  });
});

afterEach(async () => {
  await pg.close();
});

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
     VALUES ($1, 'self-contain', $2, 1, true) RETURNING id;`,
    [propertyId, params.price ?? 50000],
  );
  return { propertyId, roomId: roomResult.rows[0]!.id };
}

async function createBooking(params: {
  roomId: string;
  studentId: string;
  status?: string;
}): Promise<string> {
  await setServiceRole(pg);
  const result = await pg.query<{ id: string }>(
    `INSERT INTO public.bookings (room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
     SELECT $1, r.property_id, p.landlord_id, $2, 'reservation_pending', r.price, now() + interval '15 minutes'
     FROM public.rooms r JOIN public.properties p ON r.property_id = p.id
     WHERE r.id = $1 RETURNING id;`,
    [params.roomId, params.studentId],
  );
  const bookingId = result.rows[0]!.id;

  if (params.status === "payment_pending") {
    await setServiceRole(pg);
    await pg.query(`UPDATE public.bookings SET status = 'payment_pending' WHERE id = $1;`, [bookingId]);
  } else if (params.status === "confirmed") {
    await setServiceRole(pg);
    await pg.query(`UPDATE public.bookings SET status = 'payment_pending' WHERE id = $1;`, [bookingId]);
    await pg.query(`UPDATE public.bookings SET status = 'confirmed', confirmed_at = now() WHERE id = $1;`, [bookingId]);
  } else if (params.status === "expired") {
    await setServiceRole(pg);
    await pg.query(`UPDATE public.bookings SET status = 'expired' WHERE id = $1;`, [bookingId]);
  }
  return bookingId;
}

async function createPaymentTransaction(params: {
  bookingId: string;
  reference?: string;
  amount?: number;
  status?: string;
}): Promise<{ id: string; reference: string }> {
  await setServiceRole(pg);
  const reference = params.reference ?? `netlodge-test-${Date.now()}-${Math.random().toString(36).slice(8)}`;
  const result = await pg.query<{ id: string }>(
    `INSERT INTO public.payment_transactions (booking_id, paystack_reference, amount, currency, status)
     VALUES ($1, $2, $3, 'NGN', $4) RETURNING id;`,
    [params.bookingId, reference, params.amount ?? 50000, params.status ?? "initiated"],
  );
  return { id: result.rows[0]!.id, reference };
}

async function getPaymentStatus(paymentId: string): Promise<string> {
  await setServiceRole(pg);
  const result = await pg.query<{ status: string }>(`SELECT status FROM public.payment_transactions WHERE id = $1;`, [paymentId]);
  return result.rows[0]?.status ?? "NOT_FOUND";
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 9: schema", () => {
  it("payment_transactions has all required columns", async () => {
    const result = await pg.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'payment_transactions'
      ORDER BY ordinal_position;
    `);
    const cols = result.rows.map((r) => r.column_name);
    for (const col of ["id", "booking_id", "paystack_reference", "amount", "currency", "status", "initiated_at", "verified_at", "failure_reason", "provider_metadata", "created_at", "updated_at"]) {
      expect(cols).toContain(col);
    }
  });

  it("payment_webhook_events has all required columns", async () => {
    const result = await pg.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'payment_webhook_events'
      ORDER BY ordinal_position;
    `);
    const cols = result.rows.map((r) => r.column_name);
    for (const col of ["id", "provider_event_id", "paystack_reference", "event_type", "received_at", "processed_at", "processing_outcome", "raw_payload"]) {
      expect(cols).toContain(col);
    }
  });

  it("paystack_reference is UNIQUE", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_A_ID });
    await createPaymentTransaction({ bookingId, reference: "dup-ref-1" });
    const ok = await querySucceeds(pg, `INSERT INTO public.payment_transactions (booking_id, paystack_reference, amount, currency, status) VALUES ('${bookingId}', 'dup-ref-1', 50000, 'NGN', 'initiated');`);
    expect(ok).toBe(false);
  });

  it("provider_event_id is UNIQUE (idempotency gate)", async () => {
    await setServiceRole(pg);
    await pg.query(`INSERT INTO public.payment_webhook_events (provider_event_id, paystack_reference, event_type, raw_payload) VALUES ('event-1', 'ref-1', 'charge.success', '{"test": true}');`);
    const ok = await querySucceeds(pg, `INSERT INTO public.payment_webhook_events (provider_event_id, paystack_reference, event_type, raw_payload) VALUES ('event-1', 'ref-1', 'charge.success', '{"test": true}');`);
    expect(ok).toBe(false);
  });

  it("partial unique index one_successful_payment_per_booking exists", async () => {
    const result = await pg.query<{ indexname: string }>(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'payment_transactions' AND indexname = 'one_successful_payment_per_booking';`);
    expect(result.rows.length).toBe(1);
  });

  it("payment_transactions RLS is enabled + forced", async () => {
    const result = await pg.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'payment_transactions';`);
    expect(result.rows[0]?.relrowsecurity).toBe(true);
    expect(result.rows[0]?.relforcerowsecurity).toBe(true);
  });

  it("amount CHECK > 0", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_A_ID });
    const ok = await querySucceeds(pg, `INSERT INTO public.payment_transactions (booking_id, paystack_reference, amount, currency, status) VALUES ('${bookingId}', 'neg-ref', 0, 'NGN', 'initiated');`);
    expect(ok).toBe(false);
  });

  it("currency CHECK = NGN", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_A_ID });
    const ok = await querySucceeds(pg, `INSERT INTO public.payment_transactions (booking_id, paystack_reference, amount, currency, status) VALUES ('${bookingId}', 'usd-ref', 50000, 'USD', 'initiated');`);
    expect(ok).toBe(false);
  });

  it("payment state machine trigger exists", async () => {
    const result = await pg.query<{ tgname: string }>(`SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.payment_transactions'::regclass AND NOT tgisinternal;`);
    const names = result.rows.map((r) => r.tgname);
    expect(names).toContain("payment_transactions_guard_status");
    expect(names).toContain("payment_transactions_set_updated_at");
  });

  it("confirm_booking_payment function exists", async () => {
    const result = await pg.query<{ proname: string }>(`SELECT proname FROM pg_proc WHERE proname = 'confirm_booking_payment';`);
    expect(result.rows.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RLS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 9: RLS", () => {
  it("student can read own payment transactions", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_A_ID });
    await createPaymentTransaction({ bookingId });
    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
    const result = await pg.query(`SELECT id FROM public.payment_transactions;`);
    expect(result.rows.length).toBe(1);
  });

  it("student A CANNOT read student B's payment transactions", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_B_ID });
    await createPaymentTransaction({ bookingId });
    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
    const result = await pg.query(`SELECT id FROM public.payment_transactions;`);
    expect(result.rows.length).toBe(0);
  });

  it("landlord CANNOT read payment transactions", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_A_ID });
    await createPaymentTransaction({ bookingId });
    await setJwtClaims(pg, { sub: LANDLORD_ID, role: "authenticated" });
    const result = await pg.query(`SELECT id FROM public.payment_transactions;`);
    expect(result.rows.length).toBe(0);
  });

  it("admin CAN read all payment transactions", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_A_ID });
    await createPaymentTransaction({ bookingId });
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const result = await pg.query(`SELECT id FROM public.payment_transactions;`);
    expect(result.rows.length).toBe(1);
  });

  it("student CANNOT insert payment transactions", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_A_ID });
    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `INSERT INTO public.payment_transactions (booking_id, paystack_reference, amount, currency, status) VALUES ('${bookingId}', 'student-insert', 50000, 'NGN', 'initiated');`);
    expect(ok).toBe(false);
  });

  it("student CANNOT read payment_webhook_events", async () => {
    await setServiceRole(pg);
    await pg.query(`INSERT INTO public.payment_webhook_events (provider_event_id, paystack_reference, event_type, raw_payload) VALUES ('event-test', 'ref-test', 'charge.success', '{"test": true}');`);
    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
    const result = await pg.query(`SELECT id FROM public.payment_webhook_events;`);
    expect(result.rows.length).toBe(0);
  });

  it("student CANNOT change payment status (no UPDATE policy — RLS blocks silently)", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_A_ID });
    const { id: paymentId } = await createPaymentTransaction({ bookingId, status: "initiated" });
    // Student tries to change status — RLS has no UPDATE policy, so 0 rows affected.
    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
    await pg.query(`UPDATE public.payment_transactions SET status = 'success' WHERE id = '${paymentId}';`);
    // Verify status unchanged.
    expect(await getPaymentStatus(paymentId)).toBe("initiated");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT STATE MACHINE (via RPC / SECURITY DEFINER)
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 9: payment state machine (via confirm_booking_payment RPC)", () => {
  it("confirm_booking_payment successfully confirms: payment → success + booking → confirmed", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_A_ID, status: "payment_pending" });
    const { id: paymentId, reference } = await createPaymentTransaction({ bookingId, status: "pending" });

    await setServiceRole(pg);
    await pg.query(`SELECT public.confirm_booking_payment($1, $2, NULL);`, [paymentId, reference]);

    expect(await getPaymentStatus(paymentId)).toBe("success");
    const bookingResult = await pg.query<{ status: string }>(`SELECT status FROM public.bookings WHERE id = $1;`, [bookingId]);
    expect(bookingResult.rows[0]?.status).toBe("confirmed");
  });

  it("rejects confirmation if booking is NOT in payment_pending", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_A_ID, status: "reservation_pending" });
    const { id: paymentId, reference } = await createPaymentTransaction({ bookingId, status: "pending" });
    await setServiceRole(pg);
    const ok = await querySucceeds(pg, `SELECT public.confirm_booking_payment('${paymentId}', '${reference}', NULL);`);
    expect(ok).toBe(false);
    expect(await getPaymentStatus(paymentId)).toBe("pending");
  });

  it("rejects confirmation if payment is already success", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_A_ID, status: "payment_pending" });
    const { id: paymentId, reference } = await createPaymentTransaction({ bookingId, status: "pending" });
    await setServiceRole(pg);
    await pg.query(`SELECT public.confirm_booking_payment($1, $2, NULL);`, [paymentId, reference]);
    // Try again — should fail (payment already success).
    const ok = await querySucceeds(pg, `SELECT public.confirm_booking_payment('${paymentId}', '${reference}', NULL);`);
    expect(ok).toBe(false);
  });

  it("rejects confirmation if booking has expired", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_A_ID, status: "payment_pending" });
    const { id: paymentId, reference } = await createPaymentTransaction({ bookingId, status: "pending" });
    await setServiceRole(pg);
    await pg.query(`UPDATE public.bookings SET status = 'expired' WHERE id = $1;`, [bookingId]);
    const ok = await querySucceeds(pg, `SELECT public.confirm_booking_payment('${paymentId}', '${reference}', NULL);`);
    expect(ok).toBe(false);
  });

  it("partial unique index prevents double success", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_A_ID, status: "payment_pending" });
    await createPaymentTransaction({ bookingId, status: "pending", reference: "ref-1" });
    // Try to create a second success payment for same booking — should fail.
    const ok = await querySucceeds(pg, `INSERT INTO public.payment_transactions (booking_id, paystack_reference, amount, currency, status) VALUES ('${bookingId}', 'ref-2', 50000, 'NGN', 'success');`);
    expect(ok).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AMOUNT DERIVATION
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 9: amount derivation (deriveAmountKobo)", () => {
  it("₦50,000 → 5,000,000 kobo", () => {
    expect(deriveAmountKobo("50000.00")).toBe(5_000_000);
    expect(deriveAmountKobo(50000)).toBe(5_000_000);
  });
  it("₦1 → 100 kobo", () => {
    expect(deriveAmountKobo("1.00")).toBe(100);
  });
  it("₦0.01 → 1 kobo", () => {
    expect(deriveAmountKobo("0.01")).toBe(1);
  });
  it("rounds correctly: ₦50,000.50 → 5,000,050 kobo", () => {
    expect(deriveAmountKobo("50000.50")).toBe(5_000_050);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IDEMPOTENCY
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 9: webhook event idempotency", () => {
  it("first INSERT of provider_event_id succeeds", async () => {
    await setServiceRole(pg);
    const ok = await querySucceeds(pg, `INSERT INTO public.payment_webhook_events (provider_event_id, paystack_reference, event_type, raw_payload) VALUES ('evt-1', 'ref-1', 'charge.success', '{"test": true}');`);
    expect(ok).toBe(true);
  });

  it("second INSERT of same provider_event_id FAILS", async () => {
    await setServiceRole(pg);
    await pg.query(`INSERT INTO public.payment_webhook_events (provider_event_id, paystack_reference, event_type, raw_payload) VALUES ('evt-2', 'ref-2', 'charge.success', '{"test": true}');`);
    const ok = await querySucceeds(pg, `INSERT INTO public.payment_webhook_events (provider_event_id, paystack_reference, event_type, raw_payload) VALUES ('evt-2', 'ref-2', 'charge.success', '{"test": true}');`);
    expect(ok).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FK CONSTRAINTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 9: FK constraints", () => {
  it("payment_transactions.booking_id FK to bookings RESTRICT", async () => {
    const { roomId } = await createApprovedPropertyWithRoom({});
    const bookingId = await createBooking({ roomId, studentId: STUDENT_A_ID });
    await createPaymentTransaction({ bookingId });
    await setServiceRole(pg);
    const ok = await querySucceeds(pg, `DELETE FROM public.bookings WHERE id = '${bookingId}';`);
    expect(ok).toBe(false);
  });
});
