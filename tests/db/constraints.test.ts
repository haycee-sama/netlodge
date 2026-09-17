/**
 * Phase 1 — database constraint tests.
 *
 * Verifies the actual database-enforced constraints:
 *   * Duplicate university names fail (UNIQUE)
 *   * Invalid profile references fail (FK)
 *   * Deleting an auth user cascades to their profile
 *   * Protected profile fields cannot be escalated even via direct SQL
 *     (this overlaps with profiles-rls.test.ts but is restated here from
 *      the constraint perspective)
 *   * Suspension without reason fails (CHECK)
 *
 * Source of truth: DATABASE_SCHEMA.md §22, §21.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  makeFreshDb,
  setServiceRole,
  createAuthUser,
  createProfile,
  querySucceeds,
} from "./helpers";
import type { PGlite } from "@electric-sql/pglite";

let pg: PGlite;

beforeEach(async () => {
  pg = await makeFreshDb();
});

afterEach(async () => {
  await pg.close();
});

describe("universities constraints", () => {
  it("duplicate university name fails (UNIQUE)", async () => {
    await setServiceRole(pg);
    const ok = await querySucceeds(pg, `
      INSERT INTO public.universities (name, city, state)
      VALUES ('University of Lagos', 'Anywhere', 'Anywhere');
    `);
    expect(ok).toBe(false);
  });

  it("a different university name succeeds", async () => {
    await setServiceRole(pg);
    const ok = await querySucceeds(pg, `
      INSERT INTO public.universities (name, city, state)
      VALUES ('University of Ibadan', 'Ibadan', 'Oyo');
    `);
    expect(ok).toBe(true);
  });
});

describe("profiles foreign-key constraints", () => {
  it("INSERT into profiles fails when id does not exist in auth.users", async () => {
    await setServiceRole(pg);
    const ok = await querySucceeds(pg, `
      INSERT INTO public.profiles (id, role, full_name, phone)
      VALUES ('44444444-4444-4444-4444-444444444444', 'student', 'Ghost', '+234');
    `);
    // FK violation — the auth.users row doesn't exist.
    expect(ok).toBe(false);
  });

  it("INSERT into profiles succeeds when id exists in auth.users", async () => {
    await setServiceRole(pg);
    await createAuthUser(pg, "44444444-4444-4444-4444-444444444444", "x@example.com");
    const ok = await querySucceeds(pg, `
      INSERT INTO public.profiles (id, role, full_name, phone)
      VALUES ('44444444-4444-4444-4444-444444444444', 'student', 'Real', '+234');
    `);
    expect(ok).toBe(true);
  });

  it("INSERT into profiles with invalid university_id fails (FK)", async () => {
    await setServiceRole(pg);
    await createAuthUser(pg, "55555555-5555-5555-5555-555555555555", "y@example.com");
    const ok = await querySucceeds(pg, `
      INSERT INTO public.profiles (id, role, full_name, phone, university_id)
      VALUES (
        '55555555-5555-5555-5555-555555555555',
        'student',
        'Test',
        '+234',
        '99999999-9999-9999-9999-999999999999'
      );
    `);
    expect(ok).toBe(false);
  });

  it("INSERT into profiles with valid university_id succeeds", async () => {
    await setServiceRole(pg);
    await createAuthUser(pg, "66666666-6666-6666-6666-666666666666", "z@example.com");
    const ok = await querySucceeds(pg, `
      INSERT INTO public.profiles (id, role, full_name, phone, university_id)
      VALUES (
        '66666666-6666-6666-6666-666666666666',
        'student',
        'Test',
        '+234',
        '00000000-0000-0000-0000-000000000001'
      );
    `);
    expect(ok).toBe(true);
  });
});

describe("profiles CASCADE on auth.users delete", () => {
  it("deleting the auth.users row CASCADES to delete the profiles row", async () => {
    await setServiceRole(pg);
    const profileId = "77777777-7777-7777-7777-777777777777";
    await createAuthUser(pg, profileId, "cascade@example.com");
    await createProfile(pg, {
      id: profileId,
      role: "student",
      full_name: "Cascade Test",
      phone: "+234",
    });

    // Confirm profile exists.
    const before = await pg.query(
      `SELECT id FROM public.profiles WHERE id = $1;`,
      [profileId],
    );
    expect(before.rows.length).toBe(1);

    // Delete the auth.users row.
    await pg.query(`DELETE FROM auth.users WHERE id = $1;`, [profileId]);

    // Profile should be gone via CASCADE.
    const after = await pg.query(
      `SELECT id FROM public.profiles WHERE id = $1;`,
      [profileId],
    );
    expect(after.rows.length).toBe(0);
  });
});

describe("profiles.university_id ON DELETE SET NULL", () => {
  it("deleting a university nulls profiles.university_id (does NOT cascade)", async () => {
    await setServiceRole(pg);
    const profileId = "88888888-8888-8888-8888-888888888888";
    await createAuthUser(pg, profileId, "setnull@example.com");
    await createProfile(pg, {
      id: profileId,
      role: "student",
      full_name: "SetNull Test",
      phone: "+234",
      university_id: "00000000-0000-0000-0000-000000000001", // the seed university
    });

    // Confirm the FK is set.
    const before = await pg.query<{ university_id: string | null }>(
      `SELECT university_id FROM public.profiles WHERE id = $1;`,
      [profileId],
    );
    expect(before.rows[0]?.university_id).toBe(
      "00000000-0000-0000-0000-000000000001",
    );

    // Delete the university via service-role.
    await pg.query(`
      DELETE FROM public.universities WHERE name = 'University of Lagos';
    `);

    // The profile should still exist, with university_id NULL'd.
    const after = await pg.query<{ id: string; university_id: string | null }>(
      `SELECT id, university_id FROM public.profiles WHERE id = $1;`,
      [profileId],
    );
    expect(after.rows.length).toBe(1);
    expect(after.rows[0]?.university_id).toBeNull();
  });
});

describe("profiles.suspension_reason CHECK constraint", () => {
  it("INSERT with account_status='suspended' and no suspension_reason fails", async () => {
    await setServiceRole(pg);
    await createAuthUser(pg, "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1", "a1@example.com");
    const ok = await querySucceeds(pg, `
      INSERT INTO public.profiles (id, role, full_name, phone, account_status)
      VALUES (
        'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
        'student',
        'Test',
        '+234',
        'suspended'
      );
    `);
    expect(ok).toBe(false);
  });

  it("INSERT with account_status='suspended' and suspension_reason succeeds", async () => {
    await setServiceRole(pg);
    await createAuthUser(pg, "b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2", "b2@example.com");
    const ok = await querySucceeds(pg, `
      INSERT INTO public.profiles (id, role, full_name, phone, account_status, suspension_reason)
      VALUES (
        'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
        'student',
        'Test',
        '+234',
        'suspended',
        'Test reason'
      );
    `);
    expect(ok).toBe(true);
  });

  it("INSERT with account_status='active' and NULL suspension_reason succeeds (default)", async () => {
    await setServiceRole(pg);
    await createAuthUser(pg, "c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3", "c3@example.com");
    const ok = await querySucceeds(pg, `
      INSERT INTO public.profiles (id, role, full_name, phone)
      VALUES ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'student', 'Test', '+234');
    `);
    expect(ok).toBe(true);
  });
});

describe("profiles — enum constraint (invalid role value)", () => {
  it("INSERT with invalid role value fails", async () => {
    await setServiceRole(pg);
    await createAuthUser(pg, "d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4", "d4@example.com");
    // 'superadmin' is not in the user_role enum — Postgres rejects.
    const ok = await querySucceeds(pg, `
      INSERT INTO public.profiles (id, role, full_name, phone)
      VALUES ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'superadmin', 'Test', '+234');
    `);
    expect(ok).toBe(false);
  });
});

describe("profiles — column-guard trigger via service-role bypass", () => {
  it("service-role code (no JWT) CAN change role — used by registration Server Actions", async () => {
    await setServiceRole(pg);
    await createAuthUser(pg, "e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5", "e5@example.com");
    await createProfile(pg, {
      id: "e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5",
      role: "student",
      full_name: "Service-Role Test",
      phone: "+234",
    });

    // Service-role can promote the user (legitimate admin action via
    // privileged server code path).
    const ok = await querySucceeds(pg, `
      UPDATE public.profiles
      SET role = 'admin'
      WHERE id = 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5';
    `);
    expect(ok).toBe(true);
  });
});
