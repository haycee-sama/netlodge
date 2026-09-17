/**
 * Audit log core — read-only admin operations on `audit_logs`.
 *
 * Phase 10 — implements `adminAuditLogs.list` per API_CONTRACTS.md §17.
 *
 * CRITICAL SECURITY PROPERTIES:
 *
 *   1. Audit log rows are INSERT-only by SECURITY DEFINER admin mutation
 *      functions (migration 0009). There is NO application-layer or
 *      client-layer INSERT path. This module is read-only — it cannot
 *      create, modify, or delete audit rows.
 *
 *   2. `listAuditLogsCore` enforces `role = 'admin'` at the application
 *      layer (defense in depth — RLS also enforces this, but the
 *      application layer is the documented authority).
 *
 *   3. Actor identity is NEVER derived from request input — the audit
 *      log's `actor_id` column was already populated at insert time by
 *      the SECURITY DEFINER function (which derived it from `auth.uid()`
 *      at that moment). The `actorId` filter on `listAuditLogsCore` is
 *      a filter, not a forgery vector.
 *
 *   4. Pagination uses bounded page sizes (max 100) — prevents unbounded
 *      scans (API_CONTRACTS.md §2 + IMPLEMENTATION_PLAN.md §21 input-
 *      validation rules).
 */
import {
  validationError,
  forbiddenError,
  internalError,
} from "@/errors";
import type { AuthenticatedUser } from "@/lib/auth";
import { formatZodError } from "@/validation";
import { adminListAuditLogsSchema } from "@/lib/admin/schemas";
import type {
  AdminAuditLogRow,
  AdminListResult,
} from "@/lib/admin/schemas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseDbClient = { from(table: string): any };

/**
 * `adminAuditLogs.list` — API_CONTRACTS.md §17.
 *
 * Returns a paginated, filterable list of audit log entries.
 *
 * Authorization: caller must be an authenticated admin.
 *
 * Filters (all applied at the DB query level, validated by Zod `.strict()`):
 *   - entityType (optional, exact match)
 *   - entityId (optional, exact match)
 *   - actorId (optional, exact match)
 *   - fromDate / toDate (optional, ISO datetime range on created_at)
 *
 * The result is read-only — there is no `adminAuditLogs.create`/`.update`/
 * `.delete` contract anywhere in API_CONTRACTS.md.
 */
export async function listAuditLogsCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<AdminListResult<AdminAuditLogRow>> {
  // 1. Authorization — admin only.
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can view audit logs.");
  }

  // 2. Validate input.
  const parsed = adminListAuditLogsSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw validationError(
      "Invalid audit log query.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  // 3. Build the query.
  let query = db
    .from("audit_logs")
    .select(
      "id, actor_id, action, entity_type, entity_id, reason, metadata, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize - 1,
    );

  if (input.entityType) {
    query = query.eq("entity_type", input.entityType);
  }
  if (input.entityId) {
    query = query.eq("entity_id", input.entityId);
  }
  if (input.actorId) {
    query = query.eq("actor_id", input.actorId);
  }
  if (input.fromDate) {
    query = query.gte("created_at", input.fromDate);
  }
  if (input.toDate) {
    query = query.lte("created_at", input.toDate);
  }

  const { data, error, count } = await query;

  if (error) {
    throw internalError("Could not retrieve audit logs.", {
      phase: "listAuditLogs",
      error,
    });
  }

  const items: AdminAuditLogRow[] = (data ?? []).map(
    (raw: unknown) => {
      const r = raw as {
        id: string;
        actor_id: string | null;
        action: string;
        entity_type: string;
        entity_id: string;
        reason: string | null;
        metadata: unknown;
        created_at: string;
      };
      return {
        id: r.id,
        actorId: r.actor_id,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        reason: r.reason,
        metadata: r.metadata,
        createdAt: r.created_at,
      };
    },
  );

  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    totalCount: count ?? 0,
  };
}
