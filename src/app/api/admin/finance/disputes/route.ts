import { NextRequest, NextResponse } from "next/server";
import { fetchDisputes } from "@/lib/supabase/finance-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * GET /api/admin/finance/disputes
 *
 * Returns disputes from the real `disputes` table. Read-only — no create/
 * update endpoints exist because the dispute workflow is not yet defined.
 *
 * Query: status, q, page, pageSize
 */
export async function GET(request: NextRequest) {
  const sec = await securityCheck(request, "finance-disputes", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const sp = request.nextUrl.searchParams;
  const result = await fetchDisputes({
    status: sp.get("status") ?? undefined,
    q: sp.get("q") ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 20,
  }, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
