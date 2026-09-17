/**
 * Phase 11 — Notification failure-isolation tests.
 *
 * The MOST critical Phase 11 test requirement: per IMPLEMENTATION_PLAN.md §16
 * and API_CONTRACTS.md §18 + PRD §15:
 *
 *   "Notification failure must not break the underlying business transaction."
 *
 *   "the email-send call happens *after* and *outside* the database
 *    transaction recording the actual state change — a booking is
 *    `confirmed` in the database regardless of whether the subsequent
 *    email call succeeds, fails, times out, or is never reached due
 *    to a deploy restart mid-request."
 *
 * Test approach:
 *   1. Build a real Supabase-mock client backed by pglite.
 *   2. Override the default email provider with a `ThrowingEmailProvider`
 *      that throws on every sendEmail call.
 *   3. Run each notification-triggering Server Action.
 *   4. Verify the business state was committed correctly.
 *   5. Verify the Server Action returned success (no error surfaced
 *      to the caller).
 *
 * The ThrowingEmailProvider forces the notification boundary to fail.
 * The dispatchNotification function catches the throw and returns
 * `outcome: 'provider_error'` — it does NOT propagate the throw.
 *
 * Per Phase 11 §32: the test verifies the dispatch contract behavior
 * (failure is isolated, business state survives) against a mocked
 * provider. NOT VERIFIED: real SMTP/HTTP delivery to a real provider.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { makeFreshDb, setServiceRole, setJwtClaims, createAuthUser, createProfile } from "./helpers";
import type { PGlite } from "@electric-sql/pglite";
import type { EmailProvider, NotificationResult } from "@/server/notifications";

let pg: PGlite;

const ADMIN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const STUDENT_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const LANDLORD_APPROVED_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const UNIVERSITY_ID = "00000000-0000-0000-0000-000000000001";

const PROPERTY_ID = "11111111-1111-1111-1111-111111111111";
const ROOM_ID = "22222222-2222-2222-2222-222222222222";
const BOOKING_ID = "33333333-3333-3333-3333-333333333333";
const VERIFICATION_ID = "44444444-4444-4444-4444-444444444444";

// ── ThrowingEmailProvider: forces every sendEmail call to fail ───────────────

class ThrowingEmailProvider implements EmailProvider {
  public callCount = 0;
  public lastError: Error | null = null;

  async sendEmail(): Promise<void> {
    this.callCount += 1;
    this.lastError = new Error("Simulated email provider failure");
    throw this.lastError;
  }
}

// ── RecordingEmailProvider: captures every dispatch attempt ──────────────────

class RecordingEmailProvider implements EmailProvider {
  public sent: Array<{ to: string; subject: string; reference: string }> = [];

  async sendEmail(params: {
    to: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    reference: string;
  }): Promise<void> {
    this.sent.push({
      to: params.to,
      subject: params.subject,
      reference: params.reference,
    });
  }
}

// ── pglite-backed Supabase client adapter ────────────────────────────────────
//
// Wraps a PGlite instance in the loose-typed shape expected by the
// core functions (`db.from(table).select(...)...`).
//
// Supports: select().eq().maybeSingle(), select().eq(), insert().select(),
// update().eq(), rpc().

function makePgliteSupabaseClient(pg: PGlite) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (table: string): any => {
    type Filter = { type: string; column: string; value: unknown };
    const state: {
      table: string;
      filters: Filter[];
      selectShape?: string;
      orders: Array<{ column: string; ascending: boolean }>;
      range?: { from: number; to: number };
      insertPayload?: Record<string, unknown>;
      updatePayload?: Record<string, unknown>;
      singleMode?: boolean;
    } = {
      table,
      filters: [],
      orders: [],
    };

    const buildWhere = (): { sql: string; params: unknown[] } => {
      const params: unknown[] = [];
      const clauses: string[] = [];
      for (const f of state.filters) {
        if (f.type === "eq") {
          params.push(f.value);
          clauses.push(`${f.column} = $${params.length}`);
        } else if (f.type === "in") {
          const values = f.value as unknown[];
          const placeholders = values.map((v) => {
            params.push(v);
            return `$${params.length}`;
          });
          clauses.push(`${f.column} IN (${placeholders.join(", ")})`);
        } else if (f.type === "lt") {
          params.push(f.value);
          clauses.push(`${f.column} < $${params.length}`);
        }
      }
      return { sql: clauses.join(" AND "), params };
    };

    async function runQuery(): Promise<{ data: unknown; error: unknown; count?: number }> {
      try {
        const { sql: whereSql, params } = buildWhere();
        // Handle schema-qualified table names (e.g., "auth.users").
        const tableRef = state.table.includes(".")
          ? state.table
          : `public.${state.table}`;

        // INSERT.
        if (state.insertPayload) {
          const cols = Object.keys(state.insertPayload);
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
          const values = cols.map((c) => (state.insertPayload as Record<string, unknown>)[c]);
          const sql = `INSERT INTO ${tableRef} (${cols.join(", ")})
                       VALUES (${placeholders})
                       RETURNING *;`;
          const r = await pg.query(sql, values);
          return { data: state.singleMode ? (r.rows[0] ?? null) : r.rows, error: null };
        }

        // UPDATE.
        if (state.updatePayload) {
          const cols = Object.keys(state.updatePayload);
          const setClauses = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
          const values = cols.map((c) => (state.updatePayload as Record<string, unknown>)[c]);
          const finalSql = whereSql
            ? `UPDATE ${tableRef} SET ${setClauses} WHERE ${whereSql}`
            : `UPDATE ${tableRef} SET ${setClauses}`;
          const finalParams = whereSql ? [...values, ...params] : values;
          const r = await pg.query(finalSql, finalParams);
          return { data: null, error: null, count: r.rowCount };
        }

        // SELECT (default).
        const selectShape = state.selectShape ?? "*";
        let sql = `SELECT ${selectShape} FROM ${tableRef}`;
        if (whereSql) {
          sql += ` WHERE ${whereSql}`;
        }
        for (const o of state.orders) {
          sql += ` ORDER BY ${o.column} ${o.ascending ? "ASC" : "DESC"}`;
        }
        if (state.range) {
          sql += ` LIMIT ${state.range.to - state.range.from + 1} OFFSET ${state.range.from}`;
        }
        const r = await pg.query(sql, params);
        return {
          data: state.singleMode ? (r.rows[0] ?? null) : r.rows,
          error: null,
          count: r.rows.length,
        };
      } catch (err) {
        return { data: null, error: err };
      }
    }

    // Thenable chainable — when awaited, runs the query.
    const chainable = {
      select(shape?: string) {
        if (shape) state.selectShape = shape;
        return chainable;
      },
      eq(column: string, value: unknown) {
        state.filters.push({ type: "eq", column, value });
        return chainable;
      },
      in(column: string, values: unknown[]) {
        state.filters.push({ type: "in", column, value: values });
        return chainable;
      },
      lt(column: string, value: unknown) {
        state.filters.push({ type: "lt", column, value });
        return chainable;
      },
      order(column: string, opts?: { ascending?: boolean }) {
        state.orders.push({ column, ascending: opts?.ascending ?? true });
        return chainable;
      },
      range(from: number, to: number) {
        state.range = { from, to };
        return chainable;
      },
      maybeSingle() {
        state.singleMode = true;
        return chainable;
      },
      single() {
        state.singleMode = true;
        return chainable;
      },
      insert(payload: Record<string, unknown>) {
        state.insertPayload = payload;
        return chainable;
      },
      update(payload: Record<string, unknown>) {
        state.updatePayload = payload;
        return chainable;
      },
      // Thenable — when awaited, runs the query.
      then(resolve: (v: unknown) => void, reject: (e: unknown) => void) {
        runQuery().then(resolve, reject);
      },
    };

    return chainable;
  };

  // rpc — call a Postgres function.
  const rpc = async (fn: string, params?: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> => {
    try {
      const keys = Object.keys(params ?? {});
      const values = keys.map((k) => (params as Record<string, unknown>)[k]);
      // Heuristic casts based on parameter name.
      const parts = keys.map((k) => {
        if (k === "p_reason" || k === "p_resolution_notes" || k === "p_outcome") {
          return "::text";
        }
        if (k === "p_provider_metadata") {
          return "::jsonb";
        }
        return "::uuid";
      });
      const args = keys.map((_, i) => `$${i + 1}${parts[i]}`).join(", ");
      const sql = `SELECT public.${fn}(${args});`;
      await pg.query(sql, values);
      return { data: null, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  return { from, rpc };
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  pg = await makeFreshDb();
  await createAuthUser(pg, ADMIN_ID, "admin@example.com");
  await createProfile(pg, {
    id: ADMIN_ID,
    role: "admin",
    full_name: "Active Admin",
    phone: "+10000000000",
  });
  await createAuthUser(pg, STUDENT_ID, "student@example.com");
  await createProfile(pg, {
    id: STUDENT_ID,
    role: "student",
    full_name: "Test Student",
    phone: "+10000000002",
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
  // Booking — completed (so a review can be created against it).
  await pg.query(
    `INSERT INTO public.bookings (id, room_id, property_id, landlord_id, student_id, status, reserved_price, hold_expires_at)
     VALUES ($1, $2, $3, $4, $5, 'reservation_pending', 5000.00, now() + interval '1 hour');`,
    [BOOKING_ID, ROOM_ID, PROPERTY_ID, LANDLORD_APPROVED_ID, STUDENT_ID],
  );
  await pg.query(`UPDATE public.bookings SET status = 'payment_pending' WHERE id = $1;`, [BOOKING_ID]);
  await pg.query(`UPDATE public.bookings SET status = 'confirmed', confirmed_at = now() WHERE id = $1;`, [BOOKING_ID]);
  await pg.query(`UPDATE public.bookings SET status = 'completed', completed_at = now() WHERE id = $1;`, [BOOKING_ID]);
});

afterEach(async () => {
  await pg.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Failure-isolation tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 11 §21 — notification failure does NOT roll back business mutation", () => {
  let throwingProvider: ThrowingEmailProvider;

  beforeEach(async () => {
    // Inject a throwing email provider — every dispatchNotification call
    // will hit this provider, which throws on every sendEmail.
    throwingProvider = new ThrowingEmailProvider();
    const { _setTestEmailProvider } = await import("@/server/notifications/providers");
    _setTestEmailProvider(throwingProvider);
  });

  afterEach(async () => {
    const { _setTestEmailProvider } = await import("@/server/notifications/providers");
    _setTestEmailProvider(null);
  });

  it("verification approval survives email failure (state remains approved, no throw)", async () => {
    // Seed a verification submission.
    await setServiceRole(pg);
    await pg.query(
      `INSERT INTO public.landlord_verifications (id, landlord_id, status, submitted_id_reference, submitted_ownership_reference)
       VALUES ($1, $2, 'submitted', 'id/path.png', 'ownership/path.png');`,
      [VERIFICATION_ID, LANDLORD_APPROVED_ID],
    );

    // Run approveVerificationCore via pglite-backed client.
    const { approveVerificationCore } = await import("@/server/verification/core");
    const adminUser = {
      id: ADMIN_ID,
      email: "admin@example.com",
      emailVerified: true,
      profile: {
        id: ADMIN_ID,
        role: "admin" as const,
        fullName: "Active Admin",
        phone: "+10000000000",
        universityId: null,
        accountStatus: "active" as const,
        suspensionReason: null,
      },
    };

    const db = makePgliteSupabaseClient(pg);
    // Set JWT claims so the SECURITY DEFINER function sees auth.uid() = ADMIN_ID.
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });

    const result = await approveVerificationCore(db, adminUser, {
      verificationId: VERIFICATION_ID,
    });

    // Verify the Server Action returned success.
    expect(result.status).toBe("approved");

    // Verify the verification row was approved.
    await setServiceRole(pg);
    const row = await pg.query<{ status: string; decision: string }>(
      `SELECT status, decision FROM public.landlord_verifications WHERE id = $1;`,
      [VERIFICATION_ID],
    );
    expect(row.rows[0]?.status).toBe("approved");
    expect(row.rows[0]?.decision).toBe("approved");

    // Verify the email provider was actually called (failure was real).
    expect(throwingProvider.callCount).toBeGreaterThanOrEqual(1);

    // Verify an audit_logs row was written (proves the RPC committed).
    const audit = await pg.query<{ action: string }>(
      `SELECT action FROM public.audit_logs WHERE entity_id = $1;`,
      [VERIFICATION_ID],
    );
    expect(audit.rows.length).toBe(1);
    expect(audit.rows[0]?.action).toBe("landlord_verification.approved");
  });

  it("verification rejection survives email failure (state remains rejected, reason stored)", async () => {
    await setServiceRole(pg);
    await pg.query(
      `INSERT INTO public.landlord_verifications (id, landlord_id, status, submitted_id_reference, submitted_ownership_reference)
       VALUES ($1, $2, 'submitted', 'id/path.png', 'ownership/path.png');`,
      [VERIFICATION_ID, LANDLORD_APPROVED_ID],
    );

    const { rejectVerificationCore } = await import("@/server/verification/core");
    const adminUser = {
      id: ADMIN_ID,
      email: "admin@example.com",
      emailVerified: true,
      profile: {
        id: ADMIN_ID,
        role: "admin" as const,
        fullName: "Active Admin",
        phone: "+10000000000",
        universityId: null,
        accountStatus: "active" as const,
        suspensionReason: null,
      },
    };

    const db = makePgliteSupabaseClient(pg);
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });

    const result = await rejectVerificationCore(db, adminUser, {
      verificationId: VERIFICATION_ID,
      reason: "Fake documents detected",
    });

    expect(result.status).toBe("rejected");
    expect(result.decisionReason).toBe("Fake documents detected");

    await setServiceRole(pg);
    const row = await pg.query<{ status: string; decision_reason: string }>(
      `SELECT status, decision_reason FROM public.landlord_verifications WHERE id = $1;`,
      [VERIFICATION_ID],
    );
    expect(row.rows[0]?.status).toBe("rejected");
    expect(row.rows[0]?.decision_reason).toBe("Fake documents detected");
    expect(throwingProvider.callCount).toBeGreaterThanOrEqual(1);
  });

  it("property suspension survives email failure", async () => {
    const { suspendPropertyCore } = await import("@/server/admin/core");
    const adminUser = {
      id: ADMIN_ID,
      email: "admin@example.com",
      emailVerified: true,
      profile: {
        id: ADMIN_ID,
        role: "admin" as const,
        fullName: "Active Admin",
        phone: "+10000000000",
        universityId: null,
        accountStatus: "active" as const,
        suspensionReason: null,
      },
    };

    const db = makePgliteSupabaseClient(pg);
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });

    await suspendPropertyCore(db, adminUser, {
      propertyId: PROPERTY_ID,
      reason: "Investigation pending",
    });

    // Verify property is suspended.
    await setServiceRole(pg);
    const row = await pg.query<{ is_suspended: boolean; suspension_reason: string }>(
      `SELECT is_suspended, suspension_reason FROM public.properties WHERE id = $1;`,
      [PROPERTY_ID],
    );
    expect(row.rows[0]?.is_suspended).toBe(true);
    expect(row.rows[0]?.suspension_reason).toBe("Investigation pending");
    expect(throwingProvider.callCount).toBeGreaterThanOrEqual(1);
  });

  it("report resolution survives email failure (state remains resolved, audit written)", async () => {
    // Seed a report.
    await setJwtClaims(pg, { sub: STUDENT_ID, role: "authenticated" });
    await pg.query(
      `INSERT INTO public.reports (reporter_id, reported_entity_type, reported_entity_id, reason_category, status)
       VALUES ($1, 'property', $2, 'spam', 'open');`,
      [STUDENT_ID, PROPERTY_ID],
    );
    await setServiceRole(pg);
    const r = await pg.query<{ id: string }>(`SELECT id FROM public.reports;`);
    const reportId = r.rows[0]!.id;

    const { resolveReportCore } = await import("@/server/reports/core");
    const adminUser = {
      id: ADMIN_ID,
      email: "admin@example.com",
      emailVerified: true,
      profile: {
        id: ADMIN_ID,
        role: "admin" as const,
        fullName: "Active Admin",
        phone: "+10000000000",
        universityId: null,
        accountStatus: "active" as const,
        suspensionReason: null,
      },
    };

    const db = makePgliteSupabaseClient(pg);
    await setJwtClaims(pg, { sub: ADMIN_ID, role: "authenticated" });

    await resolveReportCore(db, adminUser, {
      reportId,
      resolutionNotes: "Investigation complete",
      outcome: "action_taken",
    });

    // Verify state.
    await setServiceRole(pg);
    const row = await pg.query<{ status: string; resolution_notes: string }>(
      `SELECT status, resolution_notes FROM public.reports WHERE id = $1;`,
      [reportId],
    );
    expect(row.rows[0]?.status).toBe("resolved");
    expect(row.rows[0]?.resolution_notes).toBe("Investigation complete");

    // Verify audit log written (proves RPC committed).
    const audit = await pg.query<{ action: string }>(
      `SELECT action FROM public.audit_logs WHERE entity_id = $1;`,
      [reportId],
    );
    expect(audit.rows.length).toBe(1);
    expect(audit.rows[0]?.action).toBe("report.resolved");

    expect(throwingProvider.callCount).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Recipient-derivation test
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 11 §18 — server-derived recipient (never client-supplied email)", () => {
  let recordingProvider: RecordingEmailProvider;

  beforeEach(async () => {
    recordingProvider = new RecordingEmailProvider();
    const { _setTestEmailProvider } = await import("@/server/notifications/providers");
    _setTestEmailProvider(recordingProvider);
  });

  afterEach(async () => {
    const { _setTestEmailProvider } = await import("@/server/notifications/providers");
    _setTestEmailProvider(null);
  });

  it("dispatchNotification resolves recipient email from profiles (server-derived)", async () => {
    const { dispatchNotification } = await import("@/server/notifications/core");
    const db = makePgliteSupabaseClient(pg);

    const result: NotificationResult = await dispatchNotification(
      {
        event: "landlord_verification.approved",
        recipientUserId: LANDLORD_APPROVED_ID,
        data: { landlordFullName: "Approved Landlord", validUntil: null },
      },
      { db },
    );

    expect(result.outcome).toBe("sent");
    expect(recordingProvider.sent.length).toBe(1);
    expect(recordingProvider.sent[0]?.to).toBe("landlord@example.com");
  });

  it("dispatchNotification returns 'no_recipient_email' if auth.users row doesn't exist", async () => {
    // Use a UUID that doesn't exist in auth.users OR profiles — the
    // lookup returns null, outcome='no_recipient_email'.
    const { dispatchNotification } = await import("@/server/notifications/core");
    const db = makePgliteSupabaseClient(pg);

    const result = await dispatchNotification(
      {
        event: "landlord_verification.approved",
        recipientUserId: "fdfdfdfd-fdfd-fdfd-fdfd-fdfdfdfdfdfd",
        data: { landlordFullName: "Orphan", validUntil: null },
      },
      { db },
    );

    expect(result.outcome).toBe("no_recipient_email");
    expect(recordingProvider.sent.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// dispatchNotification contract tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 11 — dispatchNotification contract", () => {
  let throwingProvider: ThrowingEmailProvider;

  beforeEach(async () => {
    throwingProvider = new ThrowingEmailProvider();
    const { _setTestEmailProvider } = await import("@/server/notifications/providers");
    _setTestEmailProvider(throwingProvider);
  });

  afterEach(async () => {
    const { _setTestEmailProvider } = await import("@/server/notifications/providers");
    _setTestEmailProvider(null);
  });

  it("dispatchNotification NEVER rejects on provider failure (resolves with outcome='provider_error')", async () => {
    const { dispatchNotification } = await import("@/server/notifications/core");
    const db = makePgliteSupabaseClient(pg);

    // Use await — if it threw, this test would fail.
    const result = await dispatchNotification(
      {
        event: "landlord_verification.approved",
        recipientUserId: LANDLORD_APPROVED_ID,
        data: { landlordFullName: "Landlord", validUntil: null },
      },
      { db },
    );

    expect(result.outcome).toBe("provider_error");
    expect(result.event).toBe("landlord_verification.approved");
    expect(result.recipientUserId).toBe(LANDLORD_APPROVED_ID);
    expect(throwingProvider.callCount).toBe(1);
  });

  it("dispatchNotification returns 'unknown_event' for an unregistered event", async () => {
    // Temporarily cast to bypass the closed enum — simulating a future
    // event that's not yet registered.
    const { dispatchNotification } = await import("@/server/notifications/core");
    const db = makePgliteSupabaseClient(pg);

    const result = await dispatchNotification(
      {
        event: "future.unknown_event" as never,
        recipientUserId: LANDLORD_APPROVED_ID,
        data: {},
      },
      { db },
    );

    expect(result.outcome).toBe("unknown_event");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Notification provider contract tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 11 §16 — email provider boundary", () => {
  it("ConsoleEmailProvider.sendEmail resolves without throwing", async () => {
    const { ConsoleEmailProvider } = await import("@/server/notifications/providers");
    const provider = new ConsoleEmailProvider();
    // Suppress console.log for this test.
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await expect(
      provider.sendEmail({
        to: "test@example.com",
        subject: "Test",
        htmlBody: "<p>Hi</p>",
        textBody: "Hi",
        reference: "test-ref",
      }),
    ).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it("HttpEmailProvider without endpoint falls back to console (does not throw)", async () => {
    const { HttpEmailProvider } = await import("@/server/notifications/providers");
    const provider = new HttpEmailProvider({
      endpoint: "",
      apiKey: "",
      fromAddress: "no-reply@test.app",
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(
      provider.sendEmail({
        to: "test@example.com",
        subject: "Test",
        htmlBody: "<p>Hi</p>",
        textBody: "Hi",
        reference: "test-ref",
      }),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
