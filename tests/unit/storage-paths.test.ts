/**
 * Phase 3 — storage path generator unit tests.
 *
 * Verifies the server-generated storage paths are:
 *   - correctly shaped (match the documented conventions)
 *   - UUID-based (no client-controlled path components)
 *   - unique across calls (each call produces a different uuid)
 *   - reject malformed inputs (non-UUID landlordId, unsupported MIME type)
 *
 * Path-traversal defense is verified here: the path constructors reject
 * arbitrary strings in the path components, so even a future code path
 * that accidentally passed user input as landlordId would throw rather
 * than produce a traversable path.
 */
import { describe, expect, it } from "vitest";
import {
  buildVerificationDocumentPath,
  buildPropertyImagePath,
  buildRoomImagePath,
  parseStoragePath,
} from "@/server/storage/paths";

// ── buildVerificationDocumentPath ───────────────────────────────────────────

describe("buildVerificationDocumentPath", () => {
  const LANDLORD_ID = "11111111-1111-1111-1111-111111111111";

  it("produces a path with the documented shape for an id document", () => {
    const path = buildVerificationDocumentPath({
      landlordId: LANDLORD_ID,
      kind: "id",
      mimeType: "image/jpeg",
    });
    // Expected: verification/{landlordId}/id/{uuid}.jpg
    expect(path).toMatch(
      new RegExp(
        `^verification/${LANDLORD_ID}/id/[0-9a-f-]{36}\\.jpg$`,
      ),
    );
  });

  it("produces a path with the documented shape for an ownership_evidence document", () => {
    const path = buildVerificationDocumentPath({
      landlordId: LANDLORD_ID,
      kind: "ownership_evidence",
      mimeType: "application/pdf",
    });
    expect(path).toMatch(
      new RegExp(
        `^verification/${LANDLORD_ID}/ownership_evidence/[0-9a-f-]{36}\\.pdf$`,
      ),
    );
  });

  it("uses a different UUID on each call (no collisions)", () => {
    const path1 = buildVerificationDocumentPath({
      landlordId: LANDLORD_ID,
      kind: "id",
      mimeType: "image/jpeg",
    });
    const path2 = buildVerificationDocumentPath({
      landlordId: LANDLORD_ID,
      kind: "id",
      mimeType: "image/jpeg",
    });
    expect(path1).not.toBe(path2);
  });

  it("REJECTS a non-UUID landlordId (path-traversal defense)", () => {
    expect(() =>
      buildVerificationDocumentPath({
        landlordId: "../../../etc/passwd",
        kind: "id",
        mimeType: "image/jpeg",
      }),
    ).toThrow();
  });

  it("REJECTS an unsupported MIME type", () => {
    expect(() =>
      buildVerificationDocumentPath({
        landlordId: LANDLORD_ID,
        kind: "id",
        mimeType: "image/gif",
      }),
    ).toThrow();
  });

  it("REJECTS an invalid document kind", () => {
    expect(() =>
      buildVerificationDocumentPath({
        landlordId: LANDLORD_ID,
        kind: "arbitrary_kind" as never,
        mimeType: "image/jpeg",
      }),
    ).toThrow();
  });

  it("uses .png extension for image/png", () => {
    const path = buildVerificationDocumentPath({
      landlordId: LANDLORD_ID,
      kind: "id",
      mimeType: "image/png",
    });
    expect(path).toMatch(/\.png$/);
  });

  it("uses .webp extension for image/webp", () => {
    const path = buildVerificationDocumentPath({
      landlordId: LANDLORD_ID,
      kind: "id",
      mimeType: "image/webp",
    });
    expect(path).toMatch(/\.webp$/);
  });

  it("uses .pdf extension for application/pdf", () => {
    const path = buildVerificationDocumentPath({
      landlordId: LANDLORD_ID,
      kind: "id",
      mimeType: "application/pdf",
    });
    expect(path).toMatch(/\.pdf$/);
  });
});

// ── buildPropertyImagePath / buildRoomImagePath ─────────────────────────────

describe("buildPropertyImagePath", () => {
  const PROPERTY_ID = "22222222-2222-2222-2222-222222222222";

  it("produces a path with the documented shape", () => {
    const path = buildPropertyImagePath({
      propertyId: PROPERTY_ID,
      mimeType: "image/jpeg",
    });
    expect(path).toMatch(
      new RegExp(
        `^properties/${PROPERTY_ID}/[0-9a-f-]{36}\\.jpg$`,
      ),
    );
  });

  it("REJECTS a non-UUID propertyId (path-traversal defense)", () => {
    expect(() =>
      buildPropertyImagePath({
        propertyId: "../other-property",
        mimeType: "image/jpeg",
      }),
    ).toThrow();
  });

  it("REJECTS an unsupported MIME type", () => {
    expect(() =>
      buildPropertyImagePath({
        propertyId: PROPERTY_ID,
        mimeType: "image/gif",
      }),
    ).toThrow();
  });
});

describe("buildRoomImagePath", () => {
  const ROOM_ID = "33333333-3333-3333-3333-333333333333";

  it("produces a path with the documented shape", () => {
    const path = buildRoomImagePath({
      roomId: ROOM_ID,
      mimeType: "image/png",
    });
    expect(path).toMatch(
      new RegExp(
        `^rooms/${ROOM_ID}/[0-9a-f-]{36}\\.png$`,
      ),
    );
  });

  it("REJECTS a non-UUID roomId", () => {
    expect(() =>
      buildRoomImagePath({
        roomId: "../etc",
        mimeType: "image/png",
      }),
    ).toThrow();
  });
});

// ── parseStoragePath ────────────────────────────────────────────────────────

describe("parseStoragePath", () => {
  it("extracts landlordId + kind from a valid verification-document path", () => {
    const landlordId = "11111111-1111-1111-1111-111111111111";
    const path = `verification/${landlordId}/id/some-uuid.jpg`;
    const parsed = parseStoragePath("verification-documents", path);
    expect(parsed).not.toBeNull();
    expect(parsed?.landlordId).toBe(landlordId);
    expect(parsed?.kind).toBe("id");
  });

  it("returns null for a malformed verification path (no kind)", () => {
    const parsed = parseStoragePath(
      "verification-documents",
      "verification/11111111-1111-1111-1111-111111111111/some-uuid.jpg",
    );
    expect(parsed).toBeNull();
  });

  it("returns null for a malformed verification path (no filename extension)", () => {
    const parsed = parseStoragePath(
      "verification-documents",
      "verification/11111111-1111-1111-1111-111111111111/id/no-extension",
    );
    expect(parsed).toBeNull();
  });

  it("returns null for a path with a non-UUID landlordId", () => {
    const parsed = parseStoragePath(
      "verification-documents",
      "verification/not-a-uuid/id/some-uuid.jpg",
    );
    expect(parsed).toBeNull();
  });

  it("returns null for a path with an invalid kind", () => {
    const parsed = parseStoragePath(
      "verification-documents",
      "verification/11111111-1111-1111-1111-111111111111/invalid_kind/some-uuid.jpg",
    );
    expect(parsed).toBeNull();
  });

  it("returns null for a path with the wrong prefix", () => {
    const parsed = parseStoragePath(
      "verification-documents",
      "other-prefix/11111111-1111-1111-1111-111111111111/id/some-uuid.jpg",
    );
    expect(parsed).toBeNull();
  });

  it("returns null for a path-traversal attempt (../ in landlordId position)", () => {
    const parsed = parseStoragePath(
      "verification-documents",
      "verification/../etc/id/some-uuid.jpg",
    );
    expect(parsed).toBeNull();
  });

  it("returns a non-null context for property-images paths (no landlordId extraction)", () => {
    const parsed = parseStoragePath(
      "property-images",
      "properties/22222222-2222-2222-2222-222222222222/some-uuid.jpg",
    );
    expect(parsed).toEqual({
      bucket: "property-images",
    });
  });

  it("parses ownership_evidence kind correctly", () => {
    const landlordId = "44444444-4444-4444-4444-444444444444";
    const path = `verification/${landlordId}/ownership_evidence/some-uuid.pdf`;
    const parsed = parseStoragePath("verification-documents", path);
    expect(parsed?.landlordId).toBe(landlordId);
    expect(parsed?.kind).toBe("ownership_evidence");
  });
});
