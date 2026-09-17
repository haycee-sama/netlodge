/**
 * Verification core — testable pure functions for landlord verification
 * operations.
 *
 * Phase 4 — implements the verification domain per API_CONTRACTS.md §7 +
 * DATABASE_SCHEMA.md §4.2/§4.3 + TECHNICAL_ARCHITECTURE.md §20.
 *
 * Each function takes its Supabase clients as parameters (dependency
 * injection) so tests can pass mocks without requiring a Next.js request
 * context. The actions wrapper (`./actions.ts`) creates real clients and
 * delegates to these functions.
 *
 * CRITICAL SECURITY PROPERTIES:
 *
 *   1. Landlord identity is ALWAYS derived from the authenticated session
 *      (`AuthenticatedUser.id`) — NEVER from the request body. The Zod
 *      schemas use `.strict()` so a payload with `landlordId` is rejected
 *      at the validation layer.
 *
 *   2. Append-only history: a new submission creates a NEW
 *      `landlord_verifications` row. The append-only trigger
 *      (migration 0005) blocks UPDATE/DELETE of historical rows by
 *      non-admin callers.
 *
 *   3. State machine: only documented transitions are allowed. The
 *      `guard_landlord_verifications_append_only` trigger enforces this
 *      at the DB level (defense-in-depth after the application check).
 *
 *   4. Atomic status sync: when admin approves/rejects, the
 *      `landlord_verifications.status` UPDATE and the
 *      `landlords.current_verification_status` cache update happen in a
 *      single DB transaction (the `sync_landlord_verification_status`
 *      trigger fires automatically on the status UPDATE).
 *
 *   5. Admin-only operations: approve/reject/getQueue/getDocumentUrl
 *      require `role = 'admin'`. The application check is the first line
 *      of defense; the append-only trigger is the second (it also blocks
 *      decision-field updates by non-admins).
 *
 *   6. Suspended-account enforcement: a suspended landlord cannot submit
 *      new verification. Per Phase 2's `requireAccountActive()` pattern.
 *
 * This module does NOT import `server-only` — the auth boundary is enforced
 * by `actions.ts` (which DOES import `server-only`). Tests can import
 * these core functions directly.
 */
import {
  validationError,
  forbiddenError,
  notFoundError,
  conflictError,
  internalError,
  AppError,
} from "@/errors";
import type { AuthenticatedUser } from "@/lib/auth";
import { formatZodError } from "@/validation";
import {
  submitVerificationSchema,
  getVerificationQueueSchema,
  getDocumentUrlSchema,
  approveVerificationSchema,
  rejectVerificationSchema,
} from "@/lib/verification/schemas";
import {
  requestVerificationDocumentDownloadUrlCore,
  confirmVerificationDocumentUploadCore,
  type SupabaseStorageClient,
} from "@/server/storage/core";
import { STORAGE_BUCKETS } from "@/server/storage/buckets";
import type { Database } from "@/types/database.generated";

// ── Types: Supabase DB client (loose structural interface) ──────────────────

/**
 * Subset of the Supabase client used by the verification core.
 *
 * Loose-typed (`any` for the chain methods — same pattern as the auth
 * core in Phase 2; the strict Supabase PostgrestBuilder typing causes
 * TS2589 infinite recursion when matched against a strict custom
 * interface). Runtime behavior is verified by integration tests.
 */
export interface SupabaseDbClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(fn: string, params?: Record<string, unknown>): any;
}

// ── Result types ─────────────────────────────────────────────────────────────

export interface LandlordVerificationStatus {
  landlordId: string;
  currentVerificationStatus:
    | "unsubmitted"
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected";
  verificationValidUntil: string | null;
  isSuspended: boolean;
  latestVerification: {
    id: string;
    status:
      | "submitted"
      | "under_review"
      | "approved"
      | "rejected";
    submittedAt: string;
    decision: "approved" | "rejected" | null;
    decisionReason: string | null;
    reviewedAt: string | null;
  } | null;
}

export interface VerificationHistoryEntry {
  id: string;
  status: "submitted" | "under_review" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt: string | null;
  decision: "approved" | "rejected" | null;
  decisionReason: string | null;
  /**
   * Phase 12 finding F-003: `reviewedBy` (admin UUID) is intentionally
   * NOT exposed through the landlord-facing `verification.getOwnHistory`
   * contract per API_CONTRACTS.md §23. The field is kept as `never` here
   * to make the absence explicit at the type level — any code that
   * tries to access `entry.reviewedBy` will fail to compile.
   *
   * Admin-side views (adminVerification.getQueue) use a different
   * response type that DOES include the admin identity.
   */
  reviewedBy?: never;
}

export interface VerificationQueueEntry {
  id: string;
  landlordId: string;
  landlordFullName: string;
  landlordEmail: string;
  status: "submitted" | "under_review" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt: string | null;
  decision: "approved" | "rejected" | null;
}

export interface VerificationQueuePage {
  entries: VerificationQueueEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SignedDocumentUrlResult {
  signedUrl: string;
  expiresAt: string;
  verificationId: string;
  documentKind: "id" | "ownership_evidence";
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Internal row shape for `landlord_verifications` SELECT results.
 */
interface VerificationRow {
  id: string;
  landlord_id: string;
  status: "submitted" | "under_review" | "approved" | "rejected";
  submitted_id_reference: string;
  submitted_ownership_reference: string;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decision: "approved" | "rejected" | null;
  decision_reason: string | null;
}

/**
 * Internal row shape for `landlords` SELECT results.
 *
 * Currently unused as a typed variable (Supabase's loose-typed chain
 * returns `any`), but kept as documentation of the expected shape.
 * Consumers should treat the row fields as best-effort.
 */

// ── Submit verification ──────────────────────────────────────────────────────

/**
 * `verification.submit` — API_CONTRACTS.md §7.
 *
 * Creates a NEW `landlord_verifications` row with status='submitted'.
 * Append-only — never updates an existing row.
 *
 * Authorization:
 *   - Caller must be authenticated.
 *   - Caller must be a landlord (not student/admin).
 *   - Caller must have an active account (suspended → rejected).
 *   - The provided storage paths must belong to the caller (parsed from
 *     path: `verification/{landlordId}/{kind}/{uuid}.{ext}`). The
 *     landlordId in the path must match the caller's id.
 *
 * Validation:
 *   - Both `idDocumentPath` and `ownershipEvidencePath` must be valid
 *     verification-document storage paths (parsed via parseStoragePath).
 *   - The `kind` encoded in each path must match the expected kind
 *     ('id' for idDocumentPath, 'ownership_evidence' for ownershipEvidencePath).
 *
 * Resubmission:
 *   - Allowed at any time. The previous rejected/approved row is NOT
 *     modified — a new row is created. The trigger updates
 *     `landlords.current_verification_status` to 'submitted' on INSERT.
 *
 * NOTE: this function does NOT verify the storage objects actually exist.
 * The confirm-upload step (Phase 3) already verified existence when the
 * path was returned. Phase 4 trusts that the path is a confirmed-upload
 * path. (A malicious landlord could submit a path they didn't confirm,
 * but the path parser rejects anything not matching the
 * `verification/{callerId}/{kind}/{uuid}.{ext}` shape — and the path
 * was server-generated by Phase 3, so a malicious landlord can't forge
 * another landlord's path.)
 *
 * TODO (Phase 12 hardening): re-verify object existence in Storage at
 * submission time as defense-in-depth. The Phase 3 confirm-upload step
 * already did this; a re-check here is redundant but cheap.
 */
export async function submitVerificationCore(
  db: SupabaseDbClient,
  storage: SupabaseStorageClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<{ verificationId: string; status: "submitted" }> {
  // 1. Authorization — role check.
  if (user.profile.role !== "landlord") {
    throw forbiddenError(
      "Only landlords can submit verification documents.",
    );
  }

  // 2. Authorization — account status check.
  if (user.profile.accountStatus === "suspended") {
    throw forbiddenError(
      "Your account is suspended and cannot perform this action.",
    );
  }

  // 3. Validate input — `.strict()` rejects landlordId, status, etc.
  const parsed = submitVerificationSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError(
      "Invalid verification submission.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  // 4. Look up the landlord record — must exist (created at registration).
  const { data: landlord, error: landlordErr } = await db
    .from("landlords")
    .select("profile_id, current_verification_status, is_suspended")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (landlordErr) {
    throw internalError("Could not process verification submission.", {
      phase: "submitVerification.landlordLookup",
      error: landlordErr,
    });
  }

  if (!landlord) {
    // No landlord row — the user is authenticated as a landlord but the
    // landlords row doesn't exist. This shouldn't happen (Phase 2
    // registration creates it). Treat as a not-found (don't leak whether
    // the issue is "no landlord row" vs "wrong role" — both result in the
    // same forbidden response below for the caller).
    throw forbiddenError(
      "Only landlords can submit verification documents.",
    );
  }

  // 5. Verify the landlord's `is_suspended` flag on the landlords table
  //    (separate from `profiles.account_status`). Defense-in-depth — if
  //    either flag is set, reject.
  if (landlord.is_suspended) {
    throw forbiddenError(
      "Your landlord account is suspended and cannot submit verification.",
    );
  }

  // 6. Validate the storage paths belong to the caller.
  //    Phase 3's parseStoragePath extracts landlordId + kind from the path.
  //    The landlordId MUST match user.id (closes Attack #2/#3: landlord A
  //    submitting with landlord B's path).
  const idPath = await validateOwnedDocumentPath(storage, user, input.idDocumentPath, "id");
  const ownershipPath = await validateOwnedDocumentPath(
    storage,
    user,
    input.ownershipEvidencePath,
    "ownership_evidence",
  );

  // 7. Insert the new landlord_verifications row.
  //    The RLS policy `landlord_verifications_self_insert` enforces
  //    `landlord_id = auth.uid()` + `status = 'submitted'` + all review
  //    fields NULL. The append-only trigger fires on any subsequent
  //    UPDATE attempt. The sync trigger fires on INSERT to update
  //    `landlords.current_verification_status`.
  const insertPayload: Database["public"]["Tables"]["landlord_verifications"]["Insert"] = {
    landlord_id: user.id, // ← server-derived, never from input
    status: "submitted", // ← hardcoded; trigger blocks changes
    submitted_id_reference: idPath,
    submitted_ownership_reference: ownershipPath,
    // submitted_at defaults to now()
    // reviewed_by / reviewed_at / decision / decision_reason default to NULL
  };

  const { data: inserted, error: insertErr } = await db
    .from("landlord_verifications")
    .insert(insertPayload)
    .select("id, status")
    .single();

  if (insertErr || !inserted) {
    throw internalError("Could not create verification submission.", {
      phase: "submitVerification.insert",
      error: insertErr,
    });
  }

  return {
    verificationId: inserted.id,
    status: inserted.status,
  };
}

/**
 * Internal helper: validate that a storage path belongs to the caller
 * and matches the expected document kind.
 *
 * Calls Phase 3's `confirmVerificationDocumentUploadCore` to verify the
 * object exists in Storage AND that the path's landlordId matches the
 * caller's id. The `kind` encoded in the path must match the expected
 * kind.
 *
 * Returns the validated path (unchanged).
 */
async function validateOwnedDocumentPath(
  storage: SupabaseStorageClient,
  user: AuthenticatedUser,
  path: string,
  expectedKind: "id" | "ownership_evidence",
): Promise<string> {
  // Phase 3's confirmVerificationDocumentUploadCore does:
  //   - role check (landlord)
  //   - account-status check (active)
  //   - path parsing (extracts landlordId + kind)
  //   - landlordId match (path's landlordId === user.id)
  //   - kind match (path's kind === declared kind)
  //   - object existence verification (via Storage.list())
  //
  // We reuse it here. The `kind` parameter passed must match the path's
  // encoded kind.
  try {
    const result = await confirmVerificationDocumentUploadCore(storage, user, {
      path,
      kind: expectedKind,
    });
    return result.path;
  } catch (err) {
    // Phase 3's confirmVerificationDocumentUploadCore throws AppError on
    // failure. Re-throw with a verification-specific phase tag for
    // debugging.
    if (err instanceof AppError) {
      throw err;
    }
    throw internalError("Could not verify uploaded document.", {
      phase: "submitVerification.validateOwnedDocumentPath",
      error: err,
    });
  }
}

// ── Get own status ──────────────────────────────────────────────────────────

/**
 * `verification.getOwnStatus` — API_CONTRACTS.md §7.
 *
 * Returns the landlord's current verification status + the latest
 * verification row (including decisionReason if rejected).
 *
 * Authorization: caller must be an authenticated landlord.
 */
export async function getOwnStatusCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
): Promise<LandlordVerificationStatus> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError(
      "Only landlords can view verification status.",
    );
  }

  // 1. Get the landlords row.
  const { data: landlord, error: landlordErr } = await db
    .from("landlords")
    .select(
      "profile_id, current_verification_status, verification_valid_until, is_suspended",
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (landlordErr) {
    throw internalError("Could not retrieve verification status.", {
      phase: "getOwnStatus.landlordLookup",
      error: landlordErr,
    });
  }

  if (!landlord) {
    throw notFoundError("Landlord record not found.");
  }

  // 2. Get the latest verification row (if any).
  const { data: latest, error: latestErr } = await db
    .from("landlord_verifications")
    .select(
      "id, status, submitted_at, decision, decision_reason, reviewed_at",
    )
    .eq("landlord_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) {
    throw internalError("Could not retrieve verification status.", {
      phase: "getOwnStatus.latestLookup",
      error: latestErr,
    });
  }

  return {
    landlordId: user.id,
    currentVerificationStatus: landlord.current_verification_status,
    verificationValidUntil: landlord.verification_valid_until,
    isSuspended: landlord.is_suspended,
    latestVerification: latest
      ? {
          id: latest.id,
          status: latest.status,
          submittedAt: latest.submitted_at,
          decision: latest.decision,
          decisionReason: latest.decision_reason,
          reviewedAt: latest.reviewed_at,
        }
      : null,
  };
}

// ── Get own history ─────────────────────────────────────────────────────────

/**
 * `verification.getOwnHistory` — API_CONTRACTS.md §7.
 *
 * Returns all verification rows for the landlord (full history, append-only).
 *
 * Authorization: caller must be an authenticated landlord.
 */
export async function getOwnHistoryCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
): Promise<{ history: VerificationHistoryEntry[] }> {
  if (user.profile.role !== "landlord") {
    throw forbiddenError(
      "Only landlords can view verification history.",
    );
  }

  // Phase 12 finding F-003: the original SELECT included `reviewed_by`
  // (the admin's profile UUID), which is NOT in the documented exposure
  // table (API_CONTRACTS.md §23). The landlord should see the decision
  // + reason + timestamps, but NOT which specific admin reviewed them —
  // that's admin-internal information. Removed `reviewed_by` from the
  // SELECT and from the response shape.
  //
  // The `reviewed_by` column is still set at INSERT/UPDATE time (it's
  // needed for audit traceability via `audit_logs` and for admin-side
  // history views), but it's no longer exposed through the landlord-
  // facing `verification.getOwnHistory` contract.
  const { data: rows, error: rowsErr } = await db
    .from("landlord_verifications")
    .select(
      "id, status, submitted_at, reviewed_at, decision, decision_reason",
    )
    .eq("landlord_id", user.id)
    .order("submitted_at", { ascending: false });

  if (rowsErr) {
    throw internalError("Could not retrieve verification history.", {
      phase: "getOwnHistory.list",
      error: rowsErr,
    });
  }

  return {
    history: (rows ?? []).map((r: VerificationRow) => ({
      id: r.id,
      status: r.status,
      submittedAt: r.submitted_at,
      reviewedAt: r.reviewed_at,
      decision: r.decision,
      decisionReason: r.decision_reason,
      // Phase 12 finding F-003: `reviewedBy` (admin UUID) is intentionally
      // NOT exposed to landlords per API_CONTRACTS.md §23. Admin-side
      // history views (adminVerification.getQueue) still include it.
    })),
  };
}

// ── Admin: get verification queue ───────────────────────────────────────────

/**
 * `adminVerification.getQueue` — API_CONTRACTS.md §7.
 *
 * Returns a paginated list of verification submissions, optionally filtered
 * by status. Defaults to 'submitted' + 'under_review' (the pending queue).
 *
 * Authorization: caller must be an authenticated admin.
 */
export async function getVerificationQueueCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<VerificationQueuePage> {
  // 1. Authorization — admin only.
  if (user.profile.role !== "admin") {
    throw forbiddenError(
      "Only admins can view the verification queue.",
    );
  }

  // 2. Validate input.
  const parsed = getVerificationQueueSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw validationError(
      "Invalid queue request.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  // 3. Build the query — join landlords + profiles for landlord name/email.
  //    RLS policies on landlords + landlord_verifications allow admin full
  //    read access via `netlodge_is_current_user_admin()`.
  let query = db
    .from("landlord_verifications")
    .select(
      `
      id,
      landlord_id,
      status,
      submitted_at,
      reviewed_at,
      decision,
      landlords!inner (
        profiles!inner (
          full_name,
          email
        )
      )
      `,
      { count: "exact" },
    )
    .order("submitted_at", { ascending: false })
    .range(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize - 1,
    );

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data: rows, error: rowsErr, count } = await query;

  if (rowsErr) {
    throw internalError("Could not retrieve verification queue.", {
      phase: "getVerificationQueue.list",
      error: rowsErr,
    });
  }

  // 4. Map rows to the result shape.
  const entries: VerificationQueueEntry[] = (rows ?? []).map(
    (raw: unknown) => {
      const r = raw as {
        id: string;
        landlord_id: string;
        status: VerificationQueueEntry["status"];
        submitted_at: string;
        reviewed_at: string | null;
        decision: VerificationQueueEntry["decision"];
        landlords: {
          profiles: {
            full_name: string;
            email: string;
          };
        };
      };
      return {
        id: r.id,
        landlordId: r.landlord_id,
        landlordFullName: r.landlords?.profiles?.full_name ?? "",
        landlordEmail: r.landlords?.profiles?.email ?? "",
        status: r.status,
        submittedAt: r.submitted_at,
        reviewedAt: r.reviewed_at,
        decision: r.decision,
      };
    },
  );

  return {
    entries,
    total: count ?? 0,
    page: input.page,
    pageSize: input.pageSize,
  };
}

// ── Admin: get document URL ──────────────────────────────────────────────────

/**
 * `adminVerification.getDocumentUrl` — API_CONTRACTS.md §7.
 *
 * Issues a short-lived signed download URL for a verification document.
 * Re-uses Phase 3's `requestVerificationDocumentDownloadUrlCore`.
 *
 * Authorization:
 *   - Caller must be an authenticated admin.
 *   - The verification row must exist.
 *   - The path stored on the row is used (the admin doesn't pass a path —
 *     they pass a verificationId + documentKind, and the server looks up
 *     the path). This closes Attack #5 (arbitrary path).
 *
 * The signed URL is short-lived (5 min default per Phase 3 config).
 */
export async function getDocumentUrlCore(
  db: SupabaseDbClient,
  storage: SupabaseStorageClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<SignedDocumentUrlResult> {
  // 1. Authorization — admin only.
  if (user.profile.role !== "admin") {
    throw forbiddenError(
      "Only admins can request verification document URLs.",
    );
  }

  // 2. Validate input.
  const parsed = getDocumentUrlSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError(
      "Invalid document URL request.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  // 3. Look up the verification row — admin can see all rows (RLS).
  const { data: verification, error: vErr } = await db
    .from("landlord_verifications")
    .select(
      "id, submitted_id_reference, submitted_ownership_reference",
    )
    .eq("id", input.verificationId)
    .maybeSingle();

  if (vErr) {
    throw internalError("Could not retrieve verification document.", {
      phase: "getDocumentUrl.lookup",
      error: vErr,
    });
  }

  if (!verification) {
    throw notFoundError("Verification submission not found.");
  }

  // 4. Select the path based on documentKind.
  const path =
    input.documentKind === "id"
      ? verification.submitted_id_reference
      : verification.submitted_ownership_reference;

  // 5. Issue the signed download URL via Phase 3's core function.
  //    Phase 3's function re-checks authorization (own-document OR admin).
  //    The admin path is what we're exercising here.
  const result = await requestVerificationDocumentDownloadUrlCore(storage, user, {
    path,
  });

  return {
    signedUrl: result.signedUrl,
    expiresAt: result.expiresAt,
    verificationId: input.verificationId,
    documentKind: input.documentKind,
  };
}

// ── Admin: approve ──────────────────────────────────────────────────────────

/**
 * `adminVerification.approve` — API_CONTRACTS.md §7.
 *
 * Sets `decision = 'approved'`, `status = 'approved'`, `reviewed_by`,
 * `reviewed_at`. The `sync_landlord_verification_status` trigger
 * automatically updates `landlords.current_verification_status = 'approved'`
 * AND sets `verification_valid_until = now() + 6 months`.
 *
 * Authorization: caller must be an authenticated admin.
 *
 * State machine:
 *   - Allowed: 'submitted' → 'approved', 'under_review' → 'approved'.
 *   - Blocked: 'approved' → 'approved' (already decided), 'rejected' → 'approved'
 *     (terminal — resubmit creates a new row).
 *
 * The append-only trigger (migration 0005) blocks re-deciding an already-
 * decided row (defends against Attack #13: admin approves already-closed
 * submission).
 */
export async function approveVerificationCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<{ verificationId: string; status: "approved" }> {
  // 1. Authorization — admin only.
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can approve verification submissions.");
  }

  // 2. Validate input.
  const parsed = approveVerificationSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError(
      "Invalid approval request.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  // 3. Phase 10 — call the SECURITY DEFINER RPC function. This atomically:
  //    (a) Re-validates caller as an active admin (defense against direct
  //        RPC invocation by non-admins).
  //    (b) Validates the verification row exists and is in a reviewable
  //        state (submitted or under_review, decision IS NULL).
  //    (c) Updates landlord_verifications.status + decision + reviewed_by
  //        + reviewed_at (the existing sync_landlord_verification_status
  //        trigger fires automatically to update landlords cache).
  //    (d) Inserts an audit_logs row with action='landlord_verification.approved'.
  //    All in a single DB transaction — atomicity per IMPLEMENTATION_PLAN.md §17.
  const { error: rpcErr } = await db.rpc("admin_approve_verification", {
    p_verification_id: input.verificationId,
    p_reason: input.reason ?? null,
  });

  if (rpcErr) {
    const msg = (rpcErr.message ?? "").toLowerCase();
    if (
      msg.includes("insufficient_privilege") ||
      msg.includes("only active admins")
    ) {
      throw forbiddenError("You do not have permission to do this.");
    }
    if (msg.includes("not found")) {
      throw notFoundError("Verification submission not found.");
    }
    if (
      msg.includes("already been decided") ||
      msg.includes("cannot approve") ||
      msg.includes("check_violation")
    ) {
      throw conflictError(
        "Could not approve — the submission may have already been decided.",
        "already_decided",
      );
    }
    throw internalError("Could not process approval.", {
      phase: "approveVerification.rpc",
      error: rpcErr,
    });
  }

  // Phase 11 — dispatch notification AFTER the RPC commits. The business
  // mutation is already durable; notification failure is isolated and
  // will NOT roll back the approval.
  //
  // The recipient is the landlord who owns the verification — derived
  // from the verification row's landlord_id, NEVER from the request body.
  try {
    const { data: verification } = await db
      .from("landlord_verifications")
      .select("landlord_id")
      .eq("id", input.verificationId)
      .maybeSingle();
    const { data: landlordProfile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", verification?.landlord_id ?? "")
      .maybeSingle();

    if (verification?.landlord_id) {
      // Use dynamic import to avoid circular dependency at module-load time
      // (notifications/core imports from supabase/privileged which imports
      // from config/env which is fine, but doing it dynamically keeps the
      // dependency graph clean and tests can mock via _setTestEmailProvider).
      const { dispatchNotification } = await import("@/server/notifications/core");
      await dispatchNotification({
        event: "landlord_verification.approved",
        recipientUserId: verification.landlord_id,
        data: {
          landlordFullName: landlordProfile?.full_name ?? "Landlord",
          validUntil: null, // RPC set this internally; not critical for email
        },
      }, { db });
    }
  } catch (err) {
    // Notification failure MUST NOT propagate — the business mutation
    // already committed.
    console.error("[netlodge] post-approve notification dispatch failed", {
      verificationId: input.verificationId,
      error: err,
    });
  }

  return {
    verificationId: input.verificationId,
    status: "approved",
  };
}

// ── Admin: reject ───────────────────────────────────────────────────────────

/**
 * `adminVerification.reject` — API_CONTRACTS.md §7.
 *
 * Sets `decision = 'rejected'`, `status = 'rejected'`, `decision_reason = reason` verbatim,
 * `reviewed_by`, `reviewed_at`. The sync trigger updates
 * `landlords.current_verification_status = 'rejected'`.
 *
 * Authorization: caller must be an authenticated admin.
 *
 * The rejection reason is REQUIRED (enforced by the Zod schema — empty
 * strings rejected, max 2000 chars).
 *
 * State machine:
 *   - Allowed: 'submitted' → 'rejected', 'under_review' → 'rejected'.
 *   - Blocked: 'approved' → 'rejected' (terminal — resubmit creates new row).
 *
 * After rejection, the landlord can resubmit — `verification.submit` creates
 * a NEW row. The rejected row remains permanently queryable.
 */
export async function rejectVerificationCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<{
  verificationId: string;
  status: "rejected";
  decisionReason: string;
}> {
  // 1. Authorization — admin only.
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can reject verification submissions.");
  }

  // 2. Validate input — reason is required, non-empty, ≤ 2000 chars.
  const parsed = rejectVerificationSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError(
      "Invalid rejection request.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  // 3. Phase 10 — call the SECURITY DEFINER RPC function. This atomically:
  //    (a) Re-validates caller as an active admin.
  //    (b) Validates reason is non-empty after trim, ≤ 2000 chars.
  //    (c) Validates the verification row exists and is in a reviewable state.
  //    (d) Updates landlord_verifications.status + decision + decision_reason
  //        + reviewed_by + reviewed_at (sync trigger updates landlord cache).
  //    (e) Inserts an audit_logs row with action='landlord_verification.rejected'.
  //    All in one DB transaction.
  const { error: rpcErr } = await db.rpc("admin_reject_verification", {
    p_verification_id: input.verificationId,
    p_reason: input.reason,
  });

  if (rpcErr) {
    const msg = (rpcErr.message ?? "").toLowerCase();
    if (
      msg.includes("insufficient_privilege") ||
      msg.includes("only active admins")
    ) {
      throw forbiddenError("You do not have permission to do this.");
    }
    if (msg.includes("not found")) {
      throw notFoundError("Verification submission not found.");
    }
    if (
      msg.includes("reason is required") ||
      msg.includes("2000 characters")
    ) {
      throw validationError("Invalid rejection reason.", [
        { field: "reason", issue: rpcErr.message },
      ]);
    }
    if (
      msg.includes("already been decided") ||
      msg.includes("cannot reject") ||
      msg.includes("check_violation")
    ) {
      throw conflictError(
        "Could not reject — the submission may have already been decided.",
        "already_decided",
      );
    }
    throw internalError("Could not process rejection.", {
      phase: "rejectVerification.rpc",
      error: rpcErr,
    });
  }

  // Phase 11 — dispatch rejection notification AFTER the RPC commits.
  try {
    const { data: verification } = await db
      .from("landlord_verifications")
      .select("landlord_id")
      .eq("id", input.verificationId)
      .maybeSingle();
    const { data: landlordProfile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", verification?.landlord_id ?? "")
      .maybeSingle();

    if (verification?.landlord_id) {
      const { dispatchNotification } = await import("@/server/notifications/core");
      await dispatchNotification({
        event: "landlord_verification.rejected",
        recipientUserId: verification.landlord_id,
        data: {
          landlordFullName: landlordProfile?.full_name ?? "Landlord",
          reason: input.reason,
        },
      }, { db });
    }
  } catch (err) {
    console.error("[netlodge] post-reject notification dispatch failed", {
      verificationId: input.verificationId,
      error: err,
    });
  }

  return {
    verificationId: input.verificationId,
    status: "rejected",
    decisionReason: input.reason,
  };
}

// Re-export the storage bucket name for convenience.
export { STORAGE_BUCKETS };
