import { NextRequest, NextResponse } from "next/server";
import { fetchSecurityOverview } from "@/lib/supabase/admin-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * GET /api/admin/security
 *
 * Returns the security overview for the Super Administrator:
 *   - recent security/auth/critical audit events (paginated, filterable)
 *   - aggregate counts (total, critical, warning)
 *   - integration health summary
 *   - rate-limiter mode (distributed vs process-local)
 *
 * super_admin only — enforced by fetchSecurityOverview. RLS on audit_logs
 * also restricts non-super-admin roles to finance-category rows only, so
 * even a leaked token cannot read security events.
 *
 * Read-only: no mutations of audit_logs or security configuration.
 */
export async function GET(request: NextRequest) {
  const sec = await securityCheck(request, "admin-security", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const sp = request.nextUrl.searchParams;
  const result = await fetchSecurityOverview({
    q: sp.get("q") ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 50,
  }, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
