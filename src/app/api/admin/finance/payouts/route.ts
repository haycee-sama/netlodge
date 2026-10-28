import { NextRequest, NextResponse } from "next/server";
import { fetchPayouts } from "@/lib/supabase/finance-service";
import { securityCheck } from "@/lib/security/api-security";

export async function GET(request: NextRequest) {
  const sec = await securityCheck(request, "finance-payouts", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const sp = request.nextUrl.searchParams;
  const result = await fetchPayouts({
    status: sp.get("status") ?? undefined,
    q: sp.get("q") ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 20,
  }, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
