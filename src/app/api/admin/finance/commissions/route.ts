import { NextRequest, NextResponse } from "next/server";
import { fetchCommissionSummary } from "@/lib/supabase/finance-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * GET /api/admin/finance/commissions
 *
 * Returns the platform commission summary derived from real payouts and
 * platform_settings. Read-only — no mutation endpoints exist.
 *
 * Definitions are documented in finance-service.ts and are NOT changed here.
 */
export async function GET(request: NextRequest) {
  const sec = await securityCheck(request, "finance-commissions", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const result = await fetchCommissionSummary(request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
