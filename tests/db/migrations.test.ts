/**
 * Phase 1 — schema tests.
 *
 * Verifies the actual database structure against DATABASE_SCHEMA.md §4.1, §4.4:
 *   - All Phase 1 tables exist (profiles, universities)
 *   - Required columns exist with correct types
 *   - Enums exist with the approved value sets
 *   - pgcrypto extension is installed
 *   - Foreign keys exist
 *   - Unique constraints exist
 *
 * Tests the actual database boundary, not application code.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFreshDb } from "./helpers";
import type { PGlite } from "@electric-sql/pglite";

let pg: PGlite;

beforeEach(async () => {
  pg = await makeFreshDb();
});

afterEach(async () => {
  await pg.close();
});

describe("Phase 1–5 migration determinism", () => {
  it("migrations are re-applicable to a fresh database (idempotent)", async () => {
    // This is implicitly tested by makeFreshDb() running before every test
    // in this file — if migrations weren't re-applicable, the second test
    // onward would fail. Explicitly assert the expected tables exist after
    // a fresh makeFreshDb() cycle.
    //
    // Phase 4 added `landlords` + `landlord_verifications` to the expected
    // set. (Migration 0004 — storage buckets — is intentionally excluded
    // from pglite; see tests/db/helpers.ts.)
    const result = await pg.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    const tables = result.rows.map((r) => r.table_name);
    expect(tables).toEqual([
      "audit_logs",
      "bookings",
      "landlord_verifications",
      "landlords",
      "payment_transactions",
      "payment_webhook_events",
      "profiles",
      "properties",
      "property_images",
      "property_reviews",
      "reports",
      "reviews",
      "room_images",
      "rooms",
      "universities",
    ]);
  });

  it("seed applies (launch-target university is present)", async () => {
    const result = await pg.query<{ name: string }>(`
      SELECT name FROM public.universities;
    `);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.name).toBe("University of Lagos");
  });
});

describe("Phase 1 schema — extensions", () => {
  it("pgcrypto extension is installed", async () => {
    const result = await pg.query<{ extname: string }>(`
      SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';
    `);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.extname).toBe("pgcrypto");
  });

  it("gen_random_uuid() is callable (pgcrypto function)", async () => {
    const result = await pg.query<{ uuid: string }>(
      `SELECT gen_random_uuid() AS uuid;`,
    );
    expect(result.rows[0]?.uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});

describe("Phase 1 schema — enums (DATABASE_SCHEMA.md §4, §26)", () => {
  const expectedEnums: Record<string, string[]> = {
    user_role: ["student", "landlord", "admin"],
    account_status: ["active", "suspended"],
    verification_status: [
      "unsubmitted",
      "submitted",
      "under_review",
      "approved",
      "rejected",
    ],
    decision_type: ["approved", "rejected"],
    property_status: [
      "draft",
      "submitted",
      "under_review",
      "approved",
      "rejected",
      "archived",
    ],
    booking_status: [
      "reservation_pending",
      "payment_pending",
      "confirmed",
      "payment_failed",
      "expired",
      "cancelled",
      "completed",
    ],
    payment_status: ["initiated", "pending", "success", "failed", "expired"],
    webhook_outcome: [
      "confirmed",
      "duplicate_ignored",
      "verification_failed",
      "reconciliation_needed",
      "malformed_payload",
    ],
    report_status: ["open", "under_review", "resolved"],
    report_target: ["property", "room", "user"],
  };

  for (const [enumName, expectedValues] of Object.entries(expectedEnums)) {
    it(`${enumName} enum exists with values: ${expectedValues.join(", ")}`, async () => {
      const result = await pg.query<{ enumlabel: string }>(
        `
        SELECT enumlabel
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = $1
        ORDER BY e.enumsortorder;
        `,
        [enumName],
      );
      const actualValues = result.rows.map((r) => r.enumlabel);
      expect(actualValues).toEqual(expectedValues);
    });
  }
});

describe("Phase 1 schema — profiles table (DATABASE_SCHEMA.md §4.1)", () => {
  it("profiles table exists", async () => {
    const result = await pg.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'profiles';
    `);
    expect(result.rows.length).toBe(1);
  });

  it("profiles has all required columns with correct types", async () => {
    const result = await pg.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles'
      ORDER BY ordinal_position;
    `);
    const cols = result.rows as Array<{
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: string;
      column_default: string | null;
    }>;
    const colMap = new Map(cols.map((c) => [c.column_name, c]));

    // id — uuid, NOT NULL, no default (PK supplied by registration Server Action)
    expect(colMap.get("id")?.data_type).toBe("uuid");
    expect(colMap.get("id")?.is_nullable).toBe("NO");

    // role — user_role enum, NOT NULL
    expect(colMap.get("role")?.udt_name).toBe("user_role");
    expect(colMap.get("role")?.is_nullable).toBe("NO");

    // full_name — text, NOT NULL
    expect(colMap.get("full_name")?.data_type).toBe("text");
    expect(colMap.get("full_name")?.is_nullable).toBe("NO");

    // phone — text, NOT NULL
    expect(colMap.get("phone")?.data_type).toBe("text");
    expect(colMap.get("phone")?.is_nullable).toBe("NO");

    // university_id — uuid, nullable
    expect(colMap.get("university_id")?.data_type).toBe("uuid");
    expect(colMap.get("university_id")?.is_nullable).toBe("YES");

    // account_status — account_status enum, NOT NULL, default 'active'
    expect(colMap.get("account_status")?.udt_name).toBe("account_status");
    expect(colMap.get("account_status")?.is_nullable).toBe("NO");
    expect(colMap.get("account_status")?.column_default).toContain("'active'");

    // suspension_reason — text, nullable
    expect(colMap.get("suspension_reason")?.data_type).toBe("text");
    expect(colMap.get("suspension_reason")?.is_nullable).toBe("YES");

    // created_at — timestamptz, NOT NULL, default now()
    expect(colMap.get("created_at")?.data_type).toBe("timestamp with time zone");
    expect(colMap.get("created_at")?.is_nullable).toBe("NO");
    expect(colMap.get("created_at")?.column_default).toContain("now()");

    // updated_at — timestamptz, NOT NULL, default now()
    expect(colMap.get("updated_at")?.data_type).toBe("timestamp with time zone");
    expect(colMap.get("updated_at")?.is_nullable).toBe("NO");
    expect(colMap.get("updated_at")?.column_default).toContain("now()");
  });

  it("profiles.id is the primary key", async () => {
    const result = await pg.query<{ attname: string }>(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'public.profiles'::regclass AND i.indisprimary;
    `);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.attname).toBe("id");
  });

  it("profiles.id has FK to auth.users.id with ON DELETE CASCADE", async () => {
    const result = await pg.query<{ on_delete: string }>(`
      SELECT confdeltype AS on_delete
      FROM pg_constraint
      WHERE conname = 'profiles_id_fkey';
    `);
    expect(result.rows.length).toBe(1);
    // 'c' = CASCADE in pg_constraint.confdeltype
    expect(result.rows[0]?.on_delete).toBe("c");
  });

  it("profiles.university_id has FK to universities.id with ON DELETE SET NULL", async () => {
    const result = await pg.query<{ on_delete: string }>(`
      SELECT confdeltype AS on_delete
      FROM pg_constraint
      WHERE conname = 'profiles_university_id_fkey';
    `);
    expect(result.rows.length).toBe(1);
    // 'n' = SET NULL in pg_constraint.confdeltype
    expect(result.rows[0]?.on_delete).toBe("n");
  });

  it("profiles has CHECK constraint requiring suspension_reason when suspended", async () => {
    const result = await pg.query<{ conname: string }>(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.profiles'::regclass
        AND contype = 'c';
    `);
    const names = result.rows.map((r) => r.conname);
    expect(names).toContain("profiles_suspension_reason_required");
  });

  it("profiles RLS is enabled", async () => {
    const result = await pg.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(`
      SELECT relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE relname = 'profiles';
    `);
    expect(result.rows[0]?.relrowsecurity).toBe(true);
    expect(result.rows[0]?.relforcerowsecurity).toBe(true);
  });

  it("profiles has the column-guard trigger", async () => {
    const result = await pg.query<{ tgname: string }>(`
      SELECT tgname
      FROM pg_trigger
      WHERE tgrelid = 'public.profiles'::regclass
        AND NOT tgisinternal;
    `);
    const triggerNames = result.rows.map((r) => r.tgname);
    expect(triggerNames).toContain("profiles_guard_protected_columns");
    expect(triggerNames).toContain("profiles_set_updated_at");
  });
});

describe("Phase 1 schema — universities table (DATABASE_SCHEMA.md §4.4)", () => {
  it("universities table exists", async () => {
    const result = await pg.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'universities';
    `);
    expect(result.rows.length).toBe(1);
  });

  it("universities has all required columns", async () => {
    const result = await pg.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'universities'
      ORDER BY ordinal_position;
    `);
    const cols = result.rows as Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>;
    const colMap = new Map(cols.map((c) => [c.column_name, c]));

    expect(colMap.get("id")?.data_type).toBe("uuid");
    expect(colMap.get("id")?.is_nullable).toBe("NO");
    expect(colMap.get("id")?.column_default).toContain("gen_random_uuid()");

    expect(colMap.get("name")?.data_type).toBe("text");
    expect(colMap.get("name")?.is_nullable).toBe("NO");

    expect(colMap.get("city")?.data_type).toBe("text");
    expect(colMap.get("city")?.is_nullable).toBe("NO");

    expect(colMap.get("state")?.data_type).toBe("text");
    expect(colMap.get("state")?.is_nullable).toBe("NO");

    expect(colMap.get("is_active")?.data_type).toBe("boolean");
    expect(colMap.get("is_active")?.is_nullable).toBe("NO");
    expect(colMap.get("is_active")?.column_default).toContain("true");

    expect(colMap.get("created_at")?.data_type).toBe(
      "timestamp with time zone",
    );
    expect(colMap.get("created_at")?.is_nullable).toBe("NO");
    expect(colMap.get("created_at")?.column_default).toContain("now()");
  });

  it("universities.id is the primary key", async () => {
    const result = await pg.query<{ attname: string }>(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'public.universities'::regclass AND i.indisprimary;
    `);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.attname).toBe("id");
  });

  it("universities.name has UNIQUE constraint", async () => {
    const result = await pg.query<{ conname: string }>(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.universities'::regclass
        AND contype = 'u';
    `);
    const names = result.rows.map((r) => r.conname);
    expect(names).toContain("universities_name_unique");
  });

  it("universities RLS is enabled", async () => {
    const result = await pg.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(`
      SELECT relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE relname = 'universities';
    `);
    expect(result.rows[0]?.relrowsecurity).toBe(true);
    expect(result.rows[0]?.relforcerowsecurity).toBe(true);
  });
});
