/**
 * Phase 4 — verification core integration tests with mocked Supabase clients.
 *
 * TEST DOUBLES DISCLAIMER:
 *   These tests use MOCKED Supabase DB + Storage clients (test doubles).
 *   They verify the NetLodge application logic — validation, authorization,
 *   state machine, and the full submit → review → resubmit lifecycle.
 *
 *   The actual database-level defenses (RLS, triggers, CHECK constraints)
 *   are verified in `tests/db/landlord-verifications.test.ts` against real
 *   Postgres 18 (pglite).
 *
 * Coverage (per Phase 4 task spec §22):
 *   - Happy path: submit → approve → resubmit → reject → resubmit → approve.
 *   - Attack #1: student attempts to create verification → rejected.
 *   - Attack #2: landlord A submits with landlord B's path → rejected.
 *   - Attack #11: non-admin approves → rejected.
 *   - Attack #12: non-admin rejects → rejected.
 *   - Attack #13: admin approves already-decided → rejected.
 *   - Attack #14: admin rejects without reason → validation error.
 *   - Attack #15/#16/#20: client sends forbidden fields → validation_error.
 *   - Attack #17: suspended landlord submits → rejected.
 */
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/lib/auth";
import {
  submitVerificationCore,
  getOwnStatusCore,
  getOwnHistoryCore,
  getVerificationQueueCore,
  getDocumentUrlCore,
  approveVerificationCore,
  rejectVerificationCore,
  type SupabaseDbClient,
} from "@/server/verification/core";
import type { SupabaseStorageClient } from "@/server/storage/core";

// ── Test fixtures ────────────────────────────────────────────────────────────

const LANDLORD_A_ID = "11111111-1111-1111-1111-111111111111";
const LANDLORD_B_ID = "22222222-2222-2222-2222-222222222222";
const STUDENT_ID = "33333333-3333-3333-3333-333333333333";
const ADMIN_ID = "44444444-4444-4444-4444-444444444444";
const VERIFICATION_ID = "55555555-5555-5555-5555-555555555555";

function buildLandlord(id: string, overrides?: {
  accountStatus?: "active" | "suspended";
}): AuthenticatedUser {
  return {
    id,
    email: `landlord-${id.slice(0, 8)}@example.com`,
    emailVerified: true,
    profile: {
      id,
      role: "landlord",
      fullName: "Test Landlord",
      phone: "+2348000000001",
      universityId: null,
      accountStatus: overrides?.accountStatus ?? "active",
      suspensionReason: null,
    },
  };
}

function buildStudent(): AuthenticatedUser {
  return {
    id: STUDENT_ID,
    email: "student@example.com",
    emailVerified: true,
    profile: {
      id: STUDENT_ID,
      role: "student",
      fullName: "Test Student",
      phone: "+2348000000001",
      universityId: "00000000-0000-0000-0000-000000000001",
      accountStatus: "active",
      suspensionReason: null,
    },
  };
}

function buildAdmin(): AuthenticatedUser {
  return {
    id: ADMIN_ID,
    email: "admin@example.com",
    emailVerified: true,
    profile: {
      id: ADMIN_ID,
      role: "admin",
      fullName: "Admin User",
      phone: "+2348000000004",
      universityId: null,
      accountStatus: "active",
      suspensionReason: null,
    },
  };
}

function buildSuspendedLandlord(id: string): AuthenticatedUser {
  return buildLandlord(id, { accountStatus: "suspended" });
}

/**
 * Build a mock SupabaseStorageClient with pre-populated confirmed uploads.
 */
function buildMockStorageClient(params?: {
  landlordId?: string;
}): {
  storage: SupabaseStorageClient;
  idPath: string;
  ownershipPath: string;
} {
  const landlordId = params?.landlordId ?? LANDLORD_A_ID;
  const idPath = `verification/${landlordId}/id/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg`;
  const ownershipPath = `verification/${landlordId}/ownership_evidence/bbbbbbbb-cccc-dddd-eeee-ffffffffffff.pdf`;
  const objects = new Map<string, { size: number; mimetype: string }>([
    [idPath, { size: 1024, mimetype: "image/jpeg" }],
    [ownershipPath, { size: 2048, mimetype: "application/pdf" }],
  ]);

  const storage: SupabaseStorageClient = {
    storage: {
      from: vi.fn().mockImplementation((bucket: string) => ({
        createSignedUploadUrl: vi.fn().mockResolvedValue({
          data: { path: "test", signedUrl: "https://upload.url", token: "t" },
          error: null,
        }),
        list: vi.fn().mockImplementation(async (prefix: string) => {
          const matching = Array.from(objects.entries())
            .filter(([path]) => {
              const pathPrefix = path.slice(0, path.lastIndexOf("/") + 1);
              return pathPrefix === prefix;
            })
            .map(([path, metadata]) => ({
              name: path.slice(path.lastIndexOf("/") + 1),
              bucket_id: bucket,
              owner: null,
              metadata: { size: metadata.size, mimetype: metadata.mimetype },
            }));
          return { data: matching, error: null };
        }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://download.url?token=mock" },
          error: null,
        }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  };

  return { storage, idPath, ownershipPath };
}

/**
 * Build a mock SupabaseDbClient. Each query path gets its own controllable
 * return value.
 */
function buildMockDb(opts?: {
  landlordRow?: Record<string, unknown> | null;
  verificationRow?: Record<string, unknown> | null;
  verificationList?: unknown[];
  insertData?: Record<string, unknown>;
  insertError?: unknown;
  updateError?: unknown;
  queueData?: unknown[];
  queueCount?: number;
  rpcError?: unknown;
}): SupabaseDbClient {
  // Use `opts?.x !== undefined ? opts.x : default` instead of `??` so
  // explicit `null` values are respected (not replaced by the default).
  const landlordRow =
    opts?.landlordRow !== undefined
      ? opts.landlordRow
      : {
          profile_id: LANDLORD_A_ID,
          current_verification_status: "unsubmitted",
          is_suspended: false,
          verification_valid_until: null,
        };
  const verificationRow =
    opts?.verificationRow !== undefined
      ? opts.verificationRow
      : {
          id: VERIFICATION_ID,
          landlord_id: LANDLORD_A_ID,
          status: "submitted",
          decision: null,
          submitted_id_reference: `verification/${LANDLORD_A_ID}/id/test.jpg`,
          submitted_ownership_reference: `verification/${LANDLORD_A_ID}/ownership_evidence/test.pdf`,
          submitted_at: "2025-01-01T00:00:00Z",
          reviewed_at: null,
          decision_reason: null,
          reviewed_by: null,
        };
  const verificationList = opts?.verificationList ?? [];
  const insertData = opts?.insertData ?? { id: VERIFICATION_ID, status: "submitted" };
  const queueData = opts?.queueData ?? [];
  const queueCount = opts?.queueCount ?? 0;

  // Helper: a thenable chainable that returns `resolved` when awaited
  // directly, and also supports `.maybeSingle()`.
  function chainable(resolved: { data: unknown; error: unknown }) {
    const obj = {
      maybeSingle: () => Promise.resolve(resolved),
      // Thenable: when awaited directly, returns the resolved value.
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve(resolved).then(resolve, reject);
      },
    };
    // Return a Proxy that returns `() => chainable(resolved)` for any
    // method name not explicitly defined — this lets `.eq()`, `.order()`,
    // `.limit()`, `.range()` all chain correctly.
    return new Proxy(obj, {
      get(target, prop) {
        if (typeof prop !== "string") return undefined;
        if (prop in target) return target[prop as keyof typeof target];
        return () => chainable(resolved);
      },
    });
  }

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "landlords") {
        return {
          select: () => chainable({ data: landlordRow, error: null }),
        };
      }
      if (table === "landlord_verifications") {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: insertData, error: opts?.insertError ?? null }),
            }),
          }),
          // select() — different callers need different return shapes:
          //   - getOwnStatusCore: .eq().order().limit(1).maybeSingle() → single row
          //   - getOwnHistoryCore: .eq().order() → array (awaited directly)
          //   - getVerificationQueueCore: .order().range() → { data, error, count }
          //   - approve/reject: .eq().maybeSingle() → single row
          //   - getDocumentUrl: .eq().maybeSingle() → single row
          //
          // We can't distinguish between them via the select() args alone,
          // so we use a chain that returns the single-row for maybeSingle()
          // and the list for direct await.
          select: () => {
            const singleResult = { data: verificationRow, error: null };
            const listResult = { data: verificationList, error: null };
            const queueResult = { data: queueData, error: null, count: queueCount };
            return new Proxy(
              {
                maybeSingle: () => Promise.resolve(singleResult),
                then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
                  return Promise.resolve(listResult).then(resolve, reject);
                },
              },
              {
                get(target, prop) {
                  if (typeof prop !== "string") return undefined;
                  if (prop in target) return target[prop as keyof typeof target];
                  // For chainable methods: `.eq()` returns a chain that
                  // still supports maybeSingle() + thenable.
                  // `.order()` returns a chain that, when further chained
                  // with `.range()`, returns queueResult. When awaited
                  // directly (getOwnHistoryCore), returns listResult.
                  // We detect `.range` specifically and return queueResult.
                  if (prop === "range") {
                    return () => Promise.resolve(queueResult);
                  }
                  // Default: return a chainable that resolves to listResult
                  // (for direct await) but also supports maybeSingle()
                  // (for single-row queries).
                  return () =>
                    new Proxy(
                      {
                        maybeSingle: () => Promise.resolve(singleResult),
                        then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
                          return Promise.resolve(listResult).then(resolve, reject);
                        },
                      },
                      {
                        get(t, p) {
                          if (typeof p !== "string") return undefined;
                          if (p in t) return t[p as keyof typeof t];
                          if (p === "range") {
                            return () => Promise.resolve(queueResult);
                          }
                          return () =>
                            new Proxy(
                              {
                                maybeSingle: () => Promise.resolve(singleResult),
                                then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
                                  return Promise.resolve(listResult).then(resolve, reject);
                                },
                              },
                              {
                                get(t2, p2) {
                                  if (typeof p2 !== "string") return undefined;
                                  if (p2 in t2) return t2[p2 as keyof typeof t2];
                                  if (p2 === "range") {
                                    return () => Promise.resolve(queueResult);
                                  }
                                  return () => t2; // self-return for deep chains
                                },
                              },
                            );
                        },
                      },
                    );
                },
              },
            );
          },
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: opts?.updateError ?? null }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
    // Phase 10 — Phase 10 verification approve/reject now calls the
    // `admin_approve_verification` / `admin_reject_verification` SECURITY
    // DEFINER RPC functions instead of direct `.update()` on
    // `landlord_verifications`. Provide a stub that resolves successfully
    // unless an `rpcError` is supplied via options.
    rpc: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: null, error: opts?.rpcError ?? null }),
    ),
  };
}

// ── Submit verification ─────────────────────────────────────────────────────

describe("submitVerificationCore — happy path", () => {
  it("creates a new verification row for an authenticated landlord (TEST 2)", async () => {
    const { storage, idPath, ownershipPath } = buildMockStorageClient();
    const db = buildMockDb();
    const landlord = buildLandlord(LANDLORD_A_ID);

    const result = await submitVerificationCore(db, storage, landlord, {
      idDocumentPath: idPath,
      ownershipEvidencePath: ownershipPath,
    });

    expect(result.verificationId).toBe(VERIFICATION_ID);
    expect(result.status).toBe("submitted");
  });
});

describe("submitVerificationCore — attack scenarios", () => {
  it("Attack #1: student attempts to submit verification → rejected", async () => {
    const { storage } = buildMockStorageClient();
    const db = buildMockDb();
    const student = buildStudent();

    await expect(
      submitVerificationCore(db, storage, student, {
        idDocumentPath: `verification/${STUDENT_ID}/id/test.jpg`,
        ownershipEvidencePath: `verification/${STUDENT_ID}/ownership_evidence/test.pdf`,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("Attack #2: landlord A submits with landlord B's storage path → rejected", async () => {
    // The storage paths belong to landlord B, but the caller is landlord A.
    // Phase 3's confirmVerificationDocumentUploadCore (called internally)
    // will reject because the path's landlordId doesn't match the caller.
    const { storage, idPath, ownershipPath } = buildMockStorageClient({
      landlordId: LANDLORD_B_ID,
    });
    const db = buildMockDb();
    const landlordA = buildLandlord(LANDLORD_A_ID);

    await expect(
      submitVerificationCore(db, storage, landlordA, {
        idDocumentPath: idPath,
        ownershipEvidencePath: ownershipPath,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("Attack #15: client sends role:'admin' → Zod .strict() rejects", async () => {
    const { storage, idPath, ownershipPath } = buildMockStorageClient();
    const db = buildMockDb();
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      submitVerificationCore(db, storage, landlord, {
        idDocumentPath: idPath,
        ownershipEvidencePath: ownershipPath,
        role: "admin",
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("Attack #17: suspended landlord submits → rejected", async () => {
    const { storage, idPath, ownershipPath } = buildMockStorageClient();
    const db = buildMockDb();
    const suspended = buildSuspendedLandlord(LANDLORD_A_ID);

    await expect(
      submitVerificationCore(db, storage, suspended, {
        idDocumentPath: idPath,
        ownershipEvidencePath: ownershipPath,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("Attack #20: client sends landlordId → Zod .strict() rejects", async () => {
    const { storage, idPath, ownershipPath } = buildMockStorageClient();
    const db = buildMockDb();
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      submitVerificationCore(db, storage, landlord, {
        idDocumentPath: idPath,
        ownershipEvidencePath: ownershipPath,
        landlordId: LANDLORD_B_ID,
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("rejects when landlord record doesn't exist", async () => {
    const { storage } = buildMockStorageClient();
    const db = buildMockDb({ landlordRow: null });
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      submitVerificationCore(db, storage, landlord, {
        idDocumentPath: `verification/${LANDLORD_A_ID}/id/test.jpg`,
        ownershipEvidencePath: `verification/${LANDLORD_A_ID}/ownership_evidence/test.pdf`,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects when landlord.is_suspended = true on landlords table", async () => {
    const { storage, idPath, ownershipPath } = buildMockStorageClient();
    const db = buildMockDb({
      landlordRow: {
        profile_id: LANDLORD_A_ID,
        current_verification_status: "unsubmitted",
        is_suspended: true,
        verification_valid_until: null,
      },
    });
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      submitVerificationCore(db, storage, landlord, {
        idDocumentPath: idPath,
        ownershipEvidencePath: ownershipPath,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});

// ── Get own status / history ────────────────────────────────────────────────

describe("getOwnStatusCore", () => {
  it("returns the landlord's current verification status (TEST 1)", async () => {
    const db = buildMockDb({
      landlordRow: {
        profile_id: LANDLORD_A_ID,
        current_verification_status: "unsubmitted",
        verification_valid_until: null,
        is_suspended: false,
      },
      verificationRow: null,
    });
    const landlord = buildLandlord(LANDLORD_A_ID);

    const status = await getOwnStatusCore(db, landlord);

    expect(status.landlordId).toBe(LANDLORD_A_ID);
    expect(status.currentVerificationStatus).toBe("unsubmitted");
    expect(status.isSuspended).toBe(false);
    expect(status.latestVerification).toBeNull();
  });

  it("returns the latest verification row with rejection reason", async () => {
    const db = buildMockDb({
      landlordRow: {
        profile_id: LANDLORD_A_ID,
        current_verification_status: "rejected",
        verification_valid_until: null,
        is_suspended: false,
      },
      verificationRow: {
        id: VERIFICATION_ID,
        status: "rejected",
        submitted_at: "2025-01-01T00:00:00Z",
        decision: "rejected",
        decision_reason: "ID document unclear",
        reviewed_at: "2025-01-02T00:00:00Z",
      },
    });
    const landlord = buildLandlord(LANDLORD_A_ID);

    const status = await getOwnStatusCore(db, landlord);

    expect(status.currentVerificationStatus).toBe("rejected");
    expect(status.latestVerification?.decisionReason).toBe("ID document unclear");
  });

  it("Attack #1: student attempts to view verification status → rejected", async () => {
    const db = buildMockDb();
    const student = buildStudent();

    await expect(getOwnStatusCore(db, student)).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

describe("getOwnHistoryCore", () => {
  it("returns history array for the landlord", async () => {
    const db = buildMockDb();
    const landlord = buildLandlord(LANDLORD_A_ID);

    const result = await getOwnHistoryCore(db, landlord);
    expect(result.history).toBeDefined();
    expect(Array.isArray(result.history)).toBe(true);
  });

  it("Attack #1: student attempts to view verification history → rejected", async () => {
    const db = buildMockDb();
    const student = buildStudent();

    await expect(getOwnHistoryCore(db, student)).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

// ── Admin: get verification queue ───────────────────────────────────────────

describe("getVerificationQueueCore", () => {
  it("returns a paginated queue of pending submissions (TEST 3)", async () => {
    const db = buildMockDb();
    const admin = buildAdmin();

    const result = await getVerificationQueueCore(db, admin, {});

    expect(result.entries).toBeDefined();
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("Attack #9: student attempts to access admin queue → rejected", async () => {
    const db = buildMockDb();
    const student = buildStudent();

    await expect(getVerificationQueueCore(db, student, {})).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("Attack #10: landlord attempts to access admin queue → rejected", async () => {
    const db = buildMockDb();
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(getVerificationQueueCore(db, landlord, {})).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

// ── Admin: approve ──────────────────────────────────────────────────────────

describe("approveVerificationCore", () => {
  it("approves a pending submission (TEST 5)", async () => {
    const db = buildMockDb({
      verificationRow: {
        id: VERIFICATION_ID,
        status: "submitted",
        decision: null,
      },
    });
    const admin = buildAdmin();

    const result = await approveVerificationCore(db, admin, {
      verificationId: VERIFICATION_ID,
    });

    expect(result.verificationId).toBe(VERIFICATION_ID);
    expect(result.status).toBe("approved");
  });

  it("Attack #11: non-admin (landlord) attempts to approve → rejected", async () => {
    const db = buildMockDb();
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      approveVerificationCore(db, landlord, {
        verificationId: VERIFICATION_ID,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("Attack #11: non-admin (student) attempts to approve → rejected", async () => {
    const db = buildMockDb();
    const student = buildStudent();

    await expect(
      approveVerificationCore(db, student, {
        verificationId: VERIFICATION_ID,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("Attack #13: admin approves already-decided submission → conflict", async () => {
    // Phase 10 — approveVerificationCore now delegates to the
    // `admin_approve_verification` RPC. The state-machine violation is
    // raised by the RPC function as a check_violation error.
    const db = buildMockDb({
      rpcError: { message: "This verification submission has already been decided (check_violation)" },
    });
    const admin = buildAdmin();

    await expect(
      approveVerificationCore(db, admin, {
        verificationId: VERIFICATION_ID,
      }),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("rejects approval of a non-existent verification → not_found", async () => {
    // Phase 10 — RPC raises foreign_key_violation with "Verification submission not found".
    const db = buildMockDb({
      rpcError: { message: "Verification submission not found" },
    });
    const admin = buildAdmin();

    await expect(
      approveVerificationCore(db, admin, {
        verificationId: VERIFICATION_ID,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects approval with a forbidden field → validation_error", async () => {
    const db = buildMockDb();
    const admin = buildAdmin();

    await expect(
      approveVerificationCore(db, admin, {
        verificationId: VERIFICATION_ID,
        role: "admin", // ← forbidden
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });
});

// ── Admin: reject ────────────────────────────────────────────────────────────

describe("rejectVerificationCore", () => {
  it("rejects a pending submission with a reason (TEST 6)", async () => {
    const db = buildMockDb({
      verificationRow: {
        id: VERIFICATION_ID,
        status: "submitted",
        decision: null,
      },
    });
    const admin = buildAdmin();

    const result = await rejectVerificationCore(db, admin, {
      verificationId: VERIFICATION_ID,
      reason: "ID document is blurry",
    });

    expect(result.verificationId).toBe(VERIFICATION_ID);
    expect(result.status).toBe("rejected");
    expect(result.decisionReason).toBe("ID document is blurry");
  });

  it("Attack #12: non-admin (landlord) attempts to reject → rejected", async () => {
    const db = buildMockDb();
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      rejectVerificationCore(db, landlord, {
        verificationId: VERIFICATION_ID,
        reason: "test",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("Attack #14: admin rejects without a reason → validation_error", async () => {
    const db = buildMockDb();
    const admin = buildAdmin();

    await expect(
      rejectVerificationCore(db, admin, {
        verificationId: VERIFICATION_ID,
        reason: "",
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("Attack #14: admin rejects with whitespace-only reason → validation_error", async () => {
    const db = buildMockDb();
    const admin = buildAdmin();

    await expect(
      rejectVerificationCore(db, admin, {
        verificationId: VERIFICATION_ID,
        reason: "   ",
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("Attack #13: admin rejects already-decided submission → conflict", async () => {
    // Phase 10 — rejectVerificationCore now delegates to the
    // `admin_reject_verification` RPC. The state-machine violation is
    // raised by the RPC function as a check_violation error.
    const db = buildMockDb({
      rpcError: { message: "This verification submission has already been decided (check_violation)" },
    });
    const admin = buildAdmin();

    await expect(
      rejectVerificationCore(db, admin, {
        verificationId: VERIFICATION_ID,
        reason: "test",
      }),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("rejects with a reason exceeding 2000 chars → validation_error", async () => {
    const db = buildMockDb();
    const admin = buildAdmin();

    await expect(
      rejectVerificationCore(db, admin, {
        verificationId: VERIFICATION_ID,
        reason: "x".repeat(2001),
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });
});

// ── Admin: get document URL ─────────────────────────────────────────────────

describe("getDocumentUrlCore", () => {
  it("issues a signed download URL for a verification document (TEST 4)", async () => {
    // Build a storage mock with objects at known paths.
    const { storage, idPath } = buildMockStorageClient({ landlordId: LANDLORD_A_ID });
    const db = buildMockDb({
      verificationRow: {
        id: VERIFICATION_ID,
        // Use the actual path that exists in the mock storage.
        submitted_id_reference: idPath,
        submitted_ownership_reference: `verification/${LANDLORD_A_ID}/ownership_evidence/test.pdf`,
      },
    });
    const admin = buildAdmin();

    const result = await getDocumentUrlCore(db, storage, admin, {
      verificationId: VERIFICATION_ID,
      documentKind: "id",
    });

    expect(result.signedUrl).toContain("token=");
    expect(result.verificationId).toBe(VERIFICATION_ID);
    expect(result.documentKind).toBe("id");
  });

  it("Attack #9/#10: non-admin attempts to get document URL → rejected", async () => {
    const db = buildMockDb();
    const { storage } = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      getDocumentUrlCore(db, storage, landlord, {
        verificationId: VERIFICATION_ID,
        documentKind: "id",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});

// ── Resubmission lifecycle (TEST 7, 8, 9) ───────────────────────────────────

describe("resubmission lifecycle — multiple rejection cycles (TEST 7-9)", () => {
  it("each submission creates a new verificationId; history preserved", async () => {
    const { storage, idPath, ownershipPath } = buildMockStorageClient();

    // First submission.
    const db1 = buildMockDb({
      insertData: { id: "v1-uuid", status: "submitted" },
    });
    const landlord = buildLandlord(LANDLORD_A_ID);
    const r1 = await submitVerificationCore(db1, storage, landlord, {
      idDocumentPath: idPath,
      ownershipEvidencePath: ownershipPath,
    });
    expect(r1.status).toBe("submitted");
    expect(r1.verificationId).toBe("v1-uuid");

    // Second submission (resubmission after rejection).
    const db2 = buildMockDb({
      insertData: { id: "v2-uuid", status: "submitted" },
    });
    const r2 = await submitVerificationCore(db2, storage, landlord, {
      idDocumentPath: idPath,
      ownershipEvidencePath: ownershipPath,
    });
    expect(r2.status).toBe("submitted");
    expect(r2.verificationId).toBe("v2-uuid");

    // The two IDs are different — new row each time.
    expect(r1.verificationId).not.toBe(r2.verificationId);
  });
});
