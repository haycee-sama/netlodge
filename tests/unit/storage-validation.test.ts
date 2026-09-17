/**
 * Phase 3 — storage validation unit tests.
 *
 * Pure-function tests for the file-type + size validation logic. No
 * Supabase Storage or database involved — these verify the validation
 * boundary in isolation.
 *
 * The actual signed-URL issuance + authorization logic is tested in
 * `tests/integration/storage-core.test.ts` with mocked Supabase Storage.
 */
import { describe, expect, it } from "vitest";
import {
  validatePropertyImageFile,
  validateVerificationDocumentFile,
  validateFileForBucket,
} from "@/server/storage/validation";
import {
  MAX_PROPERTY_IMAGE_BYTES,
  MAX_VERIFICATION_DOCUMENT_BYTES,
} from "@/server/storage/config";
import { STORAGE_BUCKETS } from "@/server/storage/buckets";

// ── Property image validation ───────────────────────────────────────────────

describe("validatePropertyImageFile", () => {
  const valid = {
    mimeType: "image/jpeg",
    sizeBytes: 1024,
  };

  it("accepts a valid JPEG image under the size limit", () => {
    const result = validatePropertyImageFile(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mimeType).toBe("image/jpeg");
      expect(result.sizeBytes).toBe(1024);
    }
  });

  it("accepts image/png", () => {
    const result = validatePropertyImageFile({
      mimeType: "image/png",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts image/webp", () => {
    const result = validatePropertyImageFile({
      mimeType: "image/webp",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(true);
  });

  it("REJECTS application/pdf (PDFs not allowed for property images)", () => {
    const result = validatePropertyImageFile({
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(false);
  });

  it("REJECTS image/gif (not in allow-list)", () => {
    const result = validatePropertyImageFile({
      mimeType: "image/gif",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(false);
  });

  it("REJECTS image/bmp (not in allow-list)", () => {
    const result = validatePropertyImageFile({
      mimeType: "image/bmp",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(false);
  });

  it("REJECTS video/mp4 (defense-in-depth against content-type spoofing)", () => {
    const result = validatePropertyImageFile({
      mimeType: "video/mp4",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(false);
  });

  it("REJECTS application/javascript (XSS attempt)", () => {
    const result = validatePropertyImageFile({
      mimeType: "application/javascript",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(false);
  });

  it("REJECTS text/html (XSS attempt)", () => {
    const result = validatePropertyImageFile({
      mimeType: "text/html",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects files exceeding the size limit (1 byte over)", () => {
    const result = validatePropertyImageFile({
      mimeType: "image/jpeg",
      sizeBytes: MAX_PROPERTY_IMAGE_BYTES + 1,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a file exactly at the size limit (boundary)", () => {
    const result = validatePropertyImageFile({
      mimeType: "image/jpeg",
      sizeBytes: MAX_PROPERTY_IMAGE_BYTES,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a zero-size file", () => {
    const result = validatePropertyImageFile({
      mimeType: "image/jpeg",
      sizeBytes: 0,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a negative-size file", () => {
    const result = validatePropertyImageFile({
      mimeType: "image/jpeg",
      sizeBytes: -100,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects NaN size", () => {
    const result = validatePropertyImageFile({
      mimeType: "image/jpeg",
      sizeBytes: Number.NaN,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects non-integer size (e.g., 1.5 bytes)", () => {
    const result = validatePropertyImageFile({
      mimeType: "image/jpeg",
      sizeBytes: 1.5,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects empty MIME type", () => {
    const result = validatePropertyImageFile({
      mimeType: "",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(false);
  });

  it("normalizes MIME type case (IMAGE/JPEG → image/jpeg)", () => {
    const result = validatePropertyImageFile({
      mimeType: "IMAGE/JPEG",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mimeType).toBe("image/jpeg");
    }
  });

  it("trims whitespace around MIME type", () => {
    const result = validatePropertyImageFile({
      mimeType: "  image/png  ",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mimeType).toBe("image/png");
    }
  });
});

// ── Verification document validation ────────────────────────────────────────

describe("validateVerificationDocumentFile", () => {
  it("accepts JPEG images", () => {
    const result = validateVerificationDocumentFile({
      mimeType: "image/jpeg",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts PNG images", () => {
    const result = validateVerificationDocumentFile({
      mimeType: "image/png",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts WebP images", () => {
    const result = validateVerificationDocumentFile({
      mimeType: "image/webp",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts application/pdf", () => {
    const result = validateVerificationDocumentFile({
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects image/gif", () => {
    const result = validateVerificationDocumentFile({
      mimeType: "image/gif",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects video/mp4", () => {
    const result = validateVerificationDocumentFile({
      mimeType: "video/mp4",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects application/zip", () => {
    const result = validateVerificationDocumentFile({
      mimeType: "application/zip",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects files exceeding the verification-document size limit", () => {
    const result = validateVerificationDocumentFile({
      mimeType: "application/pdf",
      sizeBytes: MAX_VERIFICATION_DOCUMENT_BYTES + 1,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a file exactly at the verification-document size limit", () => {
    const result = validateVerificationDocumentFile({
      mimeType: "application/pdf",
      sizeBytes: MAX_VERIFICATION_DOCUMENT_BYTES,
    });
    expect(result.ok).toBe(true);
  });
});

// ── validateFileForBucket dispatch ──────────────────────────────────────────

describe("validateFileForBucket", () => {
  it("dispatches to property-image rules for property-images bucket", () => {
    const result = validateFileForBucket(STORAGE_BUCKETS.propertyImages, {
      mimeType: "image/jpeg",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(true);
  });

  it("dispatches to verification-document rules for verification-documents bucket", () => {
    const result = validateFileForBucket(
      STORAGE_BUCKETS.verificationDocuments,
      {
        mimeType: "application/pdf",
        sizeBytes: 1024,
      },
    );
    expect(result.ok).toBe(true);
  });

  it("rejects PDF for property-images bucket (different rules per bucket)", () => {
    const result = validateFileForBucket(STORAGE_BUCKETS.propertyImages, {
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts PDF for verification-documents bucket", () => {
    const result = validateFileForBucket(
      STORAGE_BUCKETS.verificationDocuments,
      {
        mimeType: "application/pdf",
        sizeBytes: 1024,
      },
    );
    expect(result.ok).toBe(true);
  });
});
