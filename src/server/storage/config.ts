/**
 * Storage configuration constants.
 *
 * Phase 3 — file-type allow-lists + size limits, kept in one place so
 * they can be tuned without touching the validation logic.
 *
 * Per TECHNICAL_ARCHITECTURE.md §9: "allowed types restricted to common
 * image formats (JPEG/PNG/WebP) for property images and images/PDF for
 * verification documents; maximum file size enforced server-side before
 * generating any upload URL (an exact number, e.g. 5MB per file, is a
 * configuration value, not fixed here)".
 *
 * The 5MB default is an implementation default — not a product decision
 * fixed by the planning documents. Override via env if needed (see
 * STORAGE_MAX_FILE_SIZE_PROPERTY_IMAGES_BYTES etc.).
 */
import { env } from "@/config/env";
import { STORAGE_BUCKETS, type StorageBucketName } from "./buckets";

// ── File-type allow-lists ────────────────────────────────────────────────────

/**
 * Allowed MIME types for property/room images.
 * Per API_CONTRACTS.md §6: image/jpeg, image/png, image/webp only.
 */
export const ALLOWED_PROPERTY_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedPropertyImageMimeType =
  (typeof ALLOWED_PROPERTY_IMAGE_MIME_TYPES)[number];

/**
 * Allowed MIME types for verification documents.
 * Per TECHNICAL_ARCHITECTURE.md §9: images + PDF.
 */
export const ALLOWED_VERIFICATION_DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type AllowedVerificationDocumentMimeType =
  (typeof ALLOWED_VERIFICATION_DOCUMENT_MIME_TYPES)[number];

// ── File-size limits (configurable via env) ────────────────────────────────

/**
 * Default max file size for property/room images — 5 MB.
 *
 * Override via env: STORAGE_MAX_PROPERTY_IMAGE_BYTES
 */
const DEFAULT_MAX_PROPERTY_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Default max file size for verification documents — 5 MB.
 * Slightly larger would be reasonable for PDFs, but 5 MB covers most
 * scanned ID documents and keeps storage costs predictable.
 *
 * Override via env: STORAGE_MAX_VERIFICATION_DOCUMENT_BYTES
 */
const DEFAULT_MAX_VERIFICATION_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Read a configurable size limit from env. Falls back to the default if
 * the env var is missing or unparseable. Logs a warning if unparseable
 * (so a deploy-time typo doesn't silently fall back to the default).
 */
function readSizeLimit(envVar: string, fallback: number): number {
  const raw = process.env[envVar];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(
      `[netlodge] Invalid value for env var ${envVar}: ${raw}. Falling back to default ${fallback}.`,
    );
    return fallback;
  }
  return parsed;
}

export const MAX_PROPERTY_IMAGE_BYTES = readSizeLimit(
  "STORAGE_MAX_PROPERTY_IMAGE_BYTES",
  DEFAULT_MAX_PROPERTY_IMAGE_BYTES,
);

export const MAX_VERIFICATION_DOCUMENT_BYTES = readSizeLimit(
  "STORAGE_MAX_VERIFICATION_DOCUMENT_BYTES",
  DEFAULT_MAX_VERIFICATION_DOCUMENT_BYTES,
);

// ── Per-bucket config map ───────────────────────────────────────────────────

export interface BucketConfig {
  name: StorageBucketName;
  isPublic: boolean;
  allowedMimeTypes: readonly string[];
  maxFileBytes: number;
}

export const BUCKET_CONFIGS: Record<StorageBucketName, BucketConfig> = {
  [STORAGE_BUCKETS.propertyImages]: {
    name: STORAGE_BUCKETS.propertyImages,
    isPublic: true,
    allowedMimeTypes: ALLOWED_PROPERTY_IMAGE_MIME_TYPES,
    maxFileBytes: MAX_PROPERTY_IMAGE_BYTES,
  },
  [STORAGE_BUCKETS.verificationDocuments]: {
    name: STORAGE_BUCKETS.verificationDocuments,
    isPublic: false,
    allowedMimeTypes: ALLOWED_VERIFICATION_DOCUMENT_MIME_TYPES,
    maxFileBytes: MAX_VERIFICATION_DOCUMENT_BYTES,
  },
};

/**
 * Signed-URL expiry (seconds). Per TECHNICAL_ARCHITECTURE.md §9: "short
 * expiry (minutes, not hours)". 5 minutes is conservative — long enough
 * for a slow mobile-data upload, short enough to limit blast-radius if
 * a URL leaks.
 */
export const SIGNED_URL_EXPIRY_SECONDS = 5 * 60; // 5 minutes

/**
 * Read the site URL from NEXT_PUBLIC_SITE_URL (Phase 2 added this to env).
 * Used as the public read URL prefix for the public bucket.
 */
export function getPublicBucketBaseUrl(): string {
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;
}
