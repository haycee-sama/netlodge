/**
 * Phase 1 — profiles RLS tests.
 *
 * Verifies the actual database security boundary, NOT application code.
 * Each test sets the JWT claims to simulate an authenticated session, then
 * attempts an operation directly via SQL — exactly what a malicious client
 * would do via Supabase's REST API.
 *
 * Coverage (per Phase 1 task spec):
 *   1. Anonymous cannot read protected profile records.
 *   2. Authenticated user can read their own profile.
 *   3. Authenticated user cannot modify their own `role`.
 *   4. Authenticated user cannot modify their own `account_status`.
 *   5. Authenticated user cannot read another user's profile.
 *   6. Admin can read all profiles.
 *   7. Admin can update any profile (including protected fields).
 *
 * Source of truth: DATABASE_SCHEMA.md §24, TECHNICAL_ARCHITECTURE.md §8,
 * API_CONTRACTS.md §3.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  makeFreshDb,
  setJwtClaims,
  clearJwtClaims,
  setServiceRole,
  createAuthUser,
  createProfile,
  querySucceeds,
} from "./helpers";
import type { PGlite } from "@electric-sql/pglite";

const STUDENT_A_ID = "11111111-1111-1111-1111-111111111111";
const STUDENT_B_ID = "22222222-2222-2222-2222-222222222222";
const ADMIN_ID = "33333333-3333-3333-3333-333333333333";

let pg: PGlite;

beforeEach(async () => {
  pg = await makeFreshDb();

  // Set up three users: two students and one admin.
  // createProfile uses service-role context (no JWT) — mirrors how the
  // registration Server Action writes the row in production.
  await createAuthUser(pg, STUDENT_A_ID, "student-a@example.com");
  await createProfile(pg, {
    id: STUDENT_A_ID,
    role: "student",
    full_name: "Student A",
    phone: "+2348000000001",
  });

  await createAuthUser(pg, STUDENT_B_ID, "student-b@example.com");
  await createProfile(pg, {
    id: STUDENT_B_ID,
    role: "student",
    full_name: "Student B",
    phone: "+2348000000002",
  });

  await createAuthUser(pg, ADMIN_ID, "admin@example.com");
  await createProfile(pg, {
    id: ADMIN_ID,
    role: "admin",
    full_name: "Admin User",
    phone: "+2348000000003",
  });
});

afterEach(async () => {
  await pg.close();
});

describe("profiles RLS — anonymous access", () => {
  beforeEach(async () => {
    await clearJwtClaims(pg);
  });

  it("anonymous user cannot SELECT profiles", async () => {
    const result = await pg.query(`SELECT id FROM public.profiles;`);
    expect(result.rows.length).toBe(0);
  });

  it("anonymous user cannot INSERT profiles", async () => {
    const ok = await querySucceeds(pg, `
      INSERT INTO public.profiles (id, role, full_name, phone)
      VALUES ('99999999-9999-9999-9999-999999999999', 'admin', 'Hacker', '+234');
    `);
    expect(ok).toBe(false);
  });

  it("anonymous user cannot UPDATE profiles (e.g., escalate role)", async () => {
    // UPDATE doesn't throw on no-rows-affected; it just affects 0 rows.
    // We assert the actual security property: the role value didn't change.
    await pg.query(`
      UPDATE public.profiles SET role = 'admin' WHERE id = '${STUDENT_A_ID}';
    `);

    // Confirm via service-role that role is unchanged — defense in depth.
    await setServiceRole(pg);
    const svcResult = await pg.query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1;`,
      [STUDENT_A_ID],
    );
    expect(svcResult.rows[0]?.role).toBe("student");
  });
});

describe("profiles RLS — authenticated self access", () => {
  beforeEach(async () => {
    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
  });

  it("student can SELECT their own profile row", async () => {
    const result = await pg.query<{ id: string; full_name: string }>(
      `SELECT id, full_name FROM public.profiles;`,
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.id).toBe(STUDENT_A_ID);
    expect(result.rows[0]?.full_name).toBe("Student A");
  });

  it("student can UPDATE own non-protected fields (full_name, phone)", async () => {
    const ok = await querySucceeds(pg, `
      UPDATE public.profiles SET full_name = 'Student A Updated' WHERE id = '${STUDENT_A_ID}';
    `);
    expect(ok).toBe(true);

    const result = await pg.query<{ full_name: string }>(
      `SELECT full_name FROM public.profiles;`,
    );
    expect(result.rows[0]?.full_name).toBe("Student A Updated");
  });

  it("student CANNOT UPDATE own role (column-guard trigger blocks it)", async () => {
    // The RLS UPDATE policy allows the UPDATE (id = auth.uid() matches).
    // The column-guard trigger fires BEFORE UPDATE OF role, account_status
    // and rejects because the acting user is not admin.
    const ok = await querySucceeds(pg, `
      UPDATE public.profiles SET role = 'admin' WHERE id = '${STUDENT_A_ID}';
    `);
    expect(ok).toBe(false);

    // Verify role is unchanged via service-role read.
    await setServiceRole(pg);
    const result = await pg.query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1;`,
      [STUDENT_A_ID],
    );
    expect(result.rows[0]?.role).toBe("student");
  });

  it("student CANNOT UPDATE own account_status (column-guard trigger blocks it)", async () => {
    const ok = await querySucceeds(pg, `
      UPDATE public.profiles
      SET account_status = 'suspended', suspension_reason = 'self-suspend attempt'
      WHERE id = '${STUDENT_A_ID}';
    `);
    expect(ok).toBe(false);

    // Status unchanged.
    await setServiceRole(pg);
    const result = await pg.query<{ account_status: string }>(
      `SELECT account_status FROM public.profiles WHERE id = $1;`,
      [STUDENT_A_ID],
    );
    expect(result.rows[0]?.account_status).toBe("active");
  });

  it("student cannot INSERT a profiles row (RLS denies all inserts)", async () => {
    // Even though this would create a "fake" student profile for the same
    // auth.uid(), RLS has no INSERT policy — denied by default.
    const ok = await querySucceeds(pg, `
      INSERT INTO public.profiles (id, role, full_name, phone)
      VALUES ('${STUDENT_A_ID}', 'admin', 'Hijacked', '+234');
    `);
    expect(ok).toBe(false);
  });

  it("student cannot DELETE their own profile (RLS denies all deletes)", async () => {
    // DELETE doesn't throw on no-rows-affected; it just deletes 0 rows.
    // Verify by counting rows after: the student's profile must still exist.
    await pg.query(`DELETE FROM public.profiles;`);
    const result = await pg.query<{ id: string }>(
      `SELECT id FROM public.profiles;`,
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.id).toBe(STUDENT_A_ID);
  });
});

describe("profiles RLS — cross-user access", () => {
  beforeEach(async () => {
    await setJwtClaims(pg, { sub: STUDENT_A_ID, role: "authenticated" });
  });

  it("student cannot SELECT another student's profile row", async () => {
    // RLS makes SELECT act as a filter — Student A sees only their own row,
    // not Student B's. This is the actual Supabase behavior: a query
    // returns zero rows for non-owned data, NOT an error.
    const result = await pg.query(`
      SELECT id, full_name FROM public.profiles WHERE id = '${STUDENT_B_ID}';
    `);
    expect(result.rows.length).toBe(0);
  });

  it("student cannot UPDATE another student's profile (e.g., set role)", async () => {
    // The UPDATE policy USING clause requires id = auth.uid(); Student A's
    // UPDATE on Student B's row fails the USING check (zero rows match).
    // Even if it somehow passed, the column-guard trigger would block
    // role changes by a non-admin.
    const ok = await querySucceeds(pg, `
      UPDATE public.profiles SET role = 'admin' WHERE id = '${STUDENT_B_ID}';
    `);
    expect(ok).toBe(true); // UPDATE executes (no error) but affects 0 rows.

    // Verify Student B's role is unchanged.
    await setServiceRole(pg);
    const result = await pg.query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1;`,
      [STUDENT_B_ID],
    );
    expect(result.rows[0]?.role).toBe("student");
  });
});

describe("profiles RLS — admin access", () => {
  beforeEach(async () => {
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
  });

  it("admin can SELECT all profile rows", async () => {
    const result = await pg.query<{ id: string }>(
      `SELECT id FROM public.profiles;`,
    );
    expect(result.rows.length).toBe(3);
    const ids = result.rows.map((r) => r.id).sort();
    expect(ids).toEqual([ADMIN_ID, STUDENT_A_ID, STUDENT_B_ID].sort());
  });

  it("admin can UPDATE another user's role (legitimate admin action)", async () => {
    const ok = await querySucceeds(pg, `
      UPDATE public.profiles SET role = 'landlord' WHERE id = '${STUDENT_A_ID}';
    `);
    expect(ok).toBe(true);

    await setServiceRole(pg);
    const result = await pg.query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1;`,
      [STUDENT_A_ID],
    );
    expect(result.rows[0]?.role).toBe("landlord");
  });

  it("admin can suspend a user (legitimate admin action)", async () => {
    const ok = await querySucceeds(pg, `
      UPDATE public.profiles
      SET account_status = 'suspended', suspension_reason = 'Policy violation'
      WHERE id = '${STUDENT_A_ID}';
    `);
    expect(ok).toBe(true);

    await setServiceRole(pg);
    const result = await pg.query<{ account_status: string; suspension_reason: string | null }>(
      `SELECT account_status, suspension_reason FROM public.profiles WHERE id = $1;`,
      [STUDENT_A_ID],
    );
    expect(result.rows[0]?.account_status).toBe("suspended");
    expect(result.rows[0]?.suspension_reason).toBe("Policy violation");
  });

  it("admin UPDATE is rejected if suspension_reason is missing (CHECK constraint)", async () => {
    // The CHECK constraint requires suspension_reason when status = 'suspended'.
    // Applies to admin too — the constraint is the database enforcing the rule,
    // not the application.
    const ok = await querySucceeds(pg, `
      UPDATE public.profiles
      SET account_status = 'suspended', suspension_reason = NULL
      WHERE id = '${STUDENT_A_ID}';
    `);
    expect(ok).toBe(false);
  });
});

describe("profiles — auth.users CASCADE behavior", () => {
  it("deleting an auth.users row cascades to delete the profiles row", async () => {
    // Use service-role (no JWT) — auth.users is not RLS-protected in our
    // test stub, so any context can delete from it.
    await setServiceRole(pg);

    // Confirm the profile exists before delete.
    const before = await pg.query(
      `SELECT id FROM public.profiles WHERE id = $1;`,
      [STUDENT_A_ID],
    );
    expect(before.rows.length).toBe(1);

    // Delete the auth.users row.
    await pg.query(`DELETE FROM auth.users WHERE id = $1;`, [STUDENT_A_ID]);

    // The corresponding profile row should be gone (CASCADE).
    const after = await pg.query(
      `SELECT id FROM public.profiles WHERE id = $1;`,
      [STUDENT_A_ID],
    );
    expect(after.rows.length).toBe(0);
  });
});
