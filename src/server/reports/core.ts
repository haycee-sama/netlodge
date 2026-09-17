/**
 * Reports core — testable pure functions for student/landlord-filed reports.
 *
 * Phase 11 — implements `reports.create`, `reports.listOwn`,
 * `adminReports.getQueue`, `adminReports.resolve` per API_CONTRACTS.md §15 +
 * DATABASE_SCHEMA.md §17 + PRD §17.
 *
 * CRITICAL SECURITY PROPERTIES:
 *
 *   1. Reporter identity is ALWAYS derived from the authenticated session
 *      (`AuthenticatedUser.id`) — NEVER from the request body. The Zod
 *      schemas use `.strict()` so a payload with `reporterId` is rejected
 *      at the validation layer. RLS also enforces `reporter_id = auth.uid()`
 *      on INSERT.
 *
 *   2. Target existence is validated SERVER-SIDE before INSERT. Per
 *      TECHNICAL_ARCHITECTURE.md §12 + API_CONTRACTS.md §15: closed enum
 *      check (Zod) FIRST, then existence check (DB lookup) — both
 *      server-side, both required to pass. A `targetId` that doesn't
 *      resolve to an existing record of the claimed `targetType` is
 *      rejected with `validation_error`, NOT silently accepted.
 *
 *   3. Report state machine (open → under_review → resolved) is enforced
 *      by the `guard_reports_status_transitions` trigger (migration 0010):
 *      reverse transitions blocked. The `admin_resolve_report` RPC
 *      validates the transition + writes the audit_logs row atomically.
 *
 *   4. Reporter-only read — `reports.listOwn` is scoped to `reporter_id =
 *      auth.uid()` by RLS. Reports filed by other users are invisible.
 *
 *   5. Admin-only mutation — only `admin_resolve_report` /
 *      `admin_mark_report_under_review` RPCs can transition status. The
 *      reporter has NO UPDATE/DELETE access (RLS enforces; no INSERT/UPDATE
 *      policies for non-admin-non-reporter).
 *
 *   6. Audit integration — `admin_resolve_report` writes an audit_logs row
 *      with action `report.resolved` (API_CONTRACTS.md §17) in the SAME
 *      transaction. `admin_mark_report_under_review` writes `report.under_review`.
 *
 *   7. Audit actor_id is derived from auth.uid() inside the RPC — never a
 *      parameter. A client-supplied `actorId` is rejected by Zod `.strict()`.
 */
import {
  validationError,
  forbiddenError,
  notFoundError,
  conflictError,
  internalError,
} from "@/errors";
import type { AuthenticatedUser } from "@/lib/auth";
import { formatZodError } from "@/validation";
import {
  createReportSchema,
  listOwnReportsSchema,
  adminListReportsSchema,
  resolveReportSchema,
  markReportUnderReviewSchema,
} from "@/lib/reports/schemas";
import type {
  ReportRow,
  ReportListResult,
} from "@/lib/reports/schemas";

export type SupabaseDbClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(fn: string, params?: Record<string, unknown>): any;
};

// ── Helper: validate report target exists in the corresponding table ─────────

/**
 * Server-side existence check per TECHNICAL_ARCHITECTURE.md §12 + API_CONTRACTS.md
 * §15. Replaces the polymorphic-FK trigger with an explicit application-layer
 * check — the design decision explicitly chosen for the polymorphic reports
 * table.
 *
 * Returns true if the target exists, false otherwise. Logs internally for
 * debugging but does NOT distinguish "doesn't exist" from "DB error" in the
 * return value — both are surfaced as validation failure to the client
 * (avoiding information disclosure about table internals).
 */
async function targetExists(
  db: SupabaseDbClient,
  targetType: "property" | "room" | "user",
  targetId: string,
): Promise<boolean> {
  const table =
    targetType === "property"
      ? "properties"
      : targetType === "room"
        ? "rooms"
        : "profiles";

  const { data, error } = await db
    .from(table)
    .select("id")
    .eq("id", targetId)
    .maybeSingle();

  if (error) {
    // DB error — don't leak internals. Log server-side.
    console.error("[netlodge] reports.targetExists lookup failed", {
      targetType,
      targetId,
      error,
    });
    return false;
  }

  return data !== null;
}

// ── Create report ────────────────────────────────────────────────────────────

export async function createReportCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<{ reportId: string }> {
  // 1. Authorization — both students and landlords can file reports
  //    (API_CONTRACTS.md §15). Admins cannot file reports (they ARE the
  //    resolution authority — filing as admin would be a conflict of interest).
  if (user.profile.role === "admin") {
    throw forbiddenError("Admins cannot file reports.");
  }
  if (user.profile.accountStatus === "suspended") {
    throw forbiddenError("Your account is suspended.");
  }

  // 2. Validate input — closed enum + UUID check.
  const parsed = createReportSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid report.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // 3. Existence check — the target must actually exist in the corresponding
  //    table. This is the explicit server-side validation replacing the trigger
  //    per TECHNICAL_ARCHITECTURE.md §12 / API_CONTRACTS.md §15.
  const exists = await targetExists(db, input.targetType, input.targetId);
  if (!exists) {
    throw validationError("The reported target does not exist.", [
      { field: "targetId", issue: `No ${input.targetType} exists with this ID.` },
    ]);
  }

  // 4. INSERT — reporter_id is derived from the session, never from input.
  //    RLS enforces `reporter_id = auth.uid()` on INSERT.
  const { data, error } = await db
    .from("reports")
    .insert({
      reporter_id: user.id,
      reported_entity_type: input.targetType,
      reported_entity_id: input.targetId,
      reason_category: input.reasonCategory,
      description: input.description ?? null,
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("check_violation") || msg.includes("status")) {
      throw conflictError("Invalid report state.", "invalid_state_transition");
    }
    throw internalError("Could not create report.", {
      phase: "createReport.insert",
      error,
    });
  }

  return { reportId: data.id };
}

// ── List own reports (reporter) ──────────────────────────────────────────────

export async function listOwnReportsCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<ReportListResult> {
  if (user.profile.role === "admin") {
    throw forbiddenError("Admins use the admin queue endpoint.");
  }

  const parsed = listOwnReportsSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw validationError("Invalid list request.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // RLS enforces: reporter_id = auth.uid() (only own reports).
  let query = db
    .from("reports")
    .select(
      "id, reported_entity_type, reported_entity_id, reason_category, description, status, resolved_by, resolution_notes, resolved_at, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize - 1,
    );

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw internalError("Could not retrieve reports.", {
      phase: "listOwnReports",
      error,
    });
  }

  return {
    items: (data ?? []).map(mapReportRow),
    page: input.page,
    pageSize: input.pageSize,
    totalCount: count ?? 0,
  };
}

// ── Admin: list report queue ────────────────────────────────────────────────

export async function listReportsAdminCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<ReportListResult> {
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can view the report queue.");
  }

  const parsed = adminListReportsSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw validationError("Invalid admin list request.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // Per API_CONTRACTS.md §15: "Paginated, defaults to non-resolved".
  // When status is explicitly provided, use it. Otherwise, default to
  // non-resolved (open + under_review) UNLESS includeResolved is true.
  let query = db
    .from("reports")
    .select(
      "id, reporter_id, reported_entity_type, reported_entity_id, reason_category, description, status, resolved_by, resolution_notes, resolved_at, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize - 1,
    );

  if (input.status) {
    query = query.eq("status", input.status);
  } else if (!input.includeResolved) {
    query = query.in("status", ["open", "under_review"]);
  }

  const { data, error, count } = await query;

  if (error) {
    throw internalError("Could not retrieve reports.", {
      phase: "listReportsAdmin",
      error,
    });
  }

  return {
    items: (data ?? []).map(mapReportRow),
    page: input.page,
    pageSize: input.pageSize,
    totalCount: count ?? 0,
  };
}

// ── Admin: resolve report (atomic, audited) ─────────────────────────────────

export async function resolveReportCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can resolve reports.");
  }

  const parsed = resolveReportSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid resolve request.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // The `admin_resolve_report` SECURITY DEFINER function (migration 0010)
  // atomically:
  //   1. Validates caller is an active admin.
  //   2. Validates resolution notes (non-empty, ≤ 2000 chars).
  //   3. Validates outcome is one of the documented values.
  //   4. Validates the report exists and is in a resolvable state
  //      (open or under_review).
  //   5. Updates reports.status = 'resolved' + resolved_by + resolved_at
  //      + resolution_notes.
  //   6. Inserts an audit_logs row with action='report.resolved'.
  // All in one DB transaction.
  const { error } = await db.rpc("admin_resolve_report", {
    p_report_id: input.reportId,
    p_resolution_notes: input.resolutionNotes,
    p_outcome: input.outcome,
  });

  if (error) {
    translateReportRpcError(error, "Could not resolve report.", "resolveReport");
  }

  // Phase 11 — dispatch report-resolved notification AFTER the RPC commits.
  try {
    const { data: report } = await db
      .from("reports")
      .select("reporter_id")
      .eq("id", input.reportId)
      .maybeSingle();
    const { data: reporterProfile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", report?.reporter_id ?? "")
      .maybeSingle();

    if (report?.reporter_id) {
      const { dispatchNotification } = await import("@/server/notifications/core");
      await dispatchNotification({
        event: "report.resolved",
        recipientUserId: report.reporter_id,
        data: {
          reporterFullName: reporterProfile?.full_name ?? "Reporter",
          outcome: input.outcome,
          resolutionNotes: input.resolutionNotes,
        },
      }, { db });
    }
  } catch (err) {
    console.error("[netlodge] post-resolve-report notification dispatch failed", {
      reportId: input.reportId,
      error: err,
    });
  }
}

// ── Admin: mark report under_review ─────────────────────────────────────────

export async function markReportUnderReviewCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can update report status.");
  }

  const parsed = markReportUnderReviewSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid request.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  const { error } = await db.rpc("admin_mark_report_under_review", {
    p_report_id: input.reportId,
  });

  if (error) {
    translateReportRpcError(error, "Could not update report status.", "markReportUnderReview");
  }
}

// ── Helper: map DB row to result shape ───────────────────────────────────────

function mapReportRow(raw: unknown): ReportRow {
  const r = raw as {
    id: string;
    reporter_id?: string;
    reported_entity_type: "property" | "room" | "user";
    reported_entity_id: string;
    reason_category: string;
    description: string | null;
    status: "open" | "under_review" | "resolved";
    resolved_by: string | null;
    resolution_notes: string | null;
    resolved_at: string | null;
    created_at: string;
  };
  return {
    id: r.id,
    targetType: r.reported_entity_type,
    targetId: r.reported_entity_id,
    reasonCategory: r.reason_category,
    description: r.description,
    status: r.status,
    resolvedBy: r.resolved_by,
    resolutionNotes: r.resolution_notes,
    resolvedAt: r.resolved_at,
    createdAt: r.created_at,
  };
}

// ── Helper: translate RPC errors ─────────────────────────────────────────────

function translateReportRpcError(
  err: { message?: string; code?: string } | undefined,
  fallbackMessage: string,
  fallbackPhase: string,
): never {
  if (!err) {
    throw internalError(fallbackMessage, { phase: fallbackPhase });
  }
  const msg = err.message ?? "";
  const code = err.code ?? "";

  if (code === "42501" || msg.includes("insufficient_privilege") || msg.includes("Only active admins")) {
    throw forbiddenError("You do not have permission to do this.");
  }
  if (msg.includes("Resolution notes are required") || msg.includes("2000 characters") || msg.includes("Invalid outcome")) {
    throw validationError("Invalid resolution request.", [
      { field: "resolutionNotes", issue: msg },
    ]);
  }
  if (code === "23514" || msg.includes("check_violation") || msg.includes("Cannot resolve") || msg.includes("Cannot move")) {
    throw conflictError(msg || "Invalid state transition.", "invalid_state_transition");
  }
  if (code === "23503" || msg.includes("not found")) {
    throw notFoundError("Report not found.");
  }
  throw internalError(fallbackMessage, { phase: fallbackPhase, error: err });
}
