import { NextRequest, NextResponse } from "next/server";
import {
  fetchVerificationQueue,
  type VerificationQueueFilters,
} from "@/lib/supabase/admin-service";

/**
 * GET /api/admin/verification/queue
 *
 * Returns the verification case queue for the calling officer/super_admin.
 * RLS restricts to verification_officer + super_admin. The service layer
 * also enforces the role check.
 *
 * Query params:
 *   status, submissionType, entityType, q, overdue (1|0), page, pageSize
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const filters: VerificationQueueFilters = {
    status: sp.get("status") ?? undefined,
    submissionType: sp.get("submissionType") ?? undefined,
    entityType: sp.get("entityType") ?? undefined,
    q: sp.get("q") ?? undefined,
    overdue: sp.get("overdue") === "1" ? true : undefined,
    assignedToMe: sp.get("assignedToMe") ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 20,
  };

  const result = await fetchVerificationQueue(filters, request);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
