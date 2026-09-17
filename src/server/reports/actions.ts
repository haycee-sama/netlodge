/**
 * Server-only Reports Server Actions — Phase 11.
 *
 * Thin Next.js Server Action wrappers around the pure functions in
 * `./core.ts`. The `server-only` import guard prevents client-side usage.
 */
import "server-only";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { requireAuthenticated, requireAccountActive } from "@/server/auth/authorize";
import {
  createReportCore,
  listOwnReportsCore,
  listReportsAdminCore,
  resolveReportCore,
  markReportUnderReviewCore,
} from "@/server/reports/core";
import type { ReportListResult } from "@/lib/reports/schemas";

// ── Student/Landlord: create report ─────────────────────────────────────────

export async function createReport(input: unknown): Promise<{ reportId: string }> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return createReportCore(db, user, input);
}

// ── Reporter: list own reports ──────────────────────────────────────────────

export async function listOwnReports(input: unknown): Promise<ReportListResult> {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return listOwnReportsCore(db, user, input);
}

// ── Admin: list report queue ────────────────────────────────────────────────

export async function listReportsAdmin(input: unknown): Promise<ReportListResult> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return listReportsAdminCore(db, user, input);
}

// ── Admin: resolve report ───────────────────────────────────────────────────

export async function resolveReport(input: unknown): Promise<void> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return resolveReportCore(db, user, input);
}

// ── Admin: mark report under_review ─────────────────────────────────────────

export async function markReportUnderReview(input: unknown): Promise<void> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return markReportUnderReviewCore(db, user, input);
}
