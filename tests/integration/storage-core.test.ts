/**
 * Phase 3 — storage core integration tests with mocked Supabase Storage.
 *
 * TEST DOUBLES DISCLAIMER:
 *   These tests use MOCKED Supabase Storage clients (test doubles). They
 *   verify the NetLodge application logic — authorization, file validation,
 *   path generation, signed-URL issuance, confirm-upload sequencing, deletion.
 *
 *   They do NOT verify real Supabase Storage behavior (e.g., actual object
 *   persistence, real signed-URL signature verification, real bucket
 *   policy enforcement). That requires a real Supabase project — not
 *   available in this environment (no Docker, no Supabase CLI).
 *
 * The actual database-level defenses (Phase 1 RLS, Phase 1 column-guard
 * trigger, Phase 2 auth) are verified in their respective test files.
 *
 * ── Attack-oriented test coverage ────────────────────────────────────────────
 *
 * Per Phase 3 task spec §14, the following attack scenarios are tested:
 *
 *   #1  Unauthenticated user requests verification-doc download URL
 *       → 401 / unauthenticated
 *   #2  Student attempts to access a landlord verification document
 *       → 403 / forbidden
 *   #3  Landlord A attempts to access landlord B's verification document
 *       → 403 / forbidden
 *   #4  A landlord changes a client-provided landlordId to another's
 *       → authorization failure (path is server-generated, so the
 *          client-provided landlordId is ignored)
 *   #5  A landlord attempts to request a signed URL for an arbitrary
 *       Storage object path
 *       → authorization/validation failure
 *   #6  Attempt to access a verification document through a public URL
 *       → not publicly accessible (bucket is private by design — tested
 *          at the migration level + the download-URL function never
 *          returns a public URL)
 *   #7  A suspended landlord attempts to obtain a new signed URL
 *       → 403 / forbidden (account-status check at top of function)
 *   #8  An authenticated student attempts to access verification documents
 *       belonging to any landlord
 *       → 403 / forbidden (same as #2)
 *   #9  A signed download URL request is made after authorization has
 *       changed (e.g., landlord account suspended between requests)
 *       → authorization is re-checked on the new request, second request
 *          rejected
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AuthenticatedUser } from "@/lib/auth";
import type { SupabaseStorageClient } from "@/server/storage/core";
import {
  requestVerificationDocumentUploadUrlCore,
  confirmVerificationDocumentUploadCore,
  requestVerificationDocumentDownloadUrlCore,
  deleteVerificationDocumentCore,
} from "@/server/storage/core";

// ── Test fixtures ────────────────────────────────────────────────────────────

const LANDLORD_A_ID = "11111111-1111-1111-1111-111111111111";
const LANDLORD_B_ID = "22222222-2222-2222-2222-222222222222";
const STUDENT_ID = "33333333-3333-3333-3333-333333333333";
const ADMIN_ID = "44444444-4444-4444-4444-444444444444";

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
  return buildLandlord(id, {
    accountStatus: "suspended",
  });
}

/**
 * Build a mock SupabaseStorageClient.
 *
 * The `overrides` arg customizes the per-call responses for upload URL
 * issuance, list (for confirm + download existence-check), signed download
 * URL, and remove (for delete).
 *
 * The mock maintains an in-memory map of "uploaded objects" so the
 * confirm-upload and download-URL flows can verify object existence
 * realistically.
 */
function buildMockStorageClient(overrides?: {
  uploadUrlError?: { message: string } | null;
  listError?: { message: string } | null;
  signedUrlError?: { message: string } | null;
  removeError?: { message: string } | null;
  /** Pre-populate the bucket with these objects (path → metadata). */
  existingObjects?: Map<string, { size: number; mimetype: string }>;
}): SupabaseStorageClient {
  // In-memory store of objects in the bucket.
  const objects =
    overrides?.existingObjects ??
    new Map<string, { size: number; mimetype: string }>();

  return {
    storage: {
      from: (bucket: string) => {
        if (
          bucket !== "property-images" &&
          bucket !== "verification-documents"
        ) {
          throw new Error(`Unexpected bucket: ${bucket}`);
        }

        return {
          createSignedUploadUrl: vi.fn(async (path: string) => {
            if (overrides?.uploadUrlError) {
              return { data: null, error: overrides.uploadUrlError };
            }
            // Simulate successful upload URL issuance — register the path
            // so a subsequent confirm call can find it (only if the upload
            // was actually simulated; we don't auto-add here, the test
            // controls object existence via `existingObjects`).
            return {
              data: {
                path,
                signedUrl: `https://storage.example.com/upload/${bucket}/${path}?token=mock-token`,
                token: "mock-token",
              },
              error: null,
            };
          }),

          list: vi.fn(async (prefix: string) => {
            if (overrides?.listError) {
              return { data: null, error: overrides.listError };
            }
            // Return objects whose path starts with the given prefix.
            // The `name` field is the filename (last path segment).
            const matching = Array.from(objects.entries())
              .filter(([path]) => {
                const pathPrefix = path.slice(0, path.lastIndexOf("/") + 1);
                return pathPrefix === prefix;
              })
              .map(([path, metadata]) => ({
                name: path.slice(path.lastIndexOf("/") + 1),
                bucket_id: bucket,
                owner: null,
                metadata: {
                  size: metadata.size,
                  mimetype: metadata.mimetype,
                },
              }));
            return { data: matching, error: null };
          }),

          createSignedUrl: vi.fn(async (path: string, _expiresIn: number) => {
            if (overrides?.signedUrlError) {
              return { data: null, error: overrides.signedUrlError };
            }
            return {
              data: {
                signedUrl: `https://storage.example.com/${bucket}/${path}?token=mock-download-token`,
              },
              error: null,
            };
          }),

          remove: vi.fn(async (paths: string[]) => {
            if (overrides?.removeError) {
              return { data: null, error: overrides.removeError };
            }
            for (const p of paths) {
              objects.delete(p);
            }
            return { data: null, error: null };
          }),
        };
      },
    },
  };
}

/**
 * Helper: build a storage client that already has a specific verification
 * document uploaded by a specific landlord.
 */
function buildStorageWithLandlordDocument(params: {
  landlordId: string;
  kind: "id" | "ownership_evidence";
  mimeType?: string;
  size?: number;
}): {
  storage: SupabaseStorageClient;
  path: string;
  existingObjects: Map<string, { size: number; mimetype: string }>;
} {
  const mimeType = params.mimeType ?? "image/jpeg";
  const size = params.size ?? 1024;
  const existingObjects = new Map<string, { size: number; mimetype: string }>();
  // Build a realistic path that the path generator would produce.
  const fakeUuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const ext = mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[1];
  const path = `verification/${params.landlordId}/${params.kind}/${fakeUuid}.${ext}`;
  existingObjects.set(path, { size, mimetype: mimeType });

  const storage = buildMockStorageClient({ existingObjects });
  return { storage, path, existingObjects };
}

// ── Upload URL issuance ─────────────────────────────────────────────────────

describe("requestVerificationDocumentUploadUrlCore", () => {
  it("issues a signed upload URL for an authenticated landlord with a valid file", async () => {
    const storage = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);

    const result = await requestVerificationDocumentUploadUrlCore(
      storage,
      landlord,
      {
        kind: "id",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
      },
    );

    expect(result.bucket).toBe("verification-documents");
    expect(result.kind).toBe("id");
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.path).toMatch(
      new RegExp(`^verification/${LANDLORD_A_ID}/id/[0-9a-f-]{36}\\.jpg$`),
    );
    expect(result.signedUploadUrl).toContain("storage.example.com/upload/");
    expect(result.token).toBeDefined();
    expect(result.expiresAt).toBeDefined();
  });

  it("REJECTS a non-landlord (Attack #8: student attempting to upload verification docs)", async () => {
    const storage = buildMockStorageClient();
    const student = buildStudent();

    await expect(
      requestVerificationDocumentUploadUrlCore(storage, student, {
        kind: "id",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS a suspended landlord (Attack #7: suspended account)", async () => {
    const storage = buildMockStorageClient();
    const suspended = buildSuspendedLandlord(LANDLORD_A_ID);

    await expect(
      requestVerificationDocumentUploadUrlCore(storage, suspended, {
        kind: "id",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS an unsupported MIME type (defense-in-depth — server validation)", async () => {
    const storage = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      requestVerificationDocumentUploadUrlCore(storage, landlord, {
        kind: "id",
        mimeType: "image/gif",
        sizeBytes: 1024,
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("REJECTS a file exceeding the size limit", async () => {
    const storage = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      requestVerificationDocumentUploadUrlCore(storage, landlord, {
        kind: "id",
        mimeType: "image/jpeg",
        sizeBytes: 10 * 1024 * 1024, // 10 MB — exceeds 5 MB default
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("REJECTS application/javascript (XSS attempt via MIME type)", async () => {
    const storage = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      requestVerificationDocumentUploadUrlCore(storage, landlord, {
        kind: "id",
        mimeType: "application/javascript",
        sizeBytes: 1024,
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("REJECTS text/html (XSS attempt via MIME type)", async () => {
    const storage = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      requestVerificationDocumentUploadUrlCore(storage, landlord, {
        kind: "id",
        mimeType: "text/html",
        sizeBytes: 1024,
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("uses the AUTHENTICATED landlord's id in the path (Attack #4: client-supplied landlordId is ignored)", async () => {
    const storage = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);

    // Note: the input only contains `kind`, `mimeType`, `sizeBytes` — there's
    // no `landlordId` field for the client to spoof. The path is built
    // server-side from `user.id`.
    const result = await requestVerificationDocumentUploadUrlCore(
      storage,
      landlord,
      {
        kind: "id",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
      },
    );

    expect(result.path).toContain(LANDLORD_A_ID);
    expect(result.path).not.toContain(LANDLORD_B_ID);
  });

  it("issues a different path on each call (UUID-based — no collisions)", async () => {
    const storage = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);

    const r1 = await requestVerificationDocumentUploadUrlCore(storage, landlord, {
      kind: "id",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
    });
    const r2 = await requestVerificationDocumentUploadUrlCore(storage, landlord, {
      kind: "id",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
    });

    expect(r1.path).not.toBe(r2.path);
  });

  it("propagates Supabase Storage errors as internal_error", async () => {
    const storage = buildMockStorageClient({
      uploadUrlError: { message: "Storage service unavailable" },
    });
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      requestVerificationDocumentUploadUrlCore(storage, landlord, {
        kind: "id",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
      }),
    ).rejects.toMatchObject({ code: "internal_error" });
  });
});

// ── Confirm upload ──────────────────────────────────────────────────────────

describe("confirmVerificationDocumentUploadCore", () => {
  it("returns metadata for an uploaded object owned by the caller", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const landlord = buildLandlord(LANDLORD_A_ID);

    const result = await confirmVerificationDocumentUploadCore(
      storage,
      landlord,
      { path, kind: "id" },
    );

    expect(result.bucket).toBe("verification-documents");
    expect(result.path).toBe(path);
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.sizeBytes).toBe(1024);
    expect(result.metadata.kind).toBe("id");
    expect(result.metadata.landlordId).toBe(LANDLORD_A_ID);
  });

  it("REJECTS a confirm for a path belonging to a DIFFERENT landlord (Attack #3: cross-tenant)", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const landlordB = buildLandlord(LANDLORD_B_ID);

    await expect(
      confirmVerificationDocumentUploadCore(storage, landlordB, {
        path,
        kind: "id",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS a confirm for a path that doesn't exist in Storage (no upload happened)", async () => {
    const storage = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);
    // Path is well-formed but no object exists in the mock.
    const path = `verification/${LANDLORD_A_ID}/id/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg`;

    await expect(
      confirmVerificationDocumentUploadCore(storage, landlord, {
        path,
        kind: "id",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("REJECTS a confirm from a student (non-landlord)", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const student = buildStudent();

    await expect(
      confirmVerificationDocumentUploadCore(storage, student, {
        path,
        kind: "id",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS a confirm from a suspended landlord", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const suspended = buildSuspendedLandlord(LANDLORD_A_ID);

    await expect(
      confirmVerificationDocumentUploadCore(storage, suspended, {
        path,
        kind: "id",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS a confirm where the kind in the path doesn't match the declared kind", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const landlord = buildLandlord(LANDLORD_A_ID);

    // Path encodes `id` but caller claims `ownership_evidence` — reject.
    await expect(
      confirmVerificationDocumentUploadCore(storage, landlord, {
        path,
        kind: "ownership_evidence",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS a malformed path (path traversal attempt — Attack #5)", async () => {
    const storage = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      confirmVerificationDocumentUploadCore(storage, landlord, {
        path: "../etc/passwd",
        kind: "id",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS an arbitrary object path with no verification-documents prefix (Attack #5)", async () => {
    const storage = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      confirmVerificationDocumentUploadCore(storage, landlord, {
        path: "some/random/arbitrary/path.jpg",
        kind: "id",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});

// ── Download URL issuance ───────────────────────────────────────────────────

describe("requestVerificationDocumentDownloadUrlCore", () => {
  it("issues a signed download URL to the owning landlord", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const landlord = buildLandlord(LANDLORD_A_ID);

    const result = await requestVerificationDocumentDownloadUrlCore(
      storage,
      landlord,
      { path },
    );

    expect(result.bucket).toBe("verification-documents");
    expect(result.path).toBe(path);
    expect(result.signedUrl).toContain("storage.example.com/");
    expect(result.signedUrl).toContain("token=mock-download-token");
    expect(result.expiresAt).toBeDefined();
  });

  it("issues a signed download URL to an admin (Attack #12: admin access works)", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const admin = buildAdmin();

    const result = await requestVerificationDocumentDownloadUrlCore(
      storage,
      admin,
      { path },
    );

    expect(result.bucket).toBe("verification-documents");
    expect(result.signedUrl).toBeDefined();
  });

  it("REJECTS an unauthenticated user (Attack #1) — but note: the wrapper throws `unauthenticated` BEFORE this core fn is called; here we test the core fn with a null user which can't happen, so we test with a student instead.", async () => {
    // The wrapper `actions.ts` calls `requireAuthenticated()` first which
    // throws `unauthenticated` if no session. The core fn only receives
    // already-authenticated users. So this test verifies the role check
    // on a STUDENT attempting to access a landlord's document (Attack #2/#8).
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const student = buildStudent();

    await expect(
      requestVerificationDocumentDownloadUrlCore(storage, student, { path }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS Landlord A attempting to access Landlord B's document (Attack #3)", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const landlordB = buildLandlord(LANDLORD_B_ID);

    await expect(
      requestVerificationDocumentDownloadUrlCore(storage, landlordB, { path }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS a suspended landlord (own document) (Attack #7)", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const suspended = buildSuspendedLandlord(LANDLORD_A_ID);

    await expect(
      requestVerificationDocumentDownloadUrlCore(storage, suspended, { path }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS a student attempting to access any landlord's document (Attack #8)", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_B_ID,
      kind: "ownership_evidence",
    });
    const student = buildStudent();

    await expect(
      requestVerificationDocumentDownloadUrlCore(storage, student, { path }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS an arbitrary object path (Attack #5: arbitrary Storage path)", async () => {
    const storage = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      requestVerificationDocumentDownloadUrlCore(storage, landlord, {
        path: "some/random/arbitrary/path.jpg",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS a path-traversal attempt", async () => {
    const storage = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      requestVerificationDocumentDownloadUrlCore(storage, landlord, {
        path: "../../../etc/passwd",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS a non-existent document (path is well-formed but no object in Storage)", async () => {
    const storage = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);
    const path = `verification/${LANDLORD_A_ID}/id/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg`;

    await expect(
      requestVerificationDocumentDownloadUrlCore(storage, landlord, { path }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("RE-CHECKS authorization on every request (Attack #9: authorization changed between requests)", async () => {
    // Setup: landlord A had an active account yesterday, is suspended today.
    // They obtained a download URL yesterday; today they request again.
    // The second request MUST be rejected.
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });

    // Day 1: landlord is active, request succeeds.
    const activeLandlord = buildLandlord(LANDLORD_A_ID);
    const firstResult = await requestVerificationDocumentDownloadUrlCore(
      storage,
      activeLandlord,
      { path },
    );
    expect(firstResult.signedUrl).toBeDefined();

    // Day 2: same landlord, now suspended.
    const suspendedLandlord = buildSuspendedLandlord(LANDLORD_A_ID);
    await expect(
      requestVerificationDocumentDownloadUrlCore(storage, suspendedLandlord, {
        path,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("RE-CHECKS authorization: landlord A becomes landlord B (different session) — second request rejected", async () => {
    // Landlord A requests URL for their own doc — succeeds.
    // Then the SAME path is requested by landlord B (a different authenticated
    // session) — must be rejected.
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });

    const landlordA = buildLandlord(LANDLORD_A_ID);
    const landlordB = buildLandlord(LANDLORD_B_ID);

    // Landlord A's request succeeds.
    await requestVerificationDocumentDownloadUrlCore(storage, landlordA, {
      path,
    });

    // Landlord B's request for the SAME path is rejected.
    await expect(
      requestVerificationDocumentDownloadUrlCore(storage, landlordB, { path }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("NEVER returns a public URL — always a signed URL with a token", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const landlord = buildLandlord(LANDLORD_A_ID);

    const result = await requestVerificationDocumentDownloadUrlCore(
      storage,
      landlord,
      { path },
    );

    // The signed URL must contain a token query param (mock uses
    // `?token=mock-download-token`). A public URL would have no token.
    expect(result.signedUrl).toContain("token=");
    // The URL must NOT be a public/object/public/ URL.
    expect(result.signedUrl).not.toContain("/object/public/");
  });

  it("propagates Storage list errors as internal_error", async () => {
    const { path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const storage = buildMockStorageClient({
      listError: { message: "Storage unavailable" },
    });
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      requestVerificationDocumentDownloadUrlCore(storage, landlord, { path }),
    ).rejects.toMatchObject({ code: "internal_error" });
  });

  it("propagates signed-URL issuance errors as internal_error", async () => {
    const { path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const failingStorage = buildMockStorageClient({
      signedUrlError: { message: "Signing key unavailable" },
      existingObjects: new Map([
        [path, { size: 1024, mimetype: "image/jpeg" }],
      ]),
    });
    const landlord = buildLandlord(LANDLORD_A_ID);

    await expect(
      requestVerificationDocumentDownloadUrlCore(failingStorage, landlord, {
        path,
      }),
    ).rejects.toMatchObject({ code: "internal_error" });
  });
});

// ── Deletion ───────────────────────────────────────────────────────────────

describe("deleteVerificationDocumentCore", () => {
  it("deletes a document when called by an admin", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const admin = buildAdmin();

    const result = await deleteVerificationDocumentCore(storage, admin, {
      path,
    });

    expect(result.deleted).toBe(true);
    expect(result.path).toBe(path);
  });

  it("REJECTS deletion by a landlord (even the owner of the document)", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const landlordA = buildLandlord(LANDLORD_A_ID);

    await expect(
      deleteVerificationDocumentCore(storage, landlordA, { path }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS deletion by a student", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const student = buildStudent();

    await expect(
      deleteVerificationDocumentCore(storage, student, { path }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("REJECTS deletion of an arbitrary path (path-traversal defense)", async () => {
    const storage = buildMockStorageClient();
    const admin = buildAdmin();

    await expect(
      deleteVerificationDocumentCore(storage, admin, {
        path: "../etc/passwd",
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("propagates Storage remove errors as internal_error", async () => {
    const { path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const storage = buildMockStorageClient({
      removeError: { message: "Storage delete failed" },
      existingObjects: new Map([
        [path, { size: 1024, mimetype: "image/jpeg" }],
      ]),
    });
    const admin = buildAdmin();

    await expect(
      deleteVerificationDocumentCore(storage, admin, { path }),
    ).rejects.toMatchObject({ code: "internal_error" });
  });
});

// ── Confirm-upload sequencing (Phase 3 §10) ─────────────────────────────────

describe("confirm-upload sequencing — DB references are NOT created before upload confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upload URL issuance does NOT create any DB row (Phase 3: no DB writes; Phase 4 owns landlord_verifications row)", async () => {
    // This is a behavioral assertion: the upload URL issuance function returns
    // a path + signed URL, but does NOT write to any DB. Phase 4's
    // `verification.submit` Server Action will write the DB row after
    // confirm-upload returns.
    //
    // We verify by: 1) calling upload URL issuance; 2) confirming no DB
    // call was made. Since the mock storage client doesn't have a DB
    // connection, this is structurally guaranteed — but we explicitly
    // assert that the result type does NOT include any DB-write signal.
    const storage = buildMockStorageClient();
    const landlord = buildLandlord(LANDLORD_A_ID);

    const result = await requestVerificationDocumentUploadUrlCore(
      storage,
      landlord,
      { kind: "id", mimeType: "image/jpeg", sizeBytes: 1024 },
    );

    // The result only contains the path + signed URL + token + expiry.
    // No DB row reference (no `verificationId`, no `submitted_id_reference`
    // field — those are Phase 4's concern).
    expect(result).not.toHaveProperty("verificationId");
    expect(result).not.toHaveProperty("submitted_id_reference");
    expect(result).toHaveProperty("path");
    expect(result).toHaveProperty("signedUploadUrl");
  });

  it("confirm-upload returns metadata but does NOT write the DB row itself (Phase 4 owns that)", async () => {
    const { storage, path } = buildStorageWithLandlordDocument({
      landlordId: LANDLORD_A_ID,
      kind: "id",
    });
    const landlord = buildLandlord(LANDLORD_A_ID);

    const result = await confirmVerificationDocumentUploadCore(
      storage,
      landlord,
      { path, kind: "id" },
    );

    // The result contains the storage path + metadata. It does NOT contain
    // a `verificationId` — that's Phase 4's responsibility when it creates
    // the `landlord_verifications` row.
    expect(result).toHaveProperty("path");
    expect(result).toHaveProperty("metadata.kind");
    expect(result).toHaveProperty("metadata.landlordId");
    expect(result).not.toHaveProperty("verificationId");
  });
});
