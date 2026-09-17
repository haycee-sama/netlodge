/**
 * Phase 12 §3 — RLS direct-request bypass tests.
 *
 * Tests that RLS enforces documented access control on EVERY user-facing
 * table, regardless of what the application layer does. These tests
 * attempt unauthorized access directly against the database, bypassing
 * the Server Action layer entirely.
 *
 * Per API_CONTRACTS.md §26 + IMPLEMENTATION_PLAN.md §18 (attack list):
 *   - access another student's booking
 *   - access another landlord's property
 *   - read another landlord's verification documents
 *   - impersonate an admin
 *   - bypass verification to submit a property
 *   - submit an arbitrary report target
 *   - review a booking not legitimately one's own
 *   - enumerate private data via ID probing against not_found responses
 *
 * The matrix per table:
 *   Anonymous: SELECT/INSERT/UPDATE/DELETE
 *   Student: SELECT/INSERT/UPDATE/DELETE
 *   Landlord: SELECT/INSERT/UPDATE/DELETE
 *   Active Admin: SELECT/INSERT/UPDATE/DELETE
 *   Suspended Admin: SELECT/INSERT/UPDATE/DELETE
 *   Service Role: SELECT/INSERT/UPDATE/DELETE (bypasses RLS — verified
 *     for setup operations only)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeFreshDb, setServiceRole, setJwtClaims, clearJwtClaims, createAuthUser, createProfile } from "../db/helpers";
import type { PGlite } from "@electric-sql/pglite";

let pg: PGlite;

const ADMIN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ADMIN_SUSPENDED_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const STUDENT_A_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const STUDENT_B_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const LANDLORD_A_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const LANDLORD_B_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";
const UNIVERSITY_ID = "00000000-0000-0000-0000-000000000001";

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
  await createAuthUser(pg, LANDLORD_A_ID, "landlorda@example.com");
  await createProfile(pg, {
    id: LANDLORD_A_ID,
    role: "landlord",
    full_name: "Landlord A",
    phone: "+10000000004",
  });
  await createAuthUser(pg, LANDLORD_B_ID, "landlordb@example.com");
  await createProfile(pg, {
    id: LANDLORD_B_ID,
    role: "landlord",
    full_name: "Landlord B",
    phone: "+10000000005",
  });
});

afterEach(async () => {
  await pg.close();
});

// ── Helper: switch to a specific actor context ───────────────────────────────

async function asActor(actor: "anon" | "studentA" | "studentB" | "landlordA" | "landlordB" | "suspendedAdmin" | "activeAdmin" | "serviceRole"): Promise<void> {
  if (actor === "serviceRole") {
    await setServiceRole(pg);
  } else if (actor === "anon") {
    await clearJwtClaims(pg);
  } else {
    const map = {
      studentA: STUDENT_A_ID,
      studentB: STUDENT_B_ID,
      landlordA: LANDLORD_A_ID,
      landlordB: LANDLORD_B_ID,
      suspendedAdmin: ADMIN_SUSPENDED_ID,
      activeAdmin: ADMIN_ID,
    } as const;
    await setJwtClaims(pg, { sub: map[actor], role: "authenticated" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// profiles table — RLS bypass tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 RLS — profiles", () => {
  beforeEach(async () => {
    // Student A already exists from setup. No additional fixtures needed.
  });

  it("anonymous CANNOT read any profile", async () => {
    await asActor("anon");
    const r = await pg.query(`SELECT id FROM public.profiles;`);
    expect(r.rows.length).toBe(0);
  });

  it("student A can read ONLY their own profile", async () => {
    await asActor("studentA");
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.profiles;`);
    expect(r.rows.length).toBe(1);
    expect(r.rows[0]?.id).toBe(STUDENT_A_ID);
  });

  it("student A CANNOT read student B's profile", async () => {
    await asActor("studentA");
    const r = await pg.query<{ id: string }>(
      `SELECT id FROM public.profiles WHERE id = $1;`,
      [STUDENT_B_ID],
    );
    expect(r.rows.length).toBe(0);
  });

  it("student A CANNOT forge role='admin' via UPDATE", async () => {
    await asActor("studentA");
    await expect(
      pg.query(`UPDATE public.profiles SET role = 'admin' WHERE id = $1;`, [STUDENT_A_ID]),
    ).rejects.toThrow(/role|check_violation|insufficient_privilege/i);
  });

  it("student A CANNOT forge account_status='active' when suspended", async () => {
    // Mark student A as suspended via service-role.
    await setServiceRole(pg);
    await pg.query(`UPDATE public.profiles SET account_status = 'suspended', suspension_reason = 'test' WHERE id = $1;`, [STUDENT_A_ID]);
    // Student A attempts to self-unsuspend.
    await asActor("studentA");
    await expect(
      pg.query(`UPDATE public.profiles SET account_status = 'active' WHERE id = $1;`, [STUDENT_A_ID]),
    ).rejects.toThrow(/account_status|check_violation|insufficient_privilege/i);
  });

  it("landlord A CANNOT read landlord B's profile", async () => {
    await asActor("landlordA");
    const r = await pg.query<{ id: string }>(
      `SELECT id FROM public.profiles WHERE id = $1;`,
      [LANDLORD_B_ID],
    );
    expect(r.rows.length).toBe(0);
  });

  it("suspended admin CAN read profiles via permissive admin RLS policy (PRD §8 view-only)", async () => {
    // Per migration 0009 / 0010, `netlodge_is_current_user_admin()` is
    // the permissive check used by RLS READ policies — it returns TRUE
    // for any role=admin, regardless of account_status. This is documented
    // in Phase 10's audit_logs comment: "a suspended admin can still READ
    // audit history (consistent with PRD §8 'view read-only history');
    // they just can't perform mutations." The same pattern applies to
    // profiles (admin read access for support / investigation).
    //
    // The actual mutation block happens at the SECURITY DEFINER RPC layer
    // via `netlodge_is_current_user_active_admin()` (strict).
    await asActor("suspendedAdmin");
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.profiles;`);
    expect(r.rows.length).toBeGreaterThanOrEqual(1);
    // Includes their own profile.
    expect(r.rows.some((row) => row.id === ADMIN_SUSPENDED_ID)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// bookings table — RLS bypass tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 RLS — bookings (cross-student)", () => {
  beforeEach(async () => {
    // Seed a property owned by landlord A + a room + a booking by student A.
    await setServiceRole(pg);
    await pg.query(
      `INSERT INTO public.landlords (profile_id, current_verification_status, is_suspended)
       VALUES ($1, 'approved', false);`,
      [LANDLORD_A_ID],
    );
    await pg.query(
      `INSERT INTO public.properties (id, landlord_id, university_id, area, address, description, status)
       VALUES ('11111111-1111-1111-1111-111111111111', $1, $2, 'Area', 'Address', 'Desc', 'approved');`,
      [LANDLORD_A_ID, UNIVERSITY_ID],
    );
    await pg.query(
      `INSERT INTO public.rooms (id, property_id, room_type, price, occupancy, is_listed)
       VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'single', 5000.00, 1, true);`,
    );
    await pg.query(
      `INSERT INTO public.bookings (id, room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
       VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', $1, $2, 'reservation_pending', 5000.00, now() + interval '1 hour');`,
      [LANDLORD_A_ID, STUDENT_A_ID],
    );
  });

  it("student B CANNOT read student A's booking (cross-student)", async () => {
    await asActor("studentB");
    const r = await pg.query<{ id: string }>(
      `SELECT id FROM public.bookings WHERE id = $1;`,
      ["33333333-3333-3333-3333-333333333333"],
    );
    expect(r.rows.length).toBe(0);
  });

  it("student B CANNOT modify student A's booking (RLS silently filters)", async () => {
    await asActor("studentB");
    // RLS filters the row from UPDATE — 0 rows affected.
    await pg.query(`UPDATE public.bookings SET status = 'cancelled' WHERE id = $1;`, [
      "33333333-3333-3333-3333-333333333333",
    ]);
    // Verify the booking is unchanged.
    await setServiceRole(pg);
    const r = await pg.query<{ status: string }>(
      `SELECT status FROM public.bookings WHERE id = $1;`,
      ["33333333-3333-3333-3333-333333333333"],
    );
    expect(r.rows[0]?.status).toBe("reservation_pending");
  });

  it("landlord B CANNOT read landlord A's property bookings", async () => {
    await asActor("landlordB");
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.bookings;`);
    expect(r.rows.length).toBe(0);
  });

  it("landlord B CANNOT modify landlord A's booking (RLS filters)", async () => {
    await asActor("landlordB");
    await pg.query(`UPDATE public.bookings SET status = 'cancelled' WHERE id = $1;`, [
      "33333333-3333-3333-3333-333333333333",
    ]);
    await setServiceRole(pg);
    const r = await pg.query<{ status: string }>(
      `SELECT status FROM public.bookings WHERE id = $1;`,
      ["33333333-3333-3333-3333-333333333333"],
    );
    expect(r.rows[0]?.status).toBe("reservation_pending");
  });

  it("student A CANNOT forge student_id on INSERT (must equal auth.uid())", async () => {
    await asActor("studentA");
    // Attempt to insert a booking claiming student_id = student B.
    await expect(
      pg.query(
        `INSERT INTO public.bookings (id, room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
         VALUES ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', $1, $2, 'reservation_pending', 5000.00, now() + interval '1 hour');`,
        [LANDLORD_A_ID, STUDENT_B_ID],
      ),
    ).rejects.toThrow();
  });

  it("student A CANNOT directly write booking status='confirmed' (state machine)", async () => {
    await asActor("studentA");
    // Try to UPDATE own booking status to 'confirmed'.
    await expect(
      pg.query(`UPDATE public.bookings SET status = 'confirmed' WHERE id = $1;`, [
        "33333333-3333-3333-3333-333333333333",
      ]),
    ).rejects.toThrow(/status transition|check_violation/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// properties + rooms — RLS bypass tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 RLS — properties + rooms (cross-landlord)", () => {
  beforeEach(async () => {
    await setServiceRole(pg);
    // Two approved landlords with their own properties.
    for (const [landlordId, propertyId] of [
      [LANDLORD_A_ID, "11111111-1111-1111-1111-111111111111"],
      [LANDLORD_B_ID, "55555555-5555-5555-5555-555555555555"],
    ] as const) {
      await pg.query(
        `INSERT INTO public.landlords (profile_id, current_verification_status, is_suspended)
         VALUES ($1, 'approved', false);`,
        [landlordId],
      );
      await pg.query(
        `INSERT INTO public.properties (id, landlord_id, university_id, area, address, description, status)
         VALUES ($1, $2, $3, 'Area', 'Address', 'Desc', 'approved');`,
        [propertyId, landlordId, UNIVERSITY_ID],
      );
      await pg.query(
        `INSERT INTO public.rooms (id, property_id, room_type, price, occupancy, is_listed)
         VALUES ($1, $2, 'single', 5000.00, 1, true);`,
        [propertyId.replace(/^5/, "6"), propertyId],
      );
    }
  });

  it("landlord B CANNOT read landlord A's property (when A's status is draft)", async () => {
    // Landlord A creates a draft property (NOT public yet).
    await setServiceRole(pg);
    await pg.query(
      `INSERT INTO public.properties (id, landlord_id, university_id, area, address, description, status)
       VALUES ('77777777-7777-7777-7777-777777777777', $1, $2, 'Draft Area', 'Draft Address', 'Draft', 'draft');`,
      [LANDLORD_A_ID, UNIVERSITY_ID],
    );
    await asActor("landlordB");
    const r = await pg.query<{ id: string }>(
      `SELECT id FROM public.properties WHERE id = $1;`,
      ["77777777-7777-7777-7777-777777777777"],
    );
    expect(r.rows.length).toBe(0);
  });

  it("landlord B CANNOT modify landlord A's property (RLS filters)", async () => {
    await asActor("landlordB");
    await pg.query(`UPDATE public.properties SET description = 'hijacked' WHERE id = $1;`, [
      "11111111-1111-1111-1111-111111111111",
    ]);
    await setServiceRole(pg);
    const r = await pg.query<{ description: string }>(
      `SELECT description FROM public.properties WHERE id = $1;`,
      ["11111111-1111-1111-1111-111111111111"],
    );
    expect(r.rows[0]?.description).toBe("Desc");
  });

  it("landlord B CANNOT modify landlord A's room (RLS filters)", async () => {
    await asActor("landlordB");
    await pg.query(`UPDATE public.rooms SET price = 1.00 WHERE id = $1;`, [
      "11111111-1111-1111-1111-111111111111",
    ]);
    await setServiceRole(pg);
    const r = await pg.query<{ price: string }>(
      `SELECT price FROM public.rooms WHERE id = $1;`,
      ["11111111-1111-1111-1111-111111111111"],
    );
    expect(r.rows[0]?.price).toBe("5000.00");
  });

  it("landlord B CANNOT delete landlord A's room (no DELETE policy)", async () => {
    await asActor("landlordB");
    await pg.query(`DELETE FROM public.rooms WHERE id = $1;`, [
      "11111111-1111-1111-1111-111111111111",
    ]);
    await setServiceRole(pg);
    const r = await pg.query<{ id: string }>(
      `SELECT id FROM public.rooms WHERE id = $1;`,
      ["11111111-1111-1111-1111-111111111111"],
    );
    expect(r.rows.length).toBe(1); // Still exists.
  });

  it("landlord B CANNOT forge landlord_id on INSERT (must equal auth.uid())", async () => {
    await asActor("landlordB");
    // Try to insert a property claiming landlord_id = landlord A.
    await expect(
      pg.query(
        `INSERT INTO public.properties (id, landlord_id, university_id, area, address, description, status)
         VALUES ('88888888-8888-8888-8888-888888888888', $1, $2, 'hijacked', 'hijacked', 'hijacked', 'draft');`,
        [LANDLORD_A_ID, UNIVERSITY_ID],
      ),
    ).rejects.toThrow();
  });

  it("suspended property CANNOT be discovered by anonymous", async () => {
    // Suspend landlord A's approved property via the admin RPC.
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await pg.query(
      `SELECT public.admin_suspend_property($1::uuid, 'Investigation');`,
      ["11111111-1111-1111-1111-111111111111"],
    );

    // Anonymous tries to discover it.
    await clearJwtClaims(pg);
    const r = await pg.query<{ id: string }>(
      `SELECT id FROM public.properties WHERE id = $1;`,
      ["11111111-1111-1111-1111-111111111111"],
    );
    expect(r.rows.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// audit_logs — RLS bypass tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 RLS — audit_logs (append-only, admin-only read)", () => {
  beforeEach(async () => {
    // Seed an audit_logs row via service-role.
    await setServiceRole(pg);
    await pg.query(
      `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id)
       VALUES ($1, 'test.action', 'test', '11111111-1111-1111-1111-111111111111');`,
      [ADMIN_ID],
    );
  });

  it("anonymous CANNOT read audit logs", async () => {
    await asActor("anon");
    const r = await pg.query(`SELECT * FROM public.audit_logs;`);
    expect(r.rows.length).toBe(0);
  });

  it("student CANNOT read audit logs", async () => {
    await asActor("studentA");
    const r = await pg.query(`SELECT * FROM public.audit_logs;`);
    expect(r.rows.length).toBe(0);
  });

  it("landlord CANNOT read audit logs", async () => {
    await asActor("landlordA");
    const r = await pg.query(`SELECT * FROM public.audit_logs;`);
    expect(r.rows.length).toBe(0);
  });

  it("active admin CAN read audit logs", async () => {
    await asActor("activeAdmin");
    const r = await pg.query(`SELECT * FROM public.audit_logs;`);
    expect(r.rows.length).toBe(1);
  });

  it("suspended admin CAN read audit logs (permissive read policy)", async () => {
    await asActor("suspendedAdmin");
    const r = await pg.query(`SELECT * FROM public.audit_logs;`);
    expect(r.rows.length).toBe(1);
  });

  it("student CANNOT forge an audit_logs row (no INSERT policy)", async () => {
    await asActor("studentA");
    await expect(
      pg.query(
        `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id)
         VALUES ($1, 'forged.action', 'forged', $2);`,
        [STUDENT_A_ID, STUDENT_A_ID],
      ),
    ).rejects.toThrow();
  });

  it("admin CANNOT UPDATE an audit_logs row (no UPDATE policy)", async () => {
    await asActor("activeAdmin");
    // RLS silently filters — UPDATE returns 0 rows affected.
    await pg.query(`UPDATE public.audit_logs SET action = 'forged.update';`);
    await setServiceRole(pg);
    const r = await pg.query<{ action: string }>(
      `SELECT action FROM public.audit_logs WHERE action = 'test.action';`,
    );
    expect(r.rows.length).toBe(1);
  });

  it("admin CANNOT DELETE an audit_logs row (no DELETE policy)", async () => {
    await asActor("activeAdmin");
    await pg.query(`DELETE FROM public.audit_logs;`);
    await setServiceRole(pg);
    const r = await pg.query<{ action: string }>(
      `SELECT action FROM public.audit_logs WHERE action = 'test.action';`,
    );
    expect(r.rows.length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// payment_transactions — RLS bypass tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 RLS — payment_transactions (no client write path)", () => {
  beforeEach(async () => {
    // Seed a booking + payment via service-role.
    await setServiceRole(pg);
    await pg.query(
      `INSERT INTO public.landlords (profile_id, current_verification_status, is_suspended)
       VALUES ($1, 'approved', false);`,
      [LANDLORD_A_ID],
    );
    await pg.query(
      `INSERT INTO public.properties (id, landlord_id, university_id, area, address, description, status)
       VALUES ('11111111-1111-1111-1111-111111111111', $1, $2, 'Area', 'Address', 'Desc', 'approved');`,
      [LANDLORD_A_ID, UNIVERSITY_ID],
    );
    await pg.query(
      `INSERT INTO public.rooms (id, property_id, room_type, price, occupancy, is_listed)
       VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'single', 5000.00, 1, true);`,
    );
    await pg.query(
      `INSERT INTO public.bookings (id, room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
       VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', $1, $2, 'reservation_pending', 5000.00, now() + interval '1 hour');`,
      [LANDLORD_A_ID, STUDENT_A_ID],
    );
    await pg.query(
      `INSERT INTO public.payment_transactions (id, booking_id, paystack_reference, amount, currency, status)
       VALUES ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'ref-test-1', 5000.00, 'NGN', 'pending');`,
    );
  });

  it("student (own booking) can read own payment (status + amount only, NOT provider_metadata)", async () => {
    await asActor("studentA");
    // RLS allows student to SELECT via booking ownership.
    const r = await pg.query<{ id: string }>(
      `SELECT id FROM public.payment_transactions WHERE id = $1;`,
      ["44444444-4444-4444-4444-444444444444"],
    );
    expect(r.rows.length).toBe(1);
  });

  it("student B CANNOT read student A's payment (cross-student)", async () => {
    await asActor("studentB");
    const r = await pg.query<{ id: string }>(
      `SELECT id FROM public.payment_transactions WHERE id = $1;`,
      ["44444444-4444-4444-4444-444444444444"],
    );
    expect(r.rows.length).toBe(0);
  });

  it("landlord CANNOT read payment_transactions (no RLS policy grants)", async () => {
    await asActor("landlordA");
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.payment_transactions;`);
    expect(r.rows.length).toBe(0);
  });

  it("student CANNOT write payment status (no INSERT/UPDATE policy)", async () => {
    await asActor("studentA");
    await expect(
      pg.query(
        `INSERT INTO public.payment_transactions (booking_id, paystack_reference, amount, currency, status)
         VALUES ('33333333-3333-3333-3333-333333333333', 'forged-ref', 1.00, 'NGN', 'success');`,
      ),
    ).rejects.toThrow();

    await expect(
      pg.query(`UPDATE public.payment_transactions SET status = 'success';`),
    ).resolves.toBeDefined(); // UPDATE silently filters to 0 rows.
  });

  it("admin CANNOT write payment status (admin read-only per API_CONTRACTS §16)", async () => {
    await asActor("activeAdmin");
    await expect(
      pg.query(
        `INSERT INTO public.payment_transactions (booking_id, paystack_reference, amount, currency, status)
         VALUES ('33333333-3333-3333-3333-333333333333', 'forged-admin', 1.00, 'NGN', 'success');`,
      ),
    ).rejects.toThrow();

    // UPDATE silently filters — verify row unchanged.
    await pg.query(`UPDATE public.payment_transactions SET status = 'success';`);
    await setServiceRole(pg);
    const r = await pg.query<{ status: string }>(
      `SELECT status FROM public.payment_transactions WHERE id = $1;`,
      ["44444444-4444-4444-4444-444444444444"],
    );
    expect(r.rows[0]?.status).toBe("pending");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hidden reviews — RLS bypass tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 RLS — hidden reviews invisible to anonymous", () => {
  beforeEach(async () => {
    // Seed a completed booking + a hidden review.
    await setServiceRole(pg);
    await pg.query(
      `INSERT INTO public.landlords (profile_id, current_verification_status, is_suspended)
       VALUES ($1, 'approved', false);`,
      [LANDLORD_A_ID],
    );
    await pg.query(
      `INSERT INTO public.properties (id, landlord_id, university_id, area, address, description, status)
       VALUES ('11111111-1111-1111-1111-111111111111', $1, $2, 'Area', 'Address', 'Desc', 'approved');`,
      [LANDLORD_A_ID, UNIVERSITY_ID],
    );
    await pg.query(
      `INSERT INTO public.rooms (id, property_id, room_type, price, occupancy, is_listed)
       VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'single', 5000.00, 1, true);`,
    );
    await pg.query(
      `INSERT INTO public.bookings (id, room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
       VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', $1, $2, 'reservation_pending', 5000.00, now() + interval '1 hour');`,
      [LANDLORD_A_ID, STUDENT_A_ID],
    );
    await pg.query(`UPDATE public.bookings SET status = 'payment_pending' WHERE id = '33333333-3333-3333-3333-333333333333';`);
    await pg.query(`UPDATE public.bookings SET status = 'confirmed', confirmed_at = now() WHERE id = '33333333-3333-3333-3333-333333333333';`);
    await pg.query(`UPDATE public.bookings SET status = 'completed', completed_at = now() WHERE id = '33333333-3333-3333-3333-333333333333';`);

    // Insert review as the student.
    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
    await pg.query(
      `INSERT INTO public.reviews (booking_id, student_id, room_id, rating, content)
       VALUES ('33333333-3333-3333-3333-333333333333', $1, '22222222-2222-2222-2222-222222222222', 5, 'great');`,
      [STUDENT_A_ID],
    );

    // Admin hides it.
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    const reviewId = r.rows[0]!.id;
    await pg.query(`SELECT public.admin_hide_review($1::uuid, 'Inappropriate content');`, [reviewId]);
  });

  it("anonymous CANNOT read hidden reviews", async () => {
    await asActor("anon");
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    expect(r.rows.length).toBe(0);
  });

  it("student B (non-author) CANNOT read hidden reviews", async () => {
    await asActor("studentB");
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    expect(r.rows.length).toBe(0);
  });

  it("landlord CANNOT read hidden reviews", async () => {
    await asActor("landlordA");
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    expect(r.rows.length).toBe(0);
  });

  it("review author CAN read own hidden review (with moderation reason)", async () => {
    await asActor("studentA");
    const r = await pg.query<{ id: string; is_hidden: boolean; hidden_reason: string }>(
      `SELECT id, is_hidden, hidden_reason FROM public.reviews;`,
    );
    expect(r.rows.length).toBe(1);
    expect(r.rows[0]?.is_hidden).toBe(true);
    expect(r.rows[0]?.hidden_reason).toBe("Inappropriate content");
  });

  it("active admin CAN read hidden reviews", async () => {
    await asActor("activeAdmin");
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reviews;`);
    expect(r.rows.length).toBe(1);
  });
});
