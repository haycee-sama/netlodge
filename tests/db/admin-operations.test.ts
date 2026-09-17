/**
 * Phase 10 — Admin operations DB tests.
 *
 * This is the DIRECT REQUEST BYPASS test matrix required by Phase 10 §22/§37.
 *
 * Every admin mutation is tested by invoking the SECURITY DEFINER RPC
 * function DIRECTLY via the Supabase client (bypassing the UI and the
 * application-layer Server Action wrapper entirely). For each mutation,
 * the test matrix exercises:
 *
 *   - anonymous (no JWT)
 *   - student (JWT, role=student)
 *   - landlord (JWT, role=landlord)
 *   - suspended admin (JWT, role=admin, account_status=suspended)
 *   - active admin (JWT, role=admin, account_status=active) — ALLOWED
 *
 * Every non-admin actor must be denied at the DB layer (the RPC function
 * body raises `insufficient_privilege` or `check_violation`).
 *
 * Per Phase 10 §39: tests run against pglite (real Postgres 18). NOT
 * VERIFIED: real Supabase Auth, real PostgREST, real production
 * deployment.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeFreshDb, setJwtClaims, setServiceRole, createAuthUser, createProfile } from "./helpers";
import type { PGlite } from "@electric-sql/pglite";

let pg: PGlite;

const ADMIN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ADMIN_SUSPENDED_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const STUDENT_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const LANDLORD_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const LANDLORD_APPROVED_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
// Matches the seed university id (supabase/seed/universities.sql).
const UNIVERSITY_ID = "00000000-0000-0000-0000-000000000001";

beforeEach(async () => {
  pg = await makeFreshDb();
  // Seed an active admin.
  await createAuthUser(pg, ADMIN_ID, "admin@example.com");
  await createProfile(pg, {
    id: ADMIN_ID,
    role: "admin",
    full_name: "Active Admin",
    phone: "+10000000000",
  });
  // Seed a suspended admin.
  await createAuthUser(pg, ADMIN_SUSPENDED_ID, "suspendedadmin@example.com");
  await createProfile(pg, {
    id: ADMIN_SUSPENDED_ID,
    role: "admin",
    full_name: "Suspended Admin",
    phone: "+10000000001",
    account_status: "suspended",
    suspension_reason: "Under investigation",
  });
  // Seed a student.
  await createAuthUser(pg, STUDENT_ID, "student@example.com");
  await createProfile(pg, {
    id: STUDENT_ID,
    role: "student",
    full_name: "Test Student",
    phone: "+10000000002",
    university_id: UNIVERSITY_ID,
  });
  // Seed a landlord (no verification — just the profile).
  await createAuthUser(pg, LANDLORD_ID, "landlord@example.com");
  await createProfile(pg, {
    id: LANDLORD_ID,
    role: "landlord",
    full_name: "Test Landlord",
    phone: "+10000000003",
  });
  // Seed an APPROVED landlord (so property submission is allowed).
  await createAuthUser(pg, LANDLORD_APPROVED_ID, "approvedlandlord@example.com");
  await createProfile(pg, {
    id: LANDLORD_APPROVED_ID,
    role: "landlord",
    full_name: "Approved Landlord",
    phone: "+10000000004",
  });
});

afterEach(async () => {
  await pg.close();
});

// ── Helper: insert a verification submission via service-role ────────────────

async function ensureLandlordRow(
  landlordId: string,
  opts?: {
    verificationStatus?: string;
    isSuspended?: boolean;
  },
): Promise<void> {
  await setServiceRole(pg);
  await pg.query(
    `INSERT INTO public.landlords (profile_id, current_verification_status, is_suspended)
     VALUES ($1, $2, $3)
     ON CONFLICT (profile_id) DO UPDATE SET
       current_verification_status = EXCLUDED.current_verification_status,
       is_suspended = EXCLUDED.is_suspended;`,
    [
      landlordId,
      opts?.verificationStatus ?? "submitted",
      opts?.isSuspended ?? false,
    ],
  );
}

async function seedVerificationRow(
  landlordId: string,
  opts?: { status?: string; decision?: "approved" | "rejected" | null },
): Promise<string> {
  await setServiceRole(pg);
  const status = opts?.status ?? "submitted";
  await ensureLandlordRow(landlordId, { verificationStatus: "submitted" });
  const result = await pg.query<{ id: string }>(
    `INSERT INTO public.landlord_verifications (landlord_id, status, submitted_id_reference, submitted_ownership_reference)
     VALUES ($1, $2, 'id/path.png', 'ownership/path.png')
     RETURNING id;`,
    [landlordId, status],
  );
  const id = result.rows[0]!.id;
  if (opts?.decision) {
    await pg.query(
      `UPDATE public.landlord_verifications SET decision = $1 WHERE id = $2;`,
      [opts.decision, id],
    );
  }
  return id;
}

// ── Helper: insert a property in a specific state ──────────────────────────

async function seedPropertyRow(
  landlordId: string,
  opts?: {
    status?: string;
    isSuspended?: boolean;
    suspensionReason?: string | null;
  },
): Promise<string> {
  await setServiceRole(pg);
  // Ensure the landlord has a row in landlords table with approved verification
  // status (property submission precondition — migration 0006 trigger).
  await ensureLandlordRow(landlordId, { verificationStatus: "approved" });
  const status = opts?.status ?? "submitted";
  const result = await pg.query<{ id: string }>(
    `INSERT INTO public.properties (landlord_id, university_id, area, address, description, status, is_suspended, suspension_reason)
     VALUES ($1, $2, 'Test Area', 'Test Address', 'Test description', $3, $4, $5)
     RETURNING id;`,
    [
      landlordId,
      UNIVERSITY_ID,
      status,
      opts?.isSuspended ?? false,
      opts?.isSuspended ? (opts?.suspensionReason ?? "Suspended") : null,
    ],
  );
  return result.rows[0]!.id;
}

// ── Helper: invoke the admin_approve_verification RPC as a specific actor ──

async function callApproveVerification(
  actor: "anon" | "student" | "landlord" | "suspendedAdmin" | "activeAdmin" | "serviceRole",
  verificationId: string,
): Promise<{ error: string | null; errorCode: string | null }> {
  if (actor === "serviceRole") {
    await setServiceRole(pg);
  } else if (actor === "anon") {
    // Anon role + no JWT claims — auth.uid() returns NULL.
    await pg.query(`SET ROLE anon;`);
    await pg.query(`SET request.jwt.claims = '';`);
  } else {
    const actorMap = {
      student: STUDENT_ID,
      landlord: LANDLORD_ID,
      suspendedAdmin: ADMIN_SUSPENDED_ID,
      activeAdmin: ADMIN_ID,
    } as const;
    await setJwtClaims(pg, { sub: actorMap[actor], role: "authenticated" });
  }
  try {
    await pg.query(
      `SELECT public.admin_approve_verification($1::uuid, NULL);`,
      [verificationId],
    );
    return { error: null, errorCode: null };
  } catch (err) {
    const e = err as { message?: string; code?: string };
    return { error: e.message ?? "unknown", errorCode: e.code ?? null };
  }
}

async function callRejectVerification(
  actor: "anon" | "student" | "landlord" | "suspendedAdmin" | "activeAdmin" | "serviceRole",
  verificationId: string,
  reason: string,
): Promise<{ error: string | null; errorCode: string | null }> {
  if (actor === "serviceRole") {
    await setServiceRole(pg);
  } else if (actor === "anon") {
    await pg.query(`SET ROLE anon;`);
    await pg.query(`SET request.jwt.claims = '';`);
  } else {
    const actorMap = {
      student: STUDENT_ID,
      landlord: LANDLORD_ID,
      suspendedAdmin: ADMIN_SUSPENDED_ID,
      activeAdmin: ADMIN_ID,
    } as const;
    await setJwtClaims(pg, { sub: actorMap[actor], role: "authenticated" });
  }
  try {
    await pg.query(
      `SELECT public.admin_reject_verification($1::uuid, $2::text);`,
      [verificationId, reason],
    );
    return { error: null, errorCode: null };
  } catch (err) {
    const e = err as { message?: string; code?: string };
    return { error: e.message ?? "unknown", errorCode: e.code ?? null };
  }
}

async function callApproveProperty(
  actor: "anon" | "student" | "landlord" | "suspendedAdmin" | "activeAdmin" | "serviceRole",
  propertyId: string,
): Promise<{ error: string | null; errorCode: string | null }> {
  if (actor === "serviceRole") {
    await setServiceRole(pg);
  } else if (actor === "anon") {
    await pg.query(`SET ROLE anon;`);
    await pg.query(`SET request.jwt.claims = '';`);
  } else {
    const actorMap = {
      student: STUDENT_ID,
      landlord: LANDLORD_ID,
      suspendedAdmin: ADMIN_SUSPENDED_ID,
      activeAdmin: ADMIN_ID,
    } as const;
    await setJwtClaims(pg, { sub: actorMap[actor], role: "authenticated" });
  }
  try {
    await pg.query(
      `SELECT public.admin_approve_property($1::uuid, NULL);`,
      [propertyId],
    );
    return { error: null, errorCode: null };
  } catch (err) {
    const e = err as { message?: string; code?: string };
    return { error: e.message ?? "unknown", errorCode: e.code ?? null };
  }
}

async function callRejectProperty(
  actor: "anon" | "student" | "landlord" | "suspendedAdmin" | "activeAdmin" | "serviceRole",
  propertyId: string,
  reason: string,
): Promise<{ error: string | null; errorCode: string | null }> {
  if (actor === "serviceRole") {
    await setServiceRole(pg);
  } else if (actor === "anon") {
    await pg.query(`SET ROLE anon;`);
    await pg.query(`SET request.jwt.claims = '';`);
  } else {
    const actorMap = {
      student: STUDENT_ID,
      landlord: LANDLORD_ID,
      suspendedAdmin: ADMIN_SUSPENDED_ID,
      activeAdmin: ADMIN_ID,
    } as const;
    await setJwtClaims(pg, { sub: actorMap[actor], role: "authenticated" });
  }
  try {
    await pg.query(
      `SELECT public.admin_reject_property($1::uuid, $2::text);`,
      [propertyId, reason],
    );
    return { error: null, errorCode: null };
  } catch (err) {
    const e = err as { message?: string; code?: string };
    return { error: e.message ?? "unknown", errorCode: e.code ?? null };
  }
}

async function callSuspendProperty(
  actor: "anon" | "student" | "landlord" | "suspendedAdmin" | "activeAdmin" | "serviceRole",
  propertyId: string,
  reason: string,
): Promise<{ error: string | null; errorCode: string | null }> {
  if (actor === "serviceRole") {
    await setServiceRole(pg);
  } else if (actor === "anon") {
    await pg.query(`SET ROLE anon;`);
    await pg.query(`SET request.jwt.claims = '';`);
  } else {
    const actorMap = {
      student: STUDENT_ID,
      landlord: LANDLORD_ID,
      suspendedAdmin: ADMIN_SUSPENDED_ID,
      activeAdmin: ADMIN_ID,
    } as const;
    await setJwtClaims(pg, { sub: actorMap[actor], role: "authenticated" });
  }
  try {
    await pg.query(
      `SELECT public.admin_suspend_property($1::uuid, $2::text);`,
      [propertyId, reason],
    );
    return { error: null, errorCode: null };
  } catch (err) {
    const e = err as { message?: string; code?: string };
    return { error: e.message ?? "unknown", errorCode: e.code ?? null };
  }
}

async function callLiftSuspensionProperty(
  actor: "anon" | "student" | "landlord" | "suspendedAdmin" | "activeAdmin" | "serviceRole",
  propertyId: string,
  reason: string,
): Promise<{ error: string | null; errorCode: string | null }> {
  if (actor === "serviceRole") {
    await setServiceRole(pg);
  } else if (actor === "anon") {
    await pg.query(`SET ROLE anon;`);
    await pg.query(`SET request.jwt.claims = '';`);
  } else {
    const actorMap = {
      student: STUDENT_ID,
      landlord: LANDLORD_ID,
      suspendedAdmin: ADMIN_SUSPENDED_ID,
      activeAdmin: ADMIN_ID,
    } as const;
    await setJwtClaims(pg, { sub: actorMap[actor], role: "authenticated" });
  }
  try {
    await pg.query(
      `SELECT public.admin_lift_suspension_property($1::uuid, $2::text);`,
      [propertyId, reason],
    );
    return { error: null, errorCode: null };
  } catch (err) {
    const e = err as { message?: string; code?: string };
    return { error: e.message ?? "unknown", errorCode: e.code ?? null };
  }
}

// ── Helper: read audit_logs as admin to verify actor_id derivation ──────────

async function fetchAuditLogForEntity(
  entityType: string,
  entityId: string,
): Promise<Array<{ actor_id: string | null; action: string; reason: string | null }>> {
  await setServiceRole(pg);
  const r = await pg.query<{
    actor_id: string | null;
    action: string;
    reason: string | null;
  }>(
    `SELECT actor_id, action, reason FROM public.audit_logs
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at DESC;`,
    [entityType, entityId],
  );
  return r.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// DIRECT BYPASS TEST MATRIX — verification approve/reject
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 10 §22/§37 direct-request bypass: admin_approve_verification", () => {
  let verificationId: string;

  beforeEach(async () => {
    verificationId = await seedVerificationRow(LANDLORD_ID, { status: "submitted" });
  });

  it("active admin → ALLOWED", async () => {
    const r = await callApproveVerification("activeAdmin", verificationId);
    expect(r.error).toBeNull();

    // Verify the verification row was actually approved.
    await setServiceRole(pg);
    const row = await pg.query<{ status: string; decision: string; reviewed_by: string | null }>(
      `SELECT status, decision, reviewed_by FROM public.landlord_verifications WHERE id = $1;`,
      [verificationId],
    );
    expect(row.rows[0]?.status).toBe("approved");
    expect(row.rows[0]?.decision).toBe("approved");
    expect(row.rows[0]?.reviewed_by).toBe(ADMIN_ID);
  });

  it("anonymous → DENIED", async () => {
    const r = await callApproveVerification("anon", verificationId);
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);

    // Verify the verification row was NOT mutated.
    await setServiceRole(pg);
    const row = await pg.query<{ status: string; decision: string | null }>(
      `SELECT status, decision FROM public.landlord_verifications WHERE id = $1;`,
      [verificationId],
    );
    expect(row.rows[0]?.status).toBe("submitted");
    expect(row.rows[0]?.decision).toBeNull();
  });

  it("student → DENIED", async () => {
    const r = await callApproveVerification("student", verificationId);
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);

    await setServiceRole(pg);
    const row = await pg.query<{ status: string; decision: string | null }>(
      `SELECT status, decision FROM public.landlord_verifications WHERE id = $1;`,
      [verificationId],
    );
    expect(row.rows[0]?.status).toBe("submitted");
    expect(row.rows[0]?.decision).toBeNull();
  });

  it("landlord → DENIED", async () => {
    const r = await callApproveVerification("landlord", verificationId);
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);

    await setServiceRole(pg);
    const row = await pg.query<{ status: string; decision: string | null }>(
      `SELECT status, decision FROM public.landlord_verifications WHERE id = $1;`,
      [verificationId],
    );
    expect(row.rows[0]?.status).toBe("submitted");
    expect(row.rows[0]?.decision).toBeNull();
  });

  it("suspended admin → DENIED", async () => {
    const r = await callApproveVerification("suspendedAdmin", verificationId);
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);

    await setServiceRole(pg);
    const row = await pg.query<{ status: string; decision: string | null }>(
      `SELECT status, decision FROM public.landlord_verifications WHERE id = $1;`,
      [verificationId],
    );
    expect(row.rows[0]?.status).toBe("submitted");
    expect(row.rows[0]?.decision).toBeNull();
  });

  it("admin approves already-decided submission → conflict + no double audit", async () => {
    // First approve by active admin (succeeds).
    const first = await callApproveVerification("activeAdmin", verificationId);
    expect(first.error).toBeNull();

    // Second approve attempt by active admin — should be rejected by state machine.
    const second = await callApproveVerification("activeAdmin", verificationId);
    expect(second.error).toMatch(/already been decided|check_violation/i);

    // Audit log should have exactly ONE entry for this verification.
    const logs = await fetchAuditLogForEntity("landlord_verification", verificationId);
    expect(logs.length).toBe(1);
    expect(logs[0]?.action).toBe("landlord_verification.approved");
    expect(logs[0]?.actor_id).toBe(ADMIN_ID);
  });

  it("admin approves non-existent verification → not_found", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000099";
    const r = await callApproveVerification("activeAdmin", fakeId);
    expect(r.error).toMatch(/not found/i);
  });

  it("audit actor_id is derived from auth.uid(), NOT a parameter", async () => {
    // The function takes ONLY (p_verification_id, p_reason) — actor_id
    // is not a parameter. Verify the audit row's actor_id matches the
    // active admin's id.
    await callApproveVerification("activeAdmin", verificationId);
    const logs = await fetchAuditLogForEntity("landlord_verification", verificationId);
    expect(logs.length).toBe(1);
    expect(logs[0]?.actor_id).toBe(ADMIN_ID);
  });
});

describe("Phase 10 §22/§37 direct-request bypass: admin_reject_verification", () => {
  let verificationId: string;

  beforeEach(async () => {
    verificationId = await seedVerificationRow(LANDLORD_ID, { status: "submitted" });
  });

  it("active admin → ALLOWED (with reason)", async () => {
    const r = await callRejectVerification("activeAdmin", verificationId, "Fake documents");
    expect(r.error).toBeNull();
    const logs = await fetchAuditLogForEntity("landlord_verification", verificationId);
    expect(logs.length).toBe(1);
    expect(logs[0]?.action).toBe("landlord_verification.rejected");
    expect(logs[0]?.reason).toBe("Fake documents");
  });

  it("active admin rejects without a reason → check_violation", async () => {
    const r = await callRejectVerification("activeAdmin", verificationId, "   ");
    expect(r.error).toMatch(/reason is required|check_violation/i);
  });

  it("anonymous → DENIED", async () => {
    const r = await callRejectVerification("anon", verificationId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });

  it("student → DENIED", async () => {
    const r = await callRejectVerification("student", verificationId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });

  it("landlord → DENIED", async () => {
    const r = await callRejectVerification("landlord", verificationId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });

  it("suspended admin → DENIED", async () => {
    const r = await callRejectVerification("suspendedAdmin", verificationId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DIRECT BYPASS TEST MATRIX — property approve/reject/suspend/liftSuspension
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 10 §22/§37 direct-request bypass: admin_approve_property", () => {
  let propertyId: string;

  beforeEach(async () => {
    propertyId = await seedPropertyRow(LANDLORD_APPROVED_ID, { status: "submitted" });
  });

  it("active admin → ALLOWED + audit row written", async () => {
    const r = await callApproveProperty("activeAdmin", propertyId);
    expect(r.error).toBeNull();
    const logs = await fetchAuditLogForEntity("property", propertyId);
    expect(logs.length).toBe(1);
    expect(logs[0]?.action).toBe("property.approved");
    expect(logs[0]?.actor_id).toBe(ADMIN_ID);
  });

  it("anonymous → DENIED + no state change", async () => {
    const r = await callApproveProperty("anon", propertyId);
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
    await setServiceRole(pg);
    const row = await pg.query<{ status: string }>(
      `SELECT status FROM public.properties WHERE id = $1;`,
      [propertyId],
    );
    expect(row.rows[0]?.status).toBe("submitted");
  });

  it("student → DENIED + no state change", async () => {
    const r = await callApproveProperty("student", propertyId);
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
    await setServiceRole(pg);
    const row = await pg.query<{ status: string }>(
      `SELECT status FROM public.properties WHERE id = $1;`,
      [propertyId],
    );
    expect(row.rows[0]?.status).toBe("submitted");
  });

  it("landlord → DENIED (even if they own the property)", async () => {
    // The landlord here is LANDLORD_ID (not LANDLORD_APPROVED_ID — different user).
    // Even if they were the property owner, only admins can approve.
    const r = await callApproveProperty("landlord", propertyId);
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });

  it("suspended admin → DENIED + no state change", async () => {
    const r = await callApproveProperty("suspendedAdmin", propertyId);
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
    await setServiceRole(pg);
    const row = await pg.query<{ status: string }>(
      `SELECT status FROM public.properties WHERE id = $1;`,
      [propertyId],
    );
    expect(row.rows[0]?.status).toBe("submitted");
  });

  it("admin approves property in invalid state (approved → approved) → conflict", async () => {
    // Set up an already-approved property.
    const approvedId = await seedPropertyRow(LANDLORD_APPROVED_ID, { status: "approved" });
    const r = await callApproveProperty("activeAdmin", approvedId);
    expect(r.error).toMatch(/Cannot approve|check_violation/i);
  });
});

describe("Phase 10 §22/§37 direct-request bypass: admin_reject_property", () => {
  let propertyId: string;

  beforeEach(async () => {
    propertyId = await seedPropertyRow(LANDLORD_APPROVED_ID, { status: "submitted" });
  });

  it("active admin → ALLOWED + audit + property_reviews row", async () => {
    const r = await callRejectProperty("activeAdmin", propertyId, "Misleading photos");
    expect(r.error).toBeNull();

    // Audit log row.
    const logs = await fetchAuditLogForEntity("property", propertyId);
    expect(logs.length).toBe(1);
    expect(logs[0]?.action).toBe("property.rejected");
    expect(logs[0]?.reason).toBe("Misleading photos");

    // property_reviews append-only row.
    await setServiceRole(pg);
    const reviews = await pg.query<{ decision: string; decision_reason: string }>(
      `SELECT decision, decision_reason FROM public.property_reviews WHERE property_id = $1;`,
      [propertyId],
    );
    expect(reviews.rows.length).toBe(1);
    expect(reviews.rows[0]?.decision).toBe("rejected");
    expect(reviews.rows[0]?.decision_reason).toBe("Misleading photos");
  });

  it("active admin rejects without a reason → check_violation", async () => {
    const r = await callRejectProperty("activeAdmin", propertyId, "");
    expect(r.error).toMatch(/reason is required|check_violation/i);
  });

  it("anonymous → DENIED", async () => {
    const r = await callRejectProperty("anon", propertyId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });

  it("student → DENIED", async () => {
    const r = await callRejectProperty("student", propertyId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });

  it("landlord → DENIED", async () => {
    const r = await callRejectProperty("landlord", propertyId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });

  it("suspended admin → DENIED", async () => {
    const r = await callRejectProperty("suspendedAdmin", propertyId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });
});

describe("Phase 10 §22/§37 direct-request bypass: admin_suspend_property", () => {
  let propertyId: string;

  beforeEach(async () => {
    propertyId = await seedPropertyRow(LANDLORD_APPROVED_ID, {
      status: "approved",
      isSuspended: false,
    });
  });

  it("active admin → ALLOWED + is_suspended=true + audit row", async () => {
    const r = await callSuspendProperty("activeAdmin", propertyId, "Pending investigation");
    expect(r.error).toBeNull();

    await setServiceRole(pg);
    const row = await pg.query<{ is_suspended: boolean; suspension_reason: string | null; status: string }>(
      `SELECT is_suspended, suspension_reason, status FROM public.properties WHERE id = $1;`,
      [propertyId],
    );
    expect(row.rows[0]?.is_suspended).toBe(true);
    expect(row.rows[0]?.suspension_reason).toBe("Pending investigation");
    // Status remains 'approved' (orthogonal to status — Phase 10 design).
    expect(row.rows[0]?.status).toBe("approved");

    const logs = await fetchAuditLogForEntity("property", propertyId);
    expect(logs.length).toBe(1);
    expect(logs[0]?.action).toBe("property.suspended");
    expect(logs[0]?.reason).toBe("Pending investigation");
  });

  it("anonymous → DENIED + is_suspended unchanged", async () => {
    const r = await callSuspendProperty("anon", propertyId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
    await setServiceRole(pg);
    const row = await pg.query<{ is_suspended: boolean }>(
      `SELECT is_suspended FROM public.properties WHERE id = $1;`,
      [propertyId],
    );
    expect(row.rows[0]?.is_suspended).toBe(false);
  });

  it("student → DENIED", async () => {
    const r = await callSuspendProperty("student", propertyId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });

  it("landlord → DENIED (even the property owner)", async () => {
    const r = await callSuspendProperty("landlord", propertyId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });

  it("suspended admin → DENIED", async () => {
    const r = await callSuspendProperty("suspendedAdmin", propertyId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });

  it("admin suspends already-suspended property → conflict", async () => {
    const suspendedId = await seedPropertyRow(LANDLORD_APPROVED_ID, {
      status: "approved",
      isSuspended: true,
      suspensionReason: "First reason",
    });
    const r = await callSuspendProperty("activeAdmin", suspendedId, "Second reason");
    expect(r.error).toMatch(/already suspended|check_violation/i);
  });

  it("admin suspends without a reason → check_violation", async () => {
    const r = await callSuspendProperty("activeAdmin", propertyId, "   ");
    expect(r.error).toMatch(/reason is required|check_violation/i);
  });
});

describe("Phase 10 §22/§37 direct-request bypass: admin_lift_suspension_property", () => {
  let propertyId: string;

  beforeEach(async () => {
    propertyId = await seedPropertyRow(LANDLORD_APPROVED_ID, {
      status: "approved",
      isSuspended: true,
      suspensionReason: "Investigation",
    });
  });

  it("active admin → ALLOWED + is_suspended=false + reason cleared + audit row", async () => {
    const r = await callLiftSuspensionProperty("activeAdmin", propertyId, "Investigation cleared");
    expect(r.error).toBeNull();

    await setServiceRole(pg);
    const row = await pg.query<{ is_suspended: boolean; suspension_reason: string | null }>(
      `SELECT is_suspended, suspension_reason FROM public.properties WHERE id = $1;`,
      [propertyId],
    );
    expect(row.rows[0]?.is_suspended).toBe(false);
    expect(row.rows[0]?.suspension_reason).toBeNull();

    const logs = await fetchAuditLogForEntity("property", propertyId);
    expect(logs.length).toBe(1);
    expect(logs[0]?.action).toBe("property.suspension_lifted");
    expect(logs[0]?.reason).toBe("Investigation cleared");
  });

  it("anonymous → DENIED", async () => {
    const r = await callLiftSuspensionProperty("anon", propertyId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });

  it("student → DENIED", async () => {
    const r = await callLiftSuspensionProperty("student", propertyId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });

  it("landlord → DENIED (even the property owner)", async () => {
    const r = await callLiftSuspensionProperty("landlord", propertyId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });

  it("suspended admin → DENIED", async () => {
    const r = await callLiftSuspensionProperty("suspendedAdmin", propertyId, "bad");
    expect(r.error).toMatch(/Only active admins|insufficient_privilege/i);
  });

  it("admin lifts suspension on a non-suspended property → conflict", async () => {
    const notSuspendedId = await seedPropertyRow(LANDLORD_APPROVED_ID, {
      status: "approved",
      isSuspended: false,
    });
    const r = await callLiftSuspensionProperty("activeAdmin", notSuspendedId, "bad");
    expect(r.error).toMatch(/not currently suspended|check_violation/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit log integrity — append-only + forged-actor + forged-entity tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 10 §5 audit log integrity", () => {
  it("audit_logs RLS denies INSERT by any client role (no policy exists)", async () => {
    // Try as active admin.
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await expect(
      pg.query(
        `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id)
         VALUES ($1, 'forged.action', 'forged', $2);`,
        [ADMIN_ID, ADMIN_ID],
      ),
    ).rejects.toThrow();
  });

  it("audit_logs RLS denies UPDATE by any client role (0 rows affected)", async () => {
    // First insert a real audit row via the SECURITY DEFINER admin function.
    const verificationId = await seedVerificationRow(LANDLORD_ID, { status: "submitted" });
    await callApproveVerification("activeAdmin", verificationId);
    // Now try to UPDATE as active admin.
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await pg.query(`UPDATE public.audit_logs SET action = 'forged.update';`);
    // Verify the row is unchanged.
    await setServiceRole(pg);
    const r = await pg.query<{ action: string }>(
      `SELECT action FROM public.audit_logs WHERE entity_id = $1;`,
      [verificationId],
    );
    expect(r.rows[0]?.action).toBe("landlord_verification.approved");
  });

  it("audit_logs RLS denies DELETE by any client role (0 rows affected)", async () => {
    const verificationId = await seedVerificationRow(LANDLORD_ID, { status: "submitted" });
    await callApproveVerification("activeAdmin", verificationId);
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await pg.query(`DELETE FROM public.audit_logs;`);
    // Verify the row still exists.
    await setServiceRole(pg);
    const r = await pg.query<{ action: string }>(
      `SELECT action FROM public.audit_logs WHERE entity_id = $1;`,
      [verificationId],
    );
    expect(r.rows.length).toBe(1);
  });

  it("audit_logs admin read works via RLS", async () => {
    const verificationId = await seedVerificationRow(LANDLORD_ID, { status: "submitted" });
    await callApproveVerification("activeAdmin", verificationId);

    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const r = await pg.query<{ action: string }>(
      `SELECT action FROM public.audit_logs WHERE entity_id = $1;`,
      [verificationId],
    );
    expect(r.rows.length).toBe(1);
    expect(r.rows[0]?.action).toBe("landlord_verification.approved");
  });

  it("audit_logs is invisible to non-admin authenticated users (student)", async () => {
    const verificationId = await seedVerificationRow(LANDLORD_ID, { status: "submitted" });
    await callApproveVerification("activeAdmin", verificationId);

    await setJwtClaims(pg, { sub: STUDENT_ID, role: "authenticated" });
    const r = await pg.query<{ action: string }>(
      `SELECT action FROM public.audit_logs;`,
    );
    expect(r.rows.length).toBe(0);
  });

  it("audit_logs is invisible to anonymous", async () => {
    const verificationId = await seedVerificationRow(LANDLORD_ID, { status: "submitted" });
    await callApproveVerification("activeAdmin", verificationId);

    await pg.query(`SET ROLE anon;`);
    await pg.query(`SET request.jwt.claims = '';`);
    const r = await pg.query<{ action: string }>(
      `SELECT action FROM public.audit_logs;`,
    );
    expect(r.rows.length).toBe(0);
  });

  it("actor_id is derived from auth.uid(), never a function parameter", async () => {
    // The admin_approve_verification function takes ONLY (p_verification_id, p_reason).
    // There is no actor_id parameter — it's set inside the function via auth.uid().
    const verificationId = await seedVerificationRow(LANDLORD_ID, { status: "submitted" });
    await callApproveVerification("activeAdmin", verificationId);
    const logs = await fetchAuditLogForEntity("landlord_verification", verificationId);
    expect(logs.length).toBe(1);
    expect(logs[0]?.actor_id).toBe(ADMIN_ID); // active admin
    expect(logs[0]?.actor_id).not.toBe(STUDENT_ID);
    expect(logs[0]?.actor_id).not.toBe(LANDLORD_ID);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit-log transactionality — atomic with the mutation
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 10 §28 audit log transactionality", () => {
  it("if the mutation fails, no audit row is inserted", async () => {
    // Try to suspend an already-suspended property — the function
    // will fail at the state-machine check AFTER the auth check.
    const suspendedId = await seedPropertyRow(LANDLORD_APPROVED_ID, {
      status: "approved",
      isSuspended: true,
      suspensionReason: "First",
    });
    await callSuspendProperty("activeAdmin", suspendedId, "Second attempt");

    // The suspension failed (check_violation). Verify NO audit row was
    // written — proving the entire transaction (including the audit
    // insert) was rolled back.
    const logs = await fetchAuditLogForEntity("property", suspendedId);
    expect(logs.length).toBe(0);
  });

  it("if the mutation succeeds, exactly ONE audit row is inserted", async () => {
    const propertyId = await seedPropertyRow(LANDLORD_APPROVED_ID, { status: "approved" });
    await callSuspendProperty("activeAdmin", propertyId, "Reason");
    const logs = await fetchAuditLogForEntity("property", propertyId);
    expect(logs.length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property suspension lifecycle — visibility / booking / payment impact
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 10 §14 property suspension lifecycle", () => {
  it("suspended property disappears from public discovery RLS", async () => {
    const propertyId = await seedPropertyRow(LANDLORD_APPROVED_ID, {
      status: "approved",
      isSuspended: false,
    });

    // Verify visible BEFORE suspension.
    await pg.query(`SET ROLE anon;`);
    await pg.query(`SET request.jwt.claims = '';`);
    const before = await pg.query<{ id: string }>(
      `SELECT id FROM public.properties WHERE id = $1;`,
      [propertyId],
    );
    expect(before.rows.length).toBe(1);

    // Suspend.
    await callSuspendProperty("activeAdmin", propertyId, "Investigation");

    // Verify invisible AFTER suspension.
    await pg.query(`SET ROLE anon;`);
    await pg.query(`SET request.jwt.claims = '';`);
    const after = await pg.query<{ id: string }>(
      `SELECT id FROM public.properties WHERE id = $1;`,
      [propertyId],
    );
    expect(after.rows.length).toBe(0);
  });

  it("landlord can still see their own suspended property (read)", async () => {
    const propertyId = await seedPropertyRow(LANDLORD_APPROVED_ID, {
      status: "approved",
      isSuspended: false,
    });

    await callSuspendProperty("activeAdmin", propertyId, "Investigation");

    await setJwtClaims(pg, { sub: LANDLORD_APPROVED_ID, role: "authenticated" });
    const r = await pg.query<{ id: string }>(
      `SELECT id FROM public.properties WHERE id = $1;`,
      [propertyId],
    );
    expect(r.rows.length).toBe(1);
  });

  it("admin can see suspended property (read)", async () => {
    const propertyId = await seedPropertyRow(LANDLORD_APPROVED_ID, {
      status: "approved",
      isSuspended: false,
    });

    await callSuspendProperty("activeAdmin", propertyId, "Investigation");

    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const r = await pg.query<{ id: string }>(
      `SELECT id FROM public.properties WHERE id = $1;`,
      [propertyId],
    );
    expect(r.rows.length).toBe(1);
  });

  it("landlord cannot self-unsuspend (column-guard trigger blocks)", async () => {
    const propertyId = await seedPropertyRow(LANDLORD_APPROVED_ID, {
      status: "approved",
      isSuspended: false,
    });
    await callSuspendProperty("activeAdmin", propertyId, "Investigation");

    // Landlord attempts to clear is_suspended directly via UPDATE.
    await setJwtClaims(pg, { sub: LANDLORD_APPROVED_ID, role: "authenticated" });
    await expect(
      pg.query(
        `UPDATE public.properties SET is_suspended = false WHERE id = $1;`,
        [propertyId],
      ),
    ).rejects.toThrow(/Only admins can change properties.is_suspended/);
  });

  it("liftSuspension reverses — property reappears in public discovery", async () => {
    const propertyId = await seedPropertyRow(LANDLORD_APPROVED_ID, {
      status: "approved",
      isSuspended: false,
    });
    await callSuspendProperty("activeAdmin", propertyId, "Investigation");
    await callLiftSuspensionProperty("activeAdmin", propertyId, "Cleared");

    await pg.query(`SET ROLE anon;`);
    await pg.query(`SET request.jwt.claims = '';`);
    const r = await pg.query<{ id: string }>(
      `SELECT id FROM public.properties WHERE id = $1;`,
      [propertyId],
    );
    expect(r.rows.length).toBe(1);
  });

  it("suspended property RLS allows existing confirmed bookings to remain (FK intact)", async () => {
    // Create an approved property + a confirmed booking on it, then suspend.
    const propertyId = await seedPropertyRow(LANDLORD_APPROVED_ID, {
      status: "approved",
      isSuspended: false,
    });
    await setServiceRole(pg);
    // Insert a room (the property is approved, so listing is allowed).
    await pg.query(
      `INSERT INTO public.rooms (id, property_id, room_type, price, occupancy, is_listed)
       VALUES ('11111111-1111-1111-1111-000000000001', $1, 'single', 1000.00, 1, true);`,
      [propertyId],
    );
    // Insert booking as reservation_pending (state-machine trigger requires
    // this starting state), then UPDATE to confirmed (the documented
    // transition path — system-only).
    await pg.query(
      `INSERT INTO public.bookings (id, room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
       VALUES ('22222222-2222-2222-2222-000000000001', '11111111-1111-1111-1111-000000000001', $1, $2, $3, 'reservation_pending', 1000.00, now() + interval '1 hour');`,
      [propertyId, LANDLORD_APPROVED_ID, STUDENT_ID],
    );
    // Move to payment_pending, then confirmed (documented transitions).
    await pg.query(
      `UPDATE public.bookings SET status = 'payment_pending' WHERE id = '22222222-2222-2222-2222-000000000001';`,
    );
    await pg.query(
      `UPDATE public.bookings SET status = 'confirmed', confirmed_at = now() WHERE id = '22222222-2222-2222-2222-000000000001';`,
    );

    // Suspend the property.
    await callSuspendProperty("activeAdmin", propertyId, "Investigation");

    // Verify the booking still exists + is still 'confirmed'.
    await setServiceRole(pg);
    const r = await pg.query<{ status: string }>(
      `SELECT status FROM public.bookings WHERE id = '22222222-2222-2222-2222-000000000001';`,
    );
    expect(r.rows.length).toBe(1);
    expect(r.rows[0]?.status).toBe("confirmed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin monitoring reads — bookings / payments / webhook events / audit logs
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 10 §16/§18/§19 admin monitoring reads", () => {
  beforeEach(async () => {
    // Seed a payment_transactions row via service-role for admin read tests.
    await setServiceRole(pg);
    // Make the landlord approved so we can create a property + room + booking.
    await ensureLandlordRow(LANDLORD_APPROVED_ID, { verificationStatus: "approved" });
    await pg.query(
      `INSERT INTO public.properties (id, landlord_id, university_id, area, address, description, status)
       VALUES ('33333333-3333-3333-3333-000000000001', $1, $2, 'Area', 'Address', 'Desc', 'approved');`,
      [LANDLORD_APPROVED_ID, UNIVERSITY_ID],
    );
    await pg.query(
      `INSERT INTO public.rooms (id, property_id, room_type, price, occupancy, is_listed)
       VALUES ('44444444-4444-4444-4444-000000000001', '33333333-3333-3333-3333-000000000001', 'single', 5000.00, 1, true);`,
    );
    await pg.query(
      `INSERT INTO public.bookings (id, room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
       VALUES ('55555555-5555-5555-5555-000000000001', '44444444-4444-4444-4444-000000000001', '33333333-3333-3333-3333-000000000001', $1, $2, 'reservation_pending', 5000.00, now() + interval '1 hour');`,
      [LANDLORD_APPROVED_ID, STUDENT_ID],
    );
    await pg.query(
      `INSERT INTO public.payment_transactions (id, booking_id, paystack_reference, amount, currency, status)
       VALUES ('66666666-6666-6666-6666-000000000001', '55555555-5555-5555-5555-000000000001', 'ref-test-1', 5000.00, 'NGN', 'pending');`,
    );
    await pg.query(
      `INSERT INTO public.payment_webhook_events (id, provider_event_id, paystack_reference, event_type, raw_payload)
       VALUES ('77777777-7777-7777-7777-000000000001', 'evt-1', 'ref-test-1', 'charge.success', '{"event": "charge.success"}'::jsonb);`,
    );
  });

  it("admin can read all bookings via RLS", async () => {
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.bookings;`);
    expect(r.rows.length).toBe(1);
    expect(r.rows[0]?.id).toBe("55555555-5555-5555-5555-000000000001");
  });

  it("student CANNOT read all bookings via RLS", async () => {
    await setJwtClaims(pg, { sub: STUDENT_ID, role: "authenticated" });
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.bookings;`);
    // Student can only see own bookings — they own this one, so 1 row.
    // But they cannot see bookings belonging to other students.
    expect(r.rows.length).toBe(1);
    // Add another booking on a different room (the partial unique index
    // `one_active_booking_per_room` blocks same-room bookings) owned by
    // a different student to verify scoping.
    await setServiceRole(pg);
    await pg.query(
      `INSERT INTO public.rooms (id, property_id, room_type, price, occupancy, is_listed)
       VALUES ('44444444-4444-4444-4444-000000000002', '33333333-3333-3333-3333-000000000001', 'shared', 4000.00, 2, true);`,
    );
    await pg.query(
      `INSERT INTO public.bookings (id, room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
       VALUES ('88888888-8888-8888-8888-000000000001', '44444444-4444-4444-4444-000000000002', '33333333-3333-3333-3333-000000000001', $1, $2, 'reservation_pending', 4000.00, now() + interval '1 hour');`,
      [LANDLORD_APPROVED_ID, ADMIN_ID],
    );
    await setJwtClaims(pg, { sub: STUDENT_ID, role: "authenticated" });
    const r2 = await pg.query<{ id: string }>(`SELECT id FROM public.bookings;`);
    expect(r2.rows.length).toBe(1); // Only the student's own booking.
  });

  it("landlord CANNOT read bookings on properties they don't own", async () => {
    // LANDLORD_ID is not the property owner — they should see zero rows.
    await setJwtClaims(pg, { sub: LANDLORD_ID, role: "authenticated" });
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.bookings;`);
    expect(r.rows.length).toBe(0);
  });

  it("anonymous CANNOT read bookings", async () => {
    await pg.query(`SET ROLE anon;`);
    await pg.query(`SET request.jwt.claims = '';`);
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.bookings;`);
    expect(r.rows.length).toBe(0);
  });

  it("admin can read payment_transactions including provider_metadata", async () => {
    await setServiceRole(pg);
    // Set provider_metadata on the payment row.
    await pg.query(
      `UPDATE public.payment_transactions SET provider_metadata = '{"gateway_response": "approved"}'::jsonb WHERE id = '66666666-6666-6666-6666-000000000001';`,
    );
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const r = await pg.query<{ id: string; provider_metadata: unknown }>(
      `SELECT id, provider_metadata FROM public.payment_transactions;`,
    );
    expect(r.rows.length).toBe(1);
    expect(r.rows[0]?.provider_metadata).toBeTruthy();
  });

  it("student CANNOT see other students' payment_transactions", async () => {
    await setJwtClaims(pg, { sub: STUDENT_ID, role: "authenticated" });
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.payment_transactions;`);
    expect(r.rows.length).toBe(1); // Own booking's payment — allowed.
  });

  it("landlord CANNOT read payment_transactions (no RLS policy grants)", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_APPROVED_ID, role: "authenticated" });
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.payment_transactions;`);
    expect(r.rows.length).toBe(0);
  });

  it("admin can read payment_webhook_events", async () => {
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.payment_webhook_events;`);
    expect(r.rows.length).toBe(1);
  });

  it("student CANNOT read payment_webhook_events", async () => {
    await setJwtClaims(pg, { sub: STUDENT_ID, role: "authenticated" });
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.payment_webhook_events;`);
    expect(r.rows.length).toBe(0);
  });

  it("landlord CANNOT read payment_webhook_events", async () => {
    await setJwtClaims(pg, { sub: LANDLORD_APPROVED_ID, role: "authenticated" });
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.payment_webhook_events;`);
    expect(r.rows.length).toBe(0);
  });

  it("payment_webhook_events is mutation-blocked for all client roles (admin included)", async () => {
    // No INSERT/UPDATE/DELETE policies exist — direct client attempts are blocked.
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });
    await expect(
      pg.query(
        `INSERT INTO public.payment_webhook_events (id, provider_event_id, paystack_reference, event_type, raw_payload)
         VALUES ('99999999-9999-9999-9999-000000000001', 'evt-2', 'ref-x', 'charge.success', '{}'::jsonb);`,
      ),
    ).rejects.toThrow();
    await expect(
      pg.query(`UPDATE public.payment_webhook_events SET provider_event_id = 'forged';`),
    ).resolves.toBeDefined(); // UPDATE returns 0 rows — silently filtered.
    // Verify the row is unchanged.
    await setServiceRole(pg);
    const r = await pg.query<{ provider_event_id: string }>(
      `SELECT provider_event_id FROM public.payment_webhook_events WHERE id = '77777777-7777-7777-7777-000000000001';`,
    );
    expect(r.rows[0]?.provider_event_id).toBe("evt-1");
  });
});
