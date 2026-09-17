/**
 * Phase 4 — landlord verification DB tests.
 *
 * Tests the actual database security boundary: RLS, append-only trigger,
 * status-sync trigger, column-guard trigger, state machine. All run
 * against real Postgres 18 (pglite) with migration 0005 applied.
 *
 * TEST DOUBLES DISCLAIMER:
 *   These tests use a real Postgres engine (pglite) — NOT mocked. The
 *   trigger behavior, RLS policy enforcement, CHECK constraints, FK
 *   cascades are all real database behavior. The migration SQL is
 *   production-ready.
 *
 *   What is NOT verified here: real Supabase Storage integration
 *   (Phase 3 mocked that) + real Supabase Auth (Phase 2 mocked that).
 *   The combination of mocked auth/storage + real DB tests gives full
 *   coverage of the verification boundary.
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

const LANDLORD_A_ID = "11111111-1111-1111-1111-111111111111";
const LANDLORD_B_ID = "22222222-2222-2222-2222-222222222222";
const STUDENT_ID = "33333333-3333-3333-3333-333333333333";
const ADMIN_ID = "44444444-4444-4444-4444-444444444444";

let pg: PGlite;

beforeEach(async () => {
  pg = await makeFreshDb();

  // Create test users via the registration-style path (service-role).
  await createAuthUser(pg, LANDLORD_A_ID, "landlord-a@example.com");
  await createProfile(pg, {
    id: LANDLORD_A_ID,
    role: "landlord",
    full_name: "Landlord A",
    phone: "+2348000000001",
  });
  // Create the landlords row (service-role — bypasses RLS).
  await setServiceRole(pg);
  await pg.query(
    `INSERT INTO public.landlords (profile_id) VALUES ($1);`,
    [LANDLORD_A_ID],
  );

  await createAuthUser(pg, LANDLORD_B_ID, "landlord-b@example.com");
  await createProfile(pg, {
    id: LANDLORD_B_ID,
    role: "landlord",
    full_name: "Landlord B",
    phone: "+2348000000002",
  });
  await setServiceRole(pg);
  await pg.query(
    `INSERT INTO public.landlords (profile_id) VALUES ($1);`,
    [LANDLORD_B_ID],
  );

  await createAuthUser(pg, STUDENT_ID, "student@example.com");
  await createProfile(pg, {
    id: STUDENT_ID,
    role: "student",
    full_name: "Student",
    phone: "+2348000000003",
  });

  await createAuthUser(pg, ADMIN_ID, "admin@example.com");
  await createProfile(pg, {
    id: ADMIN_ID,
    role: "admin",
    full_name: "Admin",
    phone: "+2348000000004",
  });
});

afterEach(async () => {
  await pg.close();
});

/**
 * Helper: insert a verification row via service-role (test setup).
 * Returns the inserted row's id.
 */
async function insertVerificationRow(params: {
  landlordId: string;
  idRef?: string;
  ownershipRef?: string;
  status?: "submitted" | "under_review" | "approved" | "rejected";
  decision?: "approved" | "rejected" | null;
  decisionReason?: string | null;
}): Promise<string> {
  await setServiceRole(pg);
  const result = await pg.query<{ id: string }>(
    `INSERT INTO public.landlord_verifications
       (landlord_id, submitted_id_reference, submitted_ownership_reference, status, decision, decision_reason)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id;`,
    [
      params.landlordId,
      params.idRef ?? `verification/${params.landlordId}/id/test-uuid.jpg`,
      params.ownershipRef ?? `verification/${params.landlordId}/ownership_evidence/test-uuid.pdf`,
      params.status ?? "submitted",
      params.decision ?? null,
      params.decisionReason ?? null,
    ],
  );
  return result.rows[0]!.id;
}

// ── Schema tests ───────────────────────────────────────────────────────────

describe("Phase 4 schema — landlords table", () => {
  it("landlords table exists", async () => {
    const result = await pg.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'landlords';
    `);
    expect(result.rows.length).toBe(1);
  });

  it("landlords has all required columns", async () => {
    const result = await pg.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'landlords'
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

    expect(colMap.get("profile_id")?.data_type).toBe("uuid");
    expect(colMap.get("profile_id")?.is_nullable).toBe("NO");

    expect(colMap.get("current_verification_status")?.udt_name).toBe(
      "verification_status",
    );
    expect(colMap.get("current_verification_status")?.is_nullable).toBe("NO");
    expect(colMap.get("current_verification_status")?.column_default).toContain(
      "'unsubmitted'",
    );

    expect(colMap.get("verification_valid_until")?.data_type).toBe(
      "timestamp with time zone",
    );
    expect(colMap.get("verification_valid_until")?.is_nullable).toBe("YES");

    expect(colMap.get("is_suspended")?.data_type).toBe("boolean");
    expect(colMap.get("is_suspended")?.is_nullable).toBe("NO");
    expect(colMap.get("is_suspended")?.column_default).toContain("false");

    expect(colMap.get("suspension_reason")?.data_type).toBe("text");
    expect(colMap.get("suspension_reason")?.is_nullable).toBe("YES");

    expect(colMap.get("created_at")?.data_type).toBe(
      "timestamp with time zone",
    );
    expect(colMap.get("updated_at")?.data_type).toBe(
      "timestamp with time zone",
    );
  });

  it("landlords.profile_id is PK + FK to profiles.id with CASCADE", async () => {
    const pkResult = await pg.query<{ attname: string }>(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'public.landlords'::regclass AND i.indisprimary;
    `);
    expect(pkResult.rows[0]?.attname).toBe("profile_id");

    const fkResult = await pg.query<{ confdeltype: string }>(`
      SELECT confdeltype
      FROM pg_constraint
      WHERE conname = 'landlords_profile_id_fkey';
    `);
    expect(fkResult.rows[0]?.confdeltype).toBe("c"); // CASCADE
  });

  it("landlords has CHECK constraint requiring suspension_reason when is_suspended = true", async () => {
    const result = await pg.query<{ conname: string }>(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.landlords'::regclass AND contype = 'c';
    `);
    const names = result.rows.map((r) => r.conname);
    expect(names).toContain("landlords_suspension_reason_required");
  });

  it("landlords RLS is enabled + forced", async () => {
    const result = await pg.query<{
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`
      SELECT relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE relname = 'landlords';
    `);
    expect(result.rows[0]?.relrowsecurity).toBe(true);
    expect(result.rows[0]?.relforcerowsecurity).toBe(true);
  });

  it("landlords has the column-guard trigger (protects current_verification_status)", async () => {
    const result = await pg.query<{ tgname: string }>(`
      SELECT tgname
      FROM pg_trigger
      WHERE tgrelid = 'public.landlords'::regclass AND NOT tgisinternal;
    `);
    const names = result.rows.map((r) => r.tgname);
    expect(names).toContain("landlords_guard_protected_columns");
    expect(names).toContain("landlords_set_updated_at");
  });
});

describe("Phase 4 schema — landlord_verifications table", () => {
  it("landlord_verifications table exists", async () => {
    const result = await pg.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'landlord_verifications';
    `);
    expect(result.rows.length).toBe(1);
  });

  it("landlord_verifications has all required columns", async () => {
    const result = await pg.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'landlord_verifications'
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

    expect(colMap.get("id")?.data_type).toBe("uuid");
    expect(colMap.get("id")?.is_nullable).toBe("NO");
    expect(colMap.get("id")?.column_default).toContain("gen_random_uuid()");

    expect(colMap.get("landlord_id")?.data_type).toBe("uuid");
    expect(colMap.get("landlord_id")?.is_nullable).toBe("NO");

    expect(colMap.get("status")?.udt_name).toBe("verification_status");
    expect(colMap.get("status")?.is_nullable).toBe("NO");
    expect(colMap.get("status")?.column_default).toContain("'submitted'");

    expect(colMap.get("submitted_id_reference")?.data_type).toBe("text");
    expect(colMap.get("submitted_id_reference")?.is_nullable).toBe("NO");

    expect(colMap.get("submitted_ownership_reference")?.data_type).toBe("text");
    expect(colMap.get("submitted_ownership_reference")?.is_nullable).toBe("NO");

    expect(colMap.get("submitted_at")?.data_type).toBe(
      "timestamp with time zone",
    );
    expect(colMap.get("submitted_at")?.is_nullable).toBe("NO");
    expect(colMap.get("submitted_at")?.column_default).toContain("now()");

    expect(colMap.get("reviewed_by")?.data_type).toBe("uuid");
    expect(colMap.get("reviewed_by")?.is_nullable).toBe("YES");

    expect(colMap.get("reviewed_at")?.data_type).toBe(
      "timestamp with time zone",
    );
    expect(colMap.get("reviewed_at")?.is_nullable).toBe("YES");

    expect(colMap.get("decision")?.udt_name).toBe("decision_type");
    expect(colMap.get("decision")?.is_nullable).toBe("YES");

    expect(colMap.get("decision_reason")?.data_type).toBe("text");
    expect(colMap.get("decision_reason")?.is_nullable).toBe("YES");
  });

  it("landlord_verifications.id is PK", async () => {
    const result = await pg.query<{ attname: string }>(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'public.landlord_verifications'::regclass AND i.indisprimary;
    `);
    expect(result.rows[0]?.attname).toBe("id");
  });

  it("landlord_verifications.landlord_id has FK to landlords.profile_id CASCADE", async () => {
    const result = await pg.query<{ confdeltype: string }>(`
      SELECT confdeltype
      FROM pg_constraint
      WHERE conname = 'landlord_verifications_landlord_id_fkey';
    `);
    expect(result.rows[0]?.confdeltype).toBe("c"); // CASCADE
  });

  it("landlord_verifications.reviewed_by has FK to profiles.id SET NULL", async () => {
    const result = await pg.query<{ confdeltype: string }>(`
      SELECT confdeltype
      FROM pg_constraint
      WHERE conname = 'landlord_verifications_reviewed_by_fkey';
    `);
    expect(result.rows[0]?.confdeltype).toBe("n"); // SET NULL
  });

  it("landlord_verifications has CHECK constraint requiring decision_reason when decision='rejected'", async () => {
    const result = await pg.query<{ conname: string }>(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.landlord_verifications'::regclass AND contype = 'c';
    `);
    const names = result.rows.map((r) => r.conname);
    expect(names).toContain(
      "landlord_verifications_decision_reason_required",
    );
  });

  it("landlord_verifications has indexes for queue lookups", async () => {
    const result = await pg.query<{ indexname: string }>(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'landlord_verifications';
    `);
    const names = result.rows.map((r) => r.indexname);
    expect(names).toContain(
      "landlord_verifications_landlord_id_submitted_at_idx",
    );
    expect(names).toContain(
      "landlord_verifications_pending_status_idx",
    );
  });

  it("landlord_verifications RLS is enabled + forced", async () => {
    const result = await pg.query<{
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`
      SELECT relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE relname = 'landlord_verifications';
    `);
    expect(result.rows[0]?.relrowsecurity).toBe(true);
    expect(result.rows[0]?.relforcerowsecurity).toBe(true);
  });

  it("landlord_verifications has append-only + sync triggers", async () => {
    const result = await pg.query<{ tgname: string }>(`
      SELECT tgname
      FROM pg_trigger
      WHERE tgrelid = 'public.landlord_verifications'::regclass AND NOT tgisinternal;
    `);
    const names = result.rows.map((r) => r.tgname);
    expect(names).toContain("landlord_verifications_guard_append_only");
    expect(names).toContain("landlord_verifications_sync_status");
  });
});

// ── RLS tests ───────────────────────────────────────────────────────────────

describe("Phase 4 RLS — landlords", () => {
  it("landlord can SELECT own row", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_A_ID, role: "authenticated" });
    const result = await pg.query<{ profile_id: string }>(`
      SELECT profile_id FROM public.landlords;
    `);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.profile_id).toBe(LANDLORD_A_ID);
  });

  it("landlord CANNOT SELECT another landlord's row (Attack #5/#10)", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_A_ID, role: "authenticated" });
    const result = await pg.query<{ profile_id: string }>(`
      SELECT profile_id FROM public.landlords WHERE profile_id = '${LANDLORD_B_ID}';
    `);
    expect(result.rows.length).toBe(0);
  });

  it("student CANNOT SELECT any landlord row (Attack #1)", async () => {
    await setJwtClaims(pg, { sub: STUDENT_ID, role: "authenticated" });
    const result = await pg.query<{ profile_id: string }>(`
      SELECT profile_id FROM public.landlords;
    `);
    expect(result.rows.length).toBe(0);
  });

  it("admin can SELECT all landlord rows", async () => {
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const result = await pg.query<{ profile_id: string }>(`
      SELECT profile_id FROM public.landlords ORDER BY profile_id;
    `);
    expect(result.rows.length).toBe(2);
    expect(result.rows[0]?.profile_id).toBe(LANDLORD_A_ID);
    expect(result.rows[1]?.profile_id).toBe(LANDLORD_B_ID);
  });

  it("landlord CANNOT directly update current_verification_status (Attack #4)", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_A_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      UPDATE public.landlords SET current_verification_status = 'approved'
      WHERE profile_id = '${LANDLORD_A_ID}';
    `);
    expect(ok).toBe(false);

    // Verify status is unchanged.
    await setServiceRole(pg);
    const result = await pg.query<{ status: string }>(`
      SELECT current_verification_status AS status FROM public.landlords
      WHERE profile_id = $1;
    `, [LANDLORD_A_ID]);
    expect(result.rows[0]?.status).toBe("unsubmitted");
  });

  it("landlord CANNOT directly update is_suspended", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_A_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      UPDATE public.landlords SET is_suspended = true, suspension_reason = 'self-suspend'
      WHERE profile_id = '${LANDLORD_A_ID}';
    `);
    expect(ok).toBe(false);
  });

  it("admin CAN update current_verification_status (manual correction path)", async () => {
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      UPDATE public.landlords SET current_verification_status = 'approved',
                                   verification_valid_until = now() + interval '6 months'
      WHERE profile_id = '${LANDLORD_A_ID}';
    `);
    expect(ok).toBe(true);
  });

  it("landlord CANNOT INSERT a landlords row (RLS denies by default)", async () => {
    // RLS has no INSERT policy — only the service-role registration path
    // creates landlords rows.
    await setJwtClaims(pg, { sub: LANDLORD_A_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      INSERT INTO public.landlords (profile_id) VALUES ('${LANDLORD_B_ID}');
    `);
    expect(ok).toBe(false);
  });

  it("landlord CANNOT DELETE their own landlords row", async () => {
    // RLS has no DELETE policy for landlords — DELETE silently affects 0
    // rows (doesn't throw). Verify the actual security property: the row
    // still exists after the attempt.
    await setJwtClaims(pg, { sub: LANDLORD_A_ID, role: "authenticated" });
    await pg.query(`DELETE FROM public.landlords;`);

    await setServiceRole(pg);
    const result = await pg.query<{ profile_id: string }>(`
      SELECT profile_id FROM public.landlords WHERE profile_id = $1;
    `, [LANDLORD_A_ID]);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.profile_id).toBe(LANDLORD_A_ID);
  });
});

describe("Phase 4 RLS — landlord_verifications", () => {
  beforeEach(async () => {
    // Create a verification row for each landlord (service-role setup).
    await insertVerificationRow({ landlordId: LANDLORD_A_ID });
    await insertVerificationRow({ landlordId: LANDLORD_B_ID });
  });

  it("landlord can SELECT own verification rows (full history)", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_A_ID, role: "authenticated" });
    const result = await pg.query<{ landlord_id: string }>(`
      SELECT landlord_id FROM public.landlord_verifications;
    `);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.landlord_id).toBe(LANDLORD_A_ID);
  });

  it("landlord CANNOT SELECT another landlord's verification (Attack #5)", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_A_ID, role: "authenticated" });
    const result = await pg.query<{ landlord_id: string }>(`
      SELECT landlord_id FROM public.landlord_verifications
      WHERE landlord_id = '${LANDLORD_B_ID}';
    `);
    expect(result.rows.length).toBe(0);
  });

  it("student CANNOT SELECT any verification row (Attack #1/#8)", async () => {
    await setJwtClaims(pg, { sub: STUDENT_ID, role: "authenticated" });
    const result = await pg.query<{ landlord_id: string }>(`
      SELECT landlord_id FROM public.landlord_verifications;
    `);
    expect(result.rows.length).toBe(0);
  });

  it("admin can SELECT all verification rows", async () => {
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const result = await pg.query<{ landlord_id: string }>(`
      SELECT landlord_id FROM public.landlord_verifications ORDER BY landlord_id;
    `);
    expect(result.rows.length).toBe(2);
  });

  it("landlord CANNOT INSERT with another landlord's ID (Attack #2)", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_A_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      INSERT INTO public.landlord_verifications
        (landlord_id, submitted_id_reference, submitted_ownership_reference)
      VALUES ('${LANDLORD_B_ID}', 'verification/${LANDLORD_B_ID}/id/x.jpg', 'verification/${LANDLORD_B_ID}/ownership_evidence/x.pdf');
    `);
    expect(ok).toBe(false);
  });

  it("landlord CANNOT INSERT with status != 'submitted' (state machine)", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_A_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      INSERT INTO public.landlord_verifications
        (landlord_id, status, submitted_id_reference, submitted_ownership_reference)
      VALUES ('${LANDLORD_A_ID}', 'approved', 'verification/${LANDLORD_A_ID}/id/x.jpg', 'verification/${LANDLORD_A_ID}/ownership_evidence/x.pdf');
    `);
    expect(ok).toBe(false);
  });

  it("landlord CANNOT INSERT with pre-filled decision fields", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_A_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      INSERT INTO public.landlord_verifications
        (landlord_id, status, submitted_id_reference, submitted_ownership_reference, decision, decision_reason, reviewed_by)
      VALUES ('${LANDLORD_A_ID}', 'submitted', 'verification/${LANDLORD_A_ID}/id/x.jpg', 'verification/${LANDLORD_A_ID}/ownership_evidence/x.pdf', 'approved', 'reason', '${ADMIN_ID}');
    `);
    expect(ok).toBe(false);
  });

  it("landlord CANNOT UPDATE their own verification status (Attack #4)", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_A_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      UPDATE public.landlord_verifications SET status = 'approved'
      WHERE landlord_id = '${LANDLORD_A_ID}';
    `);
    expect(ok).toBe(false);
  });

  it("landlord CANNOT UPDATE their own decision fields (Attack #4)", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_A_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      UPDATE public.landlord_verifications SET decision = 'approved'
      WHERE landlord_id = '${LANDLORD_A_ID}';
    `);
    expect(ok).toBe(false);
  });

  it("landlord CANNOT DELETE their verification history (Attack #7)", async () => {
    // The append-only trigger fires BEFORE DELETE and raises for non-admin.
    // This produces an actual error (not a silent 0-rows-affected).
    await setJwtClaims(pg, { sub: LANDLORD_A_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `DELETE FROM public.landlord_verifications;`);
    expect(ok).toBe(false);

    // Verify the rows still exist.
    await setServiceRole(pg);
    const result = await pg.query<{ id: string }>(`
      SELECT id FROM public.landlord_verifications WHERE landlord_id = $1;
    `, [LANDLORD_A_ID]);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it("admin CAN approve (status → approved, sync updates landlords cache)", async () => {
    await setServiceRole(pg);
    const vId = await insertVerificationRow({ landlordId: LANDLORD_A_ID });

    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      UPDATE public.landlord_verifications
      SET status = 'approved', decision = 'approved',
          reviewed_by = '${ADMIN_ID}', reviewed_at = now()
      WHERE id = '${vId}';
    `);
    expect(ok).toBe(true);

    // Verify the sync trigger updated landlords.current_verification_status.
    await setServiceRole(pg);
    const landlordResult = await pg.query<{
      status: string;
      valid_until: string | null;
    }>(`
      SELECT current_verification_status AS status, verification_valid_until AS valid_until
      FROM public.landlords WHERE profile_id = $1;
    `, [LANDLORD_A_ID]);
    expect(landlordResult.rows[0]?.status).toBe("approved");
    expect(landlordResult.rows[0]?.valid_until).not.toBeNull();
  });

  it("admin CAN reject with reason (status → rejected, sync updates landlords cache)", async () => {
    await setServiceRole(pg);
    const vId = await insertVerificationRow({ landlordId: LANDLORD_A_ID });

    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      UPDATE public.landlord_verifications
      SET status = 'rejected', decision = 'rejected',
          decision_reason = 'Test rejection reason',
          reviewed_by = '${ADMIN_ID}', reviewed_at = now()
      WHERE id = '${vId}';
    `);
    expect(ok).toBe(true);

    await setServiceRole(pg);
    const landlordResult = await pg.query<{ status: string }>(`
      SELECT current_verification_status AS status
      FROM public.landlords WHERE profile_id = $1;
    `, [LANDLORD_A_ID]);
    expect(landlordResult.rows[0]?.status).toBe("rejected");
  });

  it("admin CANNOT reject WITHOUT a reason (CHECK constraint)", async () => {
    await setServiceRole(pg);
    const vId = await insertVerificationRow({ landlordId: LANDLORD_A_ID });

    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      UPDATE public.landlord_verifications
      SET status = 'rejected', decision = 'rejected',
          reviewed_by = '${ADMIN_ID}', reviewed_at = now()
      WHERE id = '${vId}';
    `);
    expect(ok).toBe(false);
  });

  it("admin CANNOT re-decide an already-decided row (Attack #13)", async () => {
    // First decision: approved.
    await setServiceRole(pg);
    const vId = await insertVerificationRow({ landlordId: LANDLORD_A_ID });

    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await pg.query(`
      UPDATE public.landlord_verifications
      SET status = 'approved', decision = 'approved',
          reviewed_by = '${ADMIN_ID}', reviewed_at = now()
      WHERE id = '${vId}';
    `);

    // Attempt to re-decide to rejected — should fail.
    const ok = await querySucceeds(pg, `
      UPDATE public.landlord_verifications
      SET status = 'rejected', decision = 'rejected',
          decision_reason = 'Changed my mind',
          reviewed_by = '${ADMIN_ID}', reviewed_at = now()
      WHERE id = '${vId}';
    `);
    expect(ok).toBe(false);
  });

  it("admin CANNOT change landlord_id on a verification row (append-only protected column)", async () => {
    await setServiceRole(pg);
    const vId = await insertVerificationRow({ landlordId: LANDLORD_A_ID });

    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      UPDATE public.landlord_verifications
      SET landlord_id = '${LANDLORD_B_ID}'
      WHERE id = '${vId}';
    `);
    expect(ok).toBe(false);
  });

  it("admin CANNOT change submitted_id_reference (append-only protected)", async () => {
    await setServiceRole(pg);
    const vId = await insertVerificationRow({ landlordId: LANDLORD_A_ID });

    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const ok = await querySucceeds(pg, `
      UPDATE public.landlord_verifications
      SET submitted_id_reference = 'verification/${LANDLORD_B_ID}/id/forged.jpg'
      WHERE id = '${vId}';
    `);
    expect(ok).toBe(false);
  });

  it("admin CANNOT perform invalid status transition (approved → rejected)", async () => {
    await setServiceRole(pg);
    const vId = await insertVerificationRow({ landlordId: LANDLORD_A_ID });

    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    // First: approve.
    await pg.query(`
      UPDATE public.landlord_verifications
      SET status = 'approved', decision = 'approved',
          reviewed_by = '${ADMIN_ID}', reviewed_at = now()
      WHERE id = '${vId}';
    `);

    // Attempt: approved → rejected (status only — would also need decision
    // change which is blocked separately, but this also fails on the
    // status transition itself).
    const ok = await querySucceeds(pg, `
      UPDATE public.landlord_verifications
      SET status = 'rejected'
      WHERE id = '${vId}';
    `);
    expect(ok).toBe(false);
  });
});

// ── Append-only + history preservation ──────────────────────────────────────

describe("Phase 4 append-only history preservation (TEST #18, #19)", () => {
  it("multiple submissions create multiple rows; none are overwritten", async () => {
    // First submission.
    const v1 = await insertVerificationRow({ landlordId: LANDLORD_A_ID });

    // Approve v1 (admin path).
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await pg.query(`
      UPDATE public.landlord_verifications
      SET status = 'approved', decision = 'approved',
          reviewed_by = '${ADMIN_ID}', reviewed_at = now()
      WHERE id = '${v1}';
    `);

    // Second submission (resubmission — new row).
    await setServiceRole(pg);
    const v2 = await insertVerificationRow({ landlordId: LANDLORD_A_ID });

    // Verify both rows still exist.
    await setServiceRole(pg);
    const result = await pg.query<{ id: string }>(`
      SELECT id FROM public.landlord_verifications
      WHERE landlord_id = $1
      ORDER BY submitted_at ASC;
    `, [LANDLORD_A_ID]);

    expect(result.rows.length).toBe(2);
    expect(result.rows[0]?.id).toBe(v1);
    expect(result.rows[1]?.id).toBe(v2);

    // v1 still has decision='approved'; v2 has decision=NULL.
    const v1Result = await pg.query<{ decision: string | null }>(
      `SELECT decision FROM public.landlord_verifications WHERE id = $1;`,
      [v1],
    );
    expect(v1Result.rows[0]?.decision).toBe("approved");

    const v2Result = await pg.query<{ decision: string | null }>(
      `SELECT decision FROM public.landlord_verifications WHERE id = $1;`,
      [v2],
    );
    expect(v2Result.rows[0]?.decision).toBeNull();
  });

  it("two rejection cycles: all three rows preserved (TEST #19)", async () => {
    // v1: submitted → rejected.
    const v1 = await insertVerificationRow({ landlordId: LANDLORD_A_ID });
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await pg.query(`
      UPDATE public.landlord_verifications
      SET status = 'rejected', decision = 'rejected',
          decision_reason = 'First rejection',
          reviewed_by = '${ADMIN_ID}', reviewed_at = now()
      WHERE id = '${v1}';
    `);

    // v2: resubmission → rejected.
    await setServiceRole(pg);
    const v2 = await insertVerificationRow({ landlordId: LANDLORD_A_ID });
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await pg.query(`
      UPDATE public.landlord_verifications
      SET status = 'rejected', decision = 'rejected',
          decision_reason = 'Second rejection',
          reviewed_by = '${ADMIN_ID}', reviewed_at = now()
      WHERE id = '${v2}';
    `);

    // v3: resubmission → approved.
    await setServiceRole(pg);
    const v3 = await insertVerificationRow({ landlordId: LANDLORD_A_ID });
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await pg.query(`
      UPDATE public.landlord_verifications
      SET status = 'approved', decision = 'approved',
          reviewed_by = '${ADMIN_ID}', reviewed_at = now()
      WHERE id = '${v3}';
    `);

    // Verify all 3 rows still exist with their original decision reasons.
    await setServiceRole(pg);
    const result = await pg.query<{
      id: string;
      decision: string | null;
      reason: string | null;
    }>(`
      SELECT id, decision, decision_reason AS reason
      FROM public.landlord_verifications
      WHERE landlord_id = $1
      ORDER BY submitted_at ASC;
    `, [LANDLORD_A_ID]);

    expect(result.rows.length).toBe(3);
    expect(result.rows[0]?.id).toBe(v1);
    expect(result.rows[0]?.decision).toBe("rejected");
    expect(result.rows[0]?.reason).toBe("First rejection");
    expect(result.rows[1]?.id).toBe(v2);
    expect(result.rows[1]?.decision).toBe("rejected");
    expect(result.rows[1]?.reason).toBe("Second rejection");
    expect(result.rows[2]?.id).toBe(v3);
    expect(result.rows[2]?.decision).toBe("approved");
    expect(result.rows[2]?.reason).toBeNull();

    // Verify the landlords cache reflects the LATEST decision.
    const landlordResult = await pg.query<{ status: string }>(`
      SELECT current_verification_status AS status
      FROM public.landlords WHERE profile_id = $1;
    `, [LANDLORD_A_ID]);
    expect(landlordResult.rows[0]?.status).toBe("approved");
  });
});

// ── FK + cascade tests ─────────────────────────────────────────────────────

describe("Phase 4 FK + cascade behavior", () => {
  it("deleting a profile cascades to landlords + landlord_verifications", async () => {
    // Insert a verification row for landlord A.
    await insertVerificationRow({ landlordId: LANDLORD_A_ID });

    // Delete the auth.users row (cascades to profiles → landlords → verifications).
    await setServiceRole(pg);
    await pg.query(`DELETE FROM auth.users WHERE id = $1;`, [LANDLORD_A_ID]);

    // Verify all three are gone.
    const profileResult = await pg.query<{ id: string }>(
      `SELECT id FROM public.profiles WHERE id = $1;`,
      [LANDLORD_A_ID],
    );
    expect(profileResult.rows.length).toBe(0);

    const landlordResult = await pg.query<{ profile_id: string }>(
      `SELECT profile_id FROM public.landlords WHERE profile_id = $1;`,
      [LANDLORD_A_ID],
    );
    expect(landlordResult.rows.length).toBe(0);

    const vResult = await pg.query<{ landlord_id: string }>(
      `SELECT landlord_id FROM public.landlord_verifications WHERE landlord_id = $1;`,
      [LANDLORD_A_ID],
    );
    expect(vResult.rows.length).toBe(0);
  });

  it("deleting the admin reviewer's profile sets reviewed_by to NULL (preserves audit trail)", async () => {
    // Insert a verification row, approve it as admin.
    const vId = await insertVerificationRow({ landlordId: LANDLORD_A_ID });
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await pg.query(`
      UPDATE public.landlord_verifications
      SET status = 'approved', decision = 'approved',
          reviewed_by = '${ADMIN_ID}', reviewed_at = now()
      WHERE id = '${vId}';
    `);

    // Delete the admin's auth.users row (cascades to profiles).
    await setServiceRole(pg);
    await pg.query(`DELETE FROM auth.users WHERE id = $1;`, [ADMIN_ID]);

    // The verification row should still exist with reviewed_by = NULL.
    const result = await pg.query<{ reviewed_by: string | null }>(
      `SELECT reviewed_by FROM public.landlord_verifications WHERE id = $1;`,
      [vId],
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.reviewed_by).toBeNull();
  });
});
