/**
 * Server-generated storage object paths.
 *
 * Phase 3 — per TECHNICAL_ARCHITECTURE.md §9: "filenames are never trusted
 * as-is — the server generates the storage path (e.g., a UUID-based key),
 * preventing path traversal or filename-based collisions/overwrites entirely,
 * since the client never controls the actual path written."
 *
 * Path conventions (server-only — these constructors are NEVER called with
 * client-supplied path components):
 *
 *   property-images bucket:
 *     properties/{propertyId}/{uuid}.{ext}
 *     rooms/{roomId}/{uuid}.{ext}
 *
 *   verification-documents bucket:
 *     verification/{landlordId}/{kind}/{uuid}.{ext}
 *       where kind is "id" or "ownership_evidence"
 *
 * The `{uuid}` is generated server-side via `crypto.randomUUID()`. The
 * `{ext}` is derived from the declared MIME type (also server-validated).
 * The `{propertyId}`/`{roomId}`/`{landlordId}` are derived from the
 * authenticated session + server-side ownership verification — NEVER from
 * the client request body (Phase 5 wires in property ownership checks;
 * Phase 3's verification-document path uses `auth.uid()` for landlordId).
 *
 * `crypto.randomUUID()` is available in Node 19+ (we're on Node 24)
 * and in the Web Crypto API. It produces a cryptographically-random UUID
 * v4 — collision-resistant and unpredictable.
 */
import "server-only";
import { randomUUID } from "node:crypto";

/**
 * Verification document kinds — matches DATABASE_SCHEMA.md §4.3's
 * `submitted_id_reference` / `submitted_ownership_reference` columns.
 * Phase 4 will write these references to the `landlord_verifications` row.
 */
export type VerificationDocumentKind = "id" | "ownership_evidence";

/**
 * MIME type → file extension mapping. The extension is used in the storage
 * path purely for human-readability when browsing Storage directly — it
 * does NOT affect validation (which is MIME-type based, not extension based).
 *
 * Restricted to the MIME types allowed by the verification-document config.
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * Generate a storage path for a verification document.
 *
 * Path shape: `verification/{landlordId}/{kind}/{uuid}.{ext}`
 *
 * The `landlordId` is the authenticated landlord's user id (derived from
 * the session in the calling Server Action — NEVER from the client request
 * body). The `uuid` is server-generated. The `ext` is derived from the
 * MIME type.
 *
 * This path structure enables:
 *   - Per-landlord scoping (RLS policy on storage.objects checks
 *     `owner = auth.uid()` for INSERT).
 *   - Audit-trail grouping (Phase 4 will store this path in
 *     `landlord_verifications.submitted_id_reference`).
 *   - Path-traversal impossibility (no client component in the path).
 */
export function buildVerificationDocumentPath(params: {
  landlordId: string;
  kind: VerificationDocumentKind;
  mimeType: string;
}): string {
  // Validate the landlordId is a UUID — defense-in-depth against a future
  // code path that might pass an arbitrary string. This is server-derived,
  // but validating it here means a bug elsewhere can't poison the path.
  if (!isValidUuid(params.landlordId)) {
    throw new Error(
      "[netlodge] buildVerificationDocumentPath: landlordId must be a valid UUID",
    );
  }

  if (params.kind !== "id" && params.kind !== "ownership_evidence") {
    throw new Error(
      `[netlodge] buildVerificationDocumentPath: invalid kind "${params.kind}"`,
    );
  }

  const ext = MIME_TO_EXTENSION[params.mimeType];
  if (!ext) {
    throw new Error(
      `[netlodge] buildVerificationDocumentPath: unsupported MIME type "${params.mimeType}"`,
    );
  }

  const uuid = randomUUID();
  return `verification/${params.landlordId}/${params.kind}/${uuid}.${ext}`;
}

/**
 * Generate a storage path for a property image.
 *
 * Path shape: `properties/{propertyId}/{uuid}.{ext}`
 *
 * NOTE: Phase 3 ships the path constructor. Phase 5 wires in the actual
 * property-ownership verification (does the caller own this propertyId?).
 * Phase 3 does NOT issue signed upload URLs for property images — only
 * the path constructor is shipped so Phase 5 can plug in cleanly.
 */
export function buildPropertyImagePath(params: {
  propertyId: string;
  mimeType: string;
}): string {
  if (!isValidUuid(params.propertyId)) {
    throw new Error(
      "[netlodge] buildPropertyImagePath: propertyId must be a valid UUID",
    );
  }
  const ext = MIME_TO_EXTENSION[params.mimeType];
  if (!ext) {
    throw new Error(
      `[netlodge] buildPropertyImagePath: unsupported MIME type "${params.mimeType}"`,
    );
  }
  return `properties/${params.propertyId}/${randomUUID()}.${ext}`;
}

/**
 * Generate a storage path for a room image.
 *
 * Path shape: `rooms/{roomId}/{uuid}.{ext}`
 *
 * NOTE: Phase 3 ships the path constructor. Phase 5 wires in the actual
 * room-ownership verification. Phase 3 does NOT issue signed upload URLs
 * for room images — only the path constructor is shipped.
 */
export function buildRoomImagePath(params: {
  roomId: string;
  mimeType: string;
}): string {
  if (!isValidUuid(params.roomId)) {
    throw new Error(
      "[netlodge] buildRoomImagePath: roomId must be a valid UUID",
    );
  }
  const ext = MIME_TO_EXTENSION[params.mimeType];
  if (!ext) {
    throw new Error(
      `[netlodge] buildRoomImagePath: unsupported MIME type "${params.mimeType}"`,
    );
  }
  return `rooms/${params.roomId}/${randomUUID()}.${ext}`;
}

/**
 * Parsed storage path — used to derive ownership context from an existing
 * path (e.g., when checking authorization for a download URL).
 *
 * The shape is intentionally permissive: unknown path formats return
 * `null` rather than throwing, because the caller may be processing a
 * path that came from the DB (which should always be one of the known
 * formats, but we don't want a single bad path to crash the auth check).
 */
export interface StoragePathContext {
  bucket: "property-images" | "verification-documents";
  /** For verification-documents paths: the landlordId encoded in the path. */
  landlordId?: string;
  /** For verification-documents paths: the document kind. */
  kind?: VerificationDocumentKind;
}

/**
 * Parse a storage path to extract ownership context.
 *
 * For verification documents:
 *   `verification/{landlordId}/{kind}/{uuid}.{ext}` → { landlordId, kind }
 *
 * For property/room images, this Phase 3 implementation doesn't need to
 * extract context (no per-call download authorization for public images).
 *
 * Returns null for unrecognized path shapes — caller should treat null
 * as "no context, deny by default."
 */
export function parseStoragePath(
  bucket: "property-images" | "verification-documents",
  path: string,
): StoragePathContext | null {
  if (bucket === "verification-documents") {
    // Expected: verification/{landlordId}/{kind}/{uuid}.{ext}
    const parts = path.split("/");
    if (parts.length !== 4) return null;
    const prefix = parts[0] ?? "";
    const landlordId = parts[1] ?? "";
    const kind = parts[2] ?? "";
    const filename = parts[3] ?? "";
    if (prefix !== "verification") return null;
    if (!isValidUuid(landlordId)) return null;
    if (kind !== "id" && kind !== "ownership_evidence") return null;
    if (!filename || !filename.includes(".")) return null;

    return {
      bucket,
      landlordId,
      kind: kind as VerificationDocumentKind,
    };
  }

  // Property/room images: no context extraction needed in Phase 3.
  // Phase 5 may add propertyId / roomId extraction if needed for
  // ownership-verified delete operations.
  return {
    bucket,
  };
}

/**
 * Validate that a string is a UUID v4. Used to defend against path-traversal
 * via crafted landlordId / propertyId values (even though they should be
 * server-derived, defense-in-depth).
 */
function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
