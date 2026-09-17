/**
 * Server-side storage file validation.
 *
 * Phase 3 — per TECHNICAL_ARCHITECTURE.md §9: file-type allow-list + size
 * ceiling, enforced BEFORE issuing a signed upload URL.
 *
 * The browser's UI validation is a UX nicety — the server is authoritative.
 * Per API_CONTRACTS.md §6: "a client declaring a small size and uploading
 * a larger file must still be rejected". This module validates the
 * DECLARED metadata at signed-URL-issuance time; Phase 5 will additionally
 * re-verify the actual uploaded file at confirm-upload time (or via
 * Storage-level constraints).
 */
import "server-only";
import {
  ALLOWED_PROPERTY_IMAGE_MIME_TYPES,
  ALLOWED_VERIFICATION_DOCUMENT_MIME_TYPES,
  MAX_PROPERTY_IMAGE_BYTES,
  MAX_VERIFICATION_DOCUMENT_BYTES,
  BUCKET_CONFIGS,
} from "./config";
import type { StorageBucketName } from "./buckets";

/**
 * Result of file validation. Failures are returned (not thrown) so the
 * caller can produce a standardized `validation_error` response with
 * field-level details per API_CONTRACTS.md §19.
 */
export type FileValidationResult =
  | { ok: true; mimeType: string; sizeBytes: number }
  | {
      ok: false;
      details: Array<{ field: string; issue: string }>;
    };

/**
 * Validate a declared file's metadata against the property-image rules.
 *
 * Allowed MIME types: image/jpeg, image/png, image/webp.
 * Max size: MAX_PROPERTY_IMAGE_BYTES (default 5MB, configurable via env).
 */
export function validatePropertyImageFile(params: {
  mimeType: string;
  sizeBytes: number;
}): FileValidationResult {
  return validateFile(params, {
    allowedMimeTypes: ALLOWED_PROPERTY_IMAGE_MIME_TYPES,
    maxFileBytes: MAX_PROPERTY_IMAGE_BYTES,
    fieldPrefix: "propertyImage",
  });
}

/**
 * Validate a declared file's metadata against the verification-document rules.
 *
 * Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf.
 * Max size: MAX_VERIFICATION_DOCUMENT_BYTES (default 5MB, configurable via env).
 */
export function validateVerificationDocumentFile(params: {
  mimeType: string;
  sizeBytes: number;
}): FileValidationResult {
  return validateFile(params, {
    allowedMimeTypes: ALLOWED_VERIFICATION_DOCUMENT_MIME_TYPES,
    maxFileBytes: MAX_VERIFICATION_DOCUMENT_BYTES,
    fieldPrefix: "verificationDocument",
  });
}

/**
 * Validate a declared file's metadata against the rules for a specific bucket.
 * Convenience wrapper — looks up the bucket config and dispatches.
 */
export function validateFileForBucket(
  bucket: StorageBucketName,
  params: { mimeType: string; sizeBytes: number },
): FileValidationResult {
  const config = BUCKET_CONFIGS[bucket];
  return validateFile(params, {
    allowedMimeTypes: config.allowedMimeTypes,
    maxFileBytes: config.maxFileBytes,
    fieldPrefix: bucket,
  });
}

// ── Internal validator ──────────────────────────────────────────────────────

function validateFile(
  params: { mimeType: string; sizeBytes: number },
  rules: {
    allowedMimeTypes: readonly string[];
    maxFileBytes: number;
    fieldPrefix: string;
  },
): FileValidationResult {
  const details: Array<{ field: string; issue: string }> = [];

  // 1. Validate MIME type.
  // Normalize to lowercase + trim — MIME types are case-insensitive per RFC 2045.
  const normalizedMimeType = (params.mimeType ?? "").trim().toLowerCase();
  if (!normalizedMimeType) {
    details.push({
      field: `${rules.fieldPrefix}.mimeType`,
      issue: "MIME type is required.",
    });
  } else if (!rules.allowedMimeTypes.includes(normalizedMimeType)) {
    details.push({
      field: `${rules.fieldPrefix}.mimeType`,
      issue: `Unsupported file type. Allowed: ${rules.allowedMimeTypes.join(", ")}.`,
    });
  }

  // 2. Validate file size.
  // sizeBytes must be a non-negative integer. Reject NaN / Infinity / negative.
  if (
    !Number.isInteger(params.sizeBytes) ||
    params.sizeBytes <= 0
  ) {
    details.push({
      field: `${rules.fieldPrefix}.sizeBytes`,
      issue: "File size must be a positive integer (bytes).",
    });
  } else if (params.sizeBytes > rules.maxFileBytes) {
    details.push({
      field: `${rules.fieldPrefix}.sizeBytes`,
      issue: `File size exceeds the limit of ${rules.maxFileBytes} bytes (${Math.floor(rules.maxFileBytes / (1024 * 1024))} MB).`,
    });
  }

  if (details.length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    mimeType: normalizedMimeType,
    sizeBytes: params.sizeBytes,
  };
}
