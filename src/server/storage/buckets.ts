/**
 * Storage bucket names — Phase 3.
 *
 * Single source of truth for the two approved buckets per
 * TECHNICAL_ARCHITECTURE.md §9. Used by config, path generators, the
 * upload/download server actions, and the migration (0004).
 */
import "server-only";

export const STORAGE_BUCKETS = {
  propertyImages: "property-images",
  verificationDocuments: "verification-documents",
} as const;

export type StorageBucketName =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/**
 * Predicate helpers — keep call sites readable.
 */
export function isPublicBucket(bucket: StorageBucketName): boolean {
  return bucket === STORAGE_BUCKETS.propertyImages;
}

export function isPrivateBucket(bucket: StorageBucketName): boolean {
  return bucket === STORAGE_BUCKETS.verificationDocuments;
}
