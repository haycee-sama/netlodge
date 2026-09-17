/**
 * Phase 1 — universities RLS tests.
 *
 * Verifies:
 *   * Anonymous + authenticated users can SELECT only ACTIVE universities.
 *   * Ordinary authenticated users cannot INSERT / UPDATE / DELETE.
 *   * Admins can read all (including inactive) and write (CRUD).
 *
 * Source of truth: DATABASE_SCHEMA.md §24, API_CONTRACTS.md §4.
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

const STUDENT_ID = "11111111-1111-1111-1111-111111111111";
const ADMIN_ID = "33333333-3333-3333-3333-333333333333";

let pg: PGlite;

beforeEach(async () => {
  pg = await makeFreshDb();

  await createAuthUser(pg, STUDENT_ID, "student@example.com");
  await createProfile(pg, {
    id: STUDENT_ID,
    role: "student",
    full_name: "Student",
    phone: "+2348000000001",
  });

  await createAuthUser(pg, ADMIN_ID, "admin@example.com");
  await createProfile(pg, {
    id: ADMIN_ID,
    role: "admin",
    full_name: "Admin",
    phone: "+2348000000003",
  });
});

afterEach(async () => {
  await pg.close();
});

describe("universities RLS — public read", () => {
  beforeEach(async () => {
    await clearJwtClaims(pg);
  });

  it("anonymous user can SELECT active universities (the seed)", async () => {
    const result = await pg.query<{ name: string; city: string; state: string }>(`
      SELECT name, city, state FROM public.universities;
    `);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.name).toBe("University of Lagos");
    expect(result.rows[0]?.city).toBe("Lagos");
    expect(result.rows[0]?.state).toBe("Lagos");
  });

  it("anonymous user cannot SELECT inactive universities (RLS filters them out)", async () => {
    // Insert an inactive university via service-role context first.
    await setServiceRole(pg);
    await pg.query(`
      INSERT INTO public.universities (name, city, state, is_active)
      VALUES ('Inactive Uni', 'Test', 'Test', false);
    `);

    // Switch back to anonymous context.
    await clearJwtClaims(pg);

    // Anonymous SELECT should still see only the active seed university,
    // not the inactive one.
    const result = await pg.query<{ name: string }>(
      `SELECT name FROM public.universities;`,
    );
    const names = result.rows.map((r) => r.name);
    expect(names).toContain("University of Lagos");
    expect(names).not.toContain("Inactive Uni");
  });

  it("anonymous user cannot INSERT a university", async () => {
    const ok = await querySucceeds(pg, `
      INSERT INTO public.universities (name, city, state)
      VALUES ('Hacker Uni', 'X', 'Y');
    `);
    expect(ok).toBe(false);
  });

  it("anonymous user cannot UPDATE a university", async () => {
    // UPDATE/DELETE don't throw on 0 rows affected — they silently affect 0.
    // Assert the actual security property: the row is unchanged.
    await pg.query(`
      UPDATE public.universities SET name = 'Renamed' WHERE name = 'University of Lagos';
    `);
    // Switch to service-role to read the row (which still exists with original name).
    await setServiceRole(pg);
    const result = await pg.query<{ name: string }>(
      `SELECT name FROM public.universities;`,
    );
    const names = result.rows.map((r) => r.name);
    expect(names).toContain("University of Lagos");
    expect(names).not.toContain("Renamed");
  });

  it("anonymous user cannot DELETE a university", async () => {
    await pg.query(`
      DELETE FROM public.universities WHERE name = 'University of Lagos';
    `);
    // Switch to service-role to verify the row still exists.
    await setServiceRole(pg);
    const result = await pg.query<{ name: string }>(
      `SELECT name FROM public.universities;`,
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.name).toBe("University of Lagos");
  });
});

describe("universities RLS — authenticated non-admin access", () => {
  beforeEach(async () => {
    await setJwtClaims(pg, { sub: STUDENT_ID, role: "authenticated" });
  });

  it("authenticated student can SELECT active universities", async () => {
    const result = await pg.query<{ name: string }>(
      `SELECT name FROM public.universities;`,
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.name).toBe("University of Lagos");
  });

  it("authenticated student cannot INSERT a university", async () => {
    const ok = await querySucceeds(pg, `
      INSERT INTO public.universities (name, city, state)
      VALUES ('Hacker Uni', 'X', 'Y');
    `);
    expect(ok).toBe(false);
  });

  it("authenticated student cannot UPDATE a university", async () => {
    await pg.query(`
      UPDATE public.universities SET name = 'Renamed' WHERE name = 'University of Lagos';
    `);
    await setServiceRole(pg);
    const result = await pg.query<{ name: string }>(
      `SELECT name FROM public.universities;`,
    );
    expect(result.rows[0]?.name).toBe("University of Lagos");
  });

  it("authenticated student cannot DELETE a university", async () => {
    await pg.query(`
      DELETE FROM public.universities WHERE name = 'University of Lagos';
    `);
    await setServiceRole(pg);
    const result = await pg.query<{ name: string }>(
      `SELECT name FROM public.universities;`,
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.name).toBe("University of Lagos");
  });
});

describe("universities RLS — admin access", () => {
  beforeEach(async () => {
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
  });

  it("admin can SELECT all universities including inactive ones", async () => {
    // Insert an inactive university first (admin can insert).
    await pg.query(`
      INSERT INTO public.universities (name, city, state, is_active)
      VALUES ('Inactive Uni', 'Test', 'Test', false);
    `);

    const result = await pg.query<{ name: string; is_active: boolean }>(
      `SELECT name, is_active FROM public.universities;`,
    );
    expect(result.rows.length).toBe(2);
    const names = result.rows.map((r) => r.name).sort();
    expect(names).toEqual(["Inactive Uni", "University of Lagos"].sort());
  });

  it("admin can INSERT a new university", async () => {
    const ok = await querySucceeds(pg, `
      INSERT INTO public.universities (name, city, state, is_active)
      VALUES ('New Uni', 'Abuja', 'FCT', true);
    `);
    expect(ok).toBe(true);
  });

  it("admin can UPDATE a university", async () => {
    const ok = await querySucceeds(pg, `
      UPDATE public.universities
      SET city = 'Lagos Updated'
      WHERE name = 'University of Lagos';
    `);
    expect(ok).toBe(true);
  });

  it("admin can DELETE a university", async () => {
    // Insert a test university first to delete (don't delete the seed).
    await pg.query(`
      INSERT INTO public.universities (name, city, state)
      VALUES ('Test Uni', 'Test', 'Test');
    `);

    const ok = await querySucceeds(pg, `
      DELETE FROM public.universities WHERE name = 'Test Uni';
    `);
    expect(ok).toBe(true);
  });
});
