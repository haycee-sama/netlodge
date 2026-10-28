import { NextRequest, NextResponse } from "next/server";
import { fetchAuditLogs } from "@/lib/supabase/admin-service";

/**
 * GET /api/admin/audit-logs
 *
 * Returns audit log entries (super_admin only). RLS allows super_admin to
 * read all audit_logs; finance_admin only finance-category rows.
 *
 * Query: category, severity, q, resourceType, resourceId, page, pageSize
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const result = await fetchAuditLogs({
    category: sp.get("category") ?? undefined,
    severity: sp.get("severity") ?? undefined,
    q: sp.get("q") ?? undefined,
    resourceType: sp.get("resourceType") ?? undefined,
    resourceId: sp.get("resourceId") ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 50,
  }, request);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
