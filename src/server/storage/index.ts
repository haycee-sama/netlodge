/**
 * Server-only Storage boundary — public API.
 *
 * Phase 3 — re-exports the storage service primitives implemented in
 * `./buckets.ts`, `./config.ts`, `./paths.ts`, `./validation.ts`, and
 * `./core.ts`. Consumers should import from this single entry point.
 *
 * Per TECHNICAL_ARCHITECTURE.md §9–10, the storage boundary enforces:
 *   - Public + private bucket separation (property-images public,
 *     verification-documents private — never public read).
 *   - Server-generated storage paths (no client-controlled paths).
 *   - File-type + size validation before issuing signed upload URLs.
 *   - Per-call authorization for verification-document download URLs.
 *   - Confirm-upload hook (DB reference written only after confirmed upload).
 *
 * The `server-only` import guard prevents client-side usage.
 */
import "server-only";

export { STORAGE_BUCKETS, isPublicBucket, isPrivateBucket } from "./buckets";
export type { StorageBucketName } from "./buckets";

export {
  ALLOWED_PROPERTY_IMAGE_MIME_TYPES,
  ALLOWED_VERIFICATION_DOCUMENT_MIME_TYPES,
  BUCKET_CONFIGS,
  MAX_PROPERTY_IMAGE_BYTES,
  MAX_VERIFICATION_DOCUMENT_BYTES,
  SIGNED_URL_EXPIRY_SECONDS,
  getPublicBucketBaseUrl,
} from "./config";
export type {
  BucketConfig,
  AllowedPropertyImageMimeType,
  AllowedVerificationDocumentMimeType,
} from "./config";

export {
  buildVerificationDocumentPath,
  buildPropertyImagePath,
  buildRoomImagePath,
  parseStoragePath,
} from "./paths";
export type { StoragePathContext, VerificationDocumentKind } from "./paths";

export {
  validatePropertyImageFile,
  validateVerificationDocumentFile,
  validateFileForBucket,
} from "./validation";
export type { FileValidationResult } from "./validation";

// Re-export the core service (testable pure functions + thin Server Action
// wrappers wired to real Supabase clients).
export {
  requestVerificationDocumentUploadUrlCore,
  confirmVerificationDocumentUploadCore,
  requestVerificationDocumentDownloadUrlCore,
  deleteVerificationDocumentCore,
} from "./core";
export type {
  SupabaseStorageClient,
  VerificationDocumentKindInput,
  RequestVerificationUploadUrlResult,
  ConfirmVerificationUploadResult,
  RequestVerificationDownloadUrlResult,
} from "./core";

// Server Actions (Next.js wrapper around the core functions — these are
// the production entry points that create real Supabase clients).
export {
  requestVerificationDocumentUploadUrl,
  confirmVerificationDocumentUpload,
  requestVerificationDocumentDownloadUrl,
  deleteVerificationDocument,
} from "./actions";
