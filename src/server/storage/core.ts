/**
 * Storage core — testable pure functions for signed URL issuance + confirm
 * + delete operations.
 *
 * Phase 3 — implements the storage service primitives per
 * TECHNICAL_ARCHITECTURE.md §9–10 + API_CONTRACTS.md §6–7. Each function
 * takes its Supabase Storage client as a parameter (dependency injection)
 * so tests can pass a mock without requiring a real Supabase project.
 *
 * CRITICAL SECURITY PROPERTIES (per Phase 3 task spec):
 *
 *   1. Signed upload URL issuance requires:
 *        - authenticated caller
 *        - active (non-suspended) account
 *        - server-side file-type + size validation
 *        - server-generated storage path (no client-controlled paths)
 *
 *   2. Signed download URL issuance for verification documents requires
 *      PER-CALL re-authorization:
 *        - caller is the document's owning landlord, OR
 *        - caller is an admin
 *      Authorization is NEVER cached across requests.
 *
 *   3. Confirm-upload hook:
 *        - Server verifies the uploaded object exists in Storage.
 *        - Returns metadata needed by Phase 4/5 to write the DB reference
 *          (`property_images`, `room_images`, or `landlord_verifications`).
 *        - The DB row is written ONLY after a confirmed upload — never
 *          during signed-URL issuance.
 *
 *   4. Verification documents are NEVER publicly accessible:
 *        - No public read policy on the bucket (migration 0004).
 *        - Signed download URLs are short-lived (5 min default).
 *        - Authorization is re-checked on every download URL request.
 *
 * This module does NOT import `server-only` — the auth boundary is enforced
 * by `actions.ts` (which DOES import `server-only`) and by the helpers in
 * `src/server/auth/authorize.ts` that this module calls. Tests can import
 * the core functions directly.
 */
import {
  validationError,
  forbiddenError,
  notFoundError,
  internalError,
} from "@/errors";
import type { AuthenticatedUser } from "@/lib/auth";
import {
  buildVerificationDocumentPath,
  parseStoragePath,
  type VerificationDocumentKind,
} from "./paths";
import { validateVerificationDocumentFile } from "./validation";
import { SIGNED_URL_EXPIRY_SECONDS } from "./config";
import { STORAGE_BUCKETS } from "./buckets";

// ── Types: Supabase Storage client (loose structural interface) ──────────────

/**
 * Subset of the Supabase Storage client used by the storage core.
 *
 * Loose-typed (intentional `any` for the chain methods — same pattern as
 * the auth core in Phase 2; the strict Supabase PostgrestBuilder typing
 * causes TS2589 infinite recursion when matched against a strict custom
 * interface). The runtime behavior is verified by integration tests.
 */
export interface SupabaseStorageClient {
  storage: {
    from(bucket: string): SupabaseStorageBucketClient;
  };
}

/**
 * Bucket-level operations. Used to issue signed upload URLs, signed
 * download URLs, list objects, and delete objects.
 *
 * The shape mirrors `@supabase/storage-js`'s `SupabaseStorageBucketClient`.
 */
export interface SupabaseStorageBucketClient {
  /**
   * Issue a signed upload URL. Returns the URL the client should PUT to,
   * plus the path the server stored at.
   */
  createSignedUploadUrl(
    path: string,
    options?: { upsert?: boolean },
  ): Promise<{
    data: {
      path: string;
      signedUrl: string;
      token: string;
    } | null;
    error: { message: string } | null;
  }>;

  /**
   * Issue a signed download URL. Returns the URL the client can GET from.
   */
  createSignedUrl(
    path: string,
    expiresIn: number,
    options?: { download?: boolean | string },
  ): Promise<{
    data: { signedUrl: string } | null;
    error: { message: string } | null;
  }>;

  /**
   * List objects in a bucket at a given path prefix.
   */
  list(
    prefix: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{
    data: Array<{
      name: string;
      bucket_id?: string | null;
      owner?: string | null;
      metadata?: { size?: number; mimetype?: string } | null;
    }> | null;
    error: { message: string } | null;
  }>;

  /**
   * Remove objects from a bucket.
   */
  remove(paths: string[]): Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

// ── Input types ─────────────────────────────────────────────────────────────

export type VerificationDocumentKindInput = VerificationDocumentKind;

// ── Result types ────────────────────────────────────────────────────────────

export interface RequestVerificationUploadUrlResult {
  /** The storage path the upload should target. Server-generated, never client-supplied. */
  path: string;
  /** The short-lived signed upload URL the client PUTs the file to. */
  signedUploadUrl: string;
  /** The token (Supabase uses this internally to verify the upload signature). */
  token: string;
  /** The bucket the upload is for. */
  bucket: "verification-documents";
  /** The MIME type that was declared (for the client to send as Content-Type). */
  mimeType: string;
  /** The document kind — Phase 4 will store this alongside the path. */
  kind: VerificationDocumentKindInput;
  /** When the signed URL expires (ISO timestamp). */
  expiresAt: string;
}

export interface ConfirmVerificationUploadResult {
  /** The storage path that was confirmed uploaded. */
  path: string;
  /** The bucket. */
  bucket: "verification-documents";
  /** The MIME type Supabase Storage reports for the uploaded object. */
  mimeType: string;
  /** The file size Supabase Storage reports (bytes). */
  sizeBytes: number;
  /**
   * Opaque metadata for Phase 4 to consume when creating the
   * `landlord_verifications` row. Phase 4 stores `path` in
   * `submitted_id_reference` or `submitted_ownership_reference` based on `kind`.
   */
  metadata: {
    kind: VerificationDocumentKindInput;
    landlordId: string;
  };
}

export interface RequestVerificationDownloadUrlResult {
  /** The short-lived signed download URL. */
  signedUrl: string;
  /** When the signed URL expires (ISO timestamp). */
  expiresAt: string;
  /** The bucket. Always `verification-documents`. */
  bucket: "verification-documents";
  /** The path of the object being downloaded. */
  path: string;
}

// ── Verification-document upload URL ────────────────────────────────────────

/**
 * Issue a signed upload URL for a landlord's verification document.
 *
 * Authorization:
 *   - Caller must be authenticated.
 *   - Caller's role must be 'landlord'.
 *   - Caller's account_status must be 'active' (suspended landlords
 *     cannot upload new verification documents).
 *
 * Validation:
 *   - Declared MIME type must be in the verification-document allow-list
 *     (image/jpeg, image/png, image/webp, application/pdf).
 *   - Declared size must be ≤ MAX_VERIFICATION_DOCUMENT_BYTES.
 *
 * Path generation:
 *   - Server generates path: `verification/{landlordId}/{kind}/{uuid}.{ext}`.
 *   - landlordId is derived from the authenticated session — NEVER from
 *     the client request body.
 *
 * Returns the path + signed URL the client should PUT the file to.
 *
 * NOTE: This function does NOT write any DB row. The DB reference is
 * written in Phase 4's `verification.submit` Server Action, which takes
 * the confirmed `path` and stores it on the new `landlord_verifications` row.
 */
export async function requestVerificationDocumentUploadUrlCore(
  storage: SupabaseStorageClient,
  user: AuthenticatedUser,
  input: {
    kind: VerificationDocumentKindInput;
    mimeType: string;
    sizeBytes: number;
  },
): Promise<RequestVerificationUploadUrlResult> {
  // 1. Authorization — role check.
  if (user.profile.role !== "landlord") {
    throw forbiddenError(
      "Only landlords can upload verification documents.",
    );
  }

  // 2. Authorization — account status check.
  if (user.profile.accountStatus === "suspended") {
    throw forbiddenError(
      "Your account is suspended and cannot perform this action.",
    );
  }

  // 3. Validate file metadata.
  const validation = validateVerificationDocumentFile({
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });
  if (!validation.ok) {
    throw validationError("Invalid file metadata.", validation.details);
  }

  // 4. Build the server-generated storage path.
  //    landlordId comes from the authenticated session — never from input.
  const path = buildVerificationDocumentPath({
    landlordId: user.id,
    kind: input.kind,
    mimeType: validation.mimeType,
  });

  // 5. Issue the signed upload URL via Supabase Storage.
  const bucket = storage.storage.from(STORAGE_BUCKETS.verificationDocuments);
  const { data, error } = await bucket.createSignedUploadUrl(path, {
    upsert: false,
  });

  if (error || !data) {
    throw internalError(
      "We couldn't issue an upload URL. Please try again.",
      { phase: "requestVerificationDocumentUploadUrl", error },
    );
  }

  const expiresAt = new Date(
    Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000,
  ).toISOString();

  return {
    path: data.path,
    signedUploadUrl: data.signedUrl,
    token: data.token,
    bucket: "verification-documents",
    mimeType: validation.mimeType,
    kind: input.kind,
    expiresAt,
  };
}

// ── Verification-document confirm upload ────────────────────────────────────

/**
 * Confirm that a landlord's verification document upload succeeded.
 *
 * This is called AFTER the client has PUT the file to the signed upload URL.
 * The server verifies the object actually exists in Storage and returns
 * the metadata Phase 4 needs to write the `landlord_verifications` row.
 *
 * Authorization:
 *   - Caller must be authenticated.
 *   - Caller's role must be 'landlord'.
 *   - Caller's account_status must be 'active'.
 *   - The path being confirmed must belong to the caller (parsed from the
 *     path: `verification/{landlordId}/...`). Defense-in-depth — the path
 *     was server-generated in the first place, so a malicious `path` here
 *     means the caller is trying to confirm someone else's upload.
 *
 * Phase 4's `verification.submit` Server Action will consume the returned
 * metadata to write the `landlord_verifications.submitted_id_reference` /
 * `submitted_ownership_reference` columns.
 *
 * Returns the storage path + size + MIME type.
 */
export async function confirmVerificationDocumentUploadCore(
  storage: SupabaseStorageClient,
  user: AuthenticatedUser,
  input: {
    path: string;
    kind: VerificationDocumentKindInput;
  },
): Promise<ConfirmVerificationUploadResult> {
  // 1. Authorization — role check.
  if (user.profile.role !== "landlord") {
    throw forbiddenError(
      "Only landlords can confirm verification-document uploads.",
    );
  }

  // 2. Authorization — account status check.
  if (user.profile.accountStatus === "suspended") {
    throw forbiddenError(
      "Your account is suspended and cannot perform this action.",
    );
  }

  // 3. Parse the path — extract the landlordId it was issued to.
  //    If the path is malformed OR belongs to a different landlordId,
  //    reject with forbidden. (Defense-in-depth — the path was server-
  //    generated, so this should never legitimately fail.)
  const parsed = parseStoragePath("verification-documents", input.path);
  if (!parsed || !parsed.landlordId) {
    // Don't reveal the path was malformed — that could leak info to an
    // attacker probing for valid path shapes. Generic forbidden.
    throw forbiddenError();
  }

  if (parsed.landlordId !== user.id) {
    // The path belongs to a different landlord — reject.
    throw forbiddenError();
  }

  if (parsed.kind !== input.kind) {
    // The path's kind doesn't match the declared kind — reject.
    throw forbiddenError();
  }

  // 4. Verify the object actually exists in Storage.
  //    Supabase Storage's `list()` returns objects under a prefix. We
  //    split the path into prefix + filename and list the prefix.
  const pathParts = input.path.split("/");
  const filename = pathParts.pop();
  const prefix = pathParts.join("/") + "/";

  if (!filename) {
    throw forbiddenError();
  }

  const bucket = storage.storage.from(STORAGE_BUCKETS.verificationDocuments);
  const { data: listedObjects, error: listError } = await bucket.list(prefix, {
    limit: 100,
  });

  if (listError) {
    throw internalError("Could not verify upload. Please try again.", {
      phase: "confirmVerificationDocumentUpload.list",
      error: listError,
    });
  }

  const uploadedObject = (listedObjects ?? []).find(
    (obj) => obj.name === filename,
  );

  if (!uploadedObject) {
    // The upload never succeeded (or was deleted). Don't reveal which.
    throw notFoundError("Upload not found. Please re-upload the file.");
  }

  // 5. Return the metadata Phase 4 needs.
  return {
    path: input.path,
    bucket: "verification-documents",
    mimeType: uploadedObject.metadata?.mimetype ?? "application/octet-stream",
    sizeBytes: uploadedObject.metadata?.size ?? 0,
    metadata: {
      kind: input.kind,
      landlordId: user.id,
    },
  };
}

// ── Verification-document download URL ──────────────────────────────────────

/**
 * Issue a signed download URL for a verification document.
 *
 * PER-CALL AUTHORIZATION (per Phase 3 task spec §11):
 *   The caller must be either:
 *     (a) The landlord who owns the document (parsed from the path), OR
 *     (b) An admin.
 *
 * This check happens on EVERY request — there is no caching. Even if a
 * landlord was authorized yesterday, if their account is suspended today,
 * this function will reject the request (per Attack #7: "A suspended
 * landlord attempts to obtain a new verification-document signed URL").
 *
 * Path ownership derivation:
 *   The path `verification/{landlordId}/...` is parsed; the extracted
 *   `landlordId` is compared against the authenticated user's id. If
 *   they don't match AND the caller isn't an admin, reject with `forbidden`.
 *
 * Returns the signed URL (short-lived, 5 min default).
 */
export async function requestVerificationDocumentDownloadUrlCore(
  storage: SupabaseStorageClient,
  user: AuthenticatedUser,
  input: {
    path: string;
  },
): Promise<RequestVerificationDownloadUrlResult> {
  // 1. Authorization — must be authenticated (caller already passed in via
  //    `user` param). Skip role check — both landlords AND admins can
  //    download, with different ownership rules below.

  // 2. Parse the path — extract the landlordId it belongs to.
  const parsed = parseStoragePath("verification-documents", input.path);
  if (!parsed || !parsed.landlordId) {
    // Don't reveal path structure — generic forbidden.
    throw forbiddenError();
  }

  // 3. Authorization — own-document OR admin.
  const isOwnDocument = parsed.landlordId === user.id;
  const isAdmin = user.profile.role === "admin";

  if (!isOwnDocument && !isAdmin) {
    // Student attempting to read landlord docs, OR landlord A attempting
    // to read landlord B's docs — both rejected with the same generic
    // forbidden (don't reveal which check failed).
    throw forbiddenError();
  }

  // 4. Authorization — suspended-account check.
  //    Per Attack #7: a suspended landlord must NOT be able to obtain a
  //    new signed download URL. The owner-of-document path is gated by
  //    account_status; the admin path is not (admins act on behalf of
  //    the system, not as the suspended landlord).
  if (isOwnDocument && user.profile.accountStatus === "suspended") {
    throw forbiddenError(
      "Your account is suspended and cannot perform this action.",
    );
  }

  // 5. Verify the object actually exists in Storage before issuing a
  //    download URL. Otherwise we'd return a URL that 404s — confusing UX.
  const pathParts = input.path.split("/");
  const filename = pathParts.pop();
  const prefix = pathParts.join("/") + "/";

  if (!filename) {
    throw forbiddenError();
  }

  const bucket = storage.storage.from(STORAGE_BUCKETS.verificationDocuments);
  const { data: listedObjects, error: listError } = await bucket.list(prefix, {
    limit: 100,
  });

  if (listError) {
    throw internalError("Could not generate download URL.", {
      phase: "requestVerificationDocumentDownloadUrl.list",
      error: listError,
    });
  }

  const objectExists = (listedObjects ?? []).some(
    (obj) => obj.name === filename,
  );

  if (!objectExists) {
    // Per API_CONTRACTS §19, "not_found" never reveals whether the resource
    // exists-but-is-unauthorized vs truly absent. We've already passed the
    // authorization check above, so a not-found here means the file is
    // genuinely missing (e.g., was deleted, or the path was issued but
    // never uploaded). Use not_found.
    throw notFoundError("Document not found.");
  }

  // 6. Issue the signed download URL.
  const { data, error } = await bucket.createSignedUrl(
    input.path,
    SIGNED_URL_EXPIRY_SECONDS,
  );

  if (error || !data) {
    throw internalError("Could not generate download URL.", {
      phase: "requestVerificationDocumentDownloadUrl.sign",
      error,
    });
  }

  const expiresAt = new Date(
    Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000,
  ).toISOString();

  return {
    signedUrl: data.signedUrl,
    expiresAt,
    bucket: "verification-documents",
    path: input.path,
  };
}

// ── Verification-document admin-triggered deletion ─────────────────────────

/**
 * Delete a verification document. ADMIN-ONLY.
 *
 * Per Phase 3 task spec §13: "Implement manual admin-triggered deletion
 * only. Do NOT implement automatic retention deletion yet. The retention
 * policy is intentionally still undecided."
 *
 * Authorization:
 *   - Caller must be authenticated.
 *   - Caller's role must be 'admin'.
 *
 * The deletion is irreversible. Phase 4+ will surface this as a manual
 * admin action — it's not exposed as a public Server Action callers
 * can hit directly. The DB row in `landlord_verifications` (Phase 4's
 * table) is NOT deleted by this function — that would be a separate
 * admin operation (clearing the `submitted_id_reference` column or
 * similar). This function deletes ONLY the Storage object.
 *
 * Returns the path that was deleted.
 */
export async function deleteVerificationDocumentCore(
  storage: SupabaseStorageClient,
  user: AuthenticatedUser,
  input: {
    path: string;
  },
): Promise<{ path: string; deleted: true }> {
  // 1. Authorization — admin only.
  if (user.profile.role !== "admin") {
    throw forbiddenError();
  }

  // 2. Validate the path shape (defense-in-depth — admin actions on
  //    arbitrary paths could be abused).
  const parsed = parseStoragePath("verification-documents", input.path);
  if (!parsed || !parsed.landlordId) {
    throw validationError("Invalid document path.", [
      { field: "path", issue: "Path does not match the expected shape." },
    ]);
  }

  // 3. Delete the Storage object.
  const bucket = storage.storage.from(STORAGE_BUCKETS.verificationDocuments);
  const { error } = await bucket.remove([input.path]);

  if (error) {
    throw internalError("Could not delete the document.", {
      phase: "deleteVerificationDocument",
      error,
    });
  }

  return { path: input.path, deleted: true };
}
