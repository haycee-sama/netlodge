import { NextRequest, NextResponse } from "next/server";
import { fetchFinanceMetrics } from "@/lib/supabase/finance-service";
import { securityCheck } from "@/lib/security/api-security";

export async function GET(request: NextRequest) {
  const sec = securityCheck(request, "finance-metrics", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const result = await fetchFinanceMetrics(request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
