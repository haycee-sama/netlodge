import { NextRequest, NextResponse } from "next/server";
import { fetchPayoutById } from "@/lib/supabase/finance-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * GET /api/admin/finance/payouts/[payoutId]
 *
 * Returns the full payout record, its booking, ledger entries, and audit
 * history. finance_admin or super_admin only — enforced by fetchPayoutById.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ payoutId: string }> },
) {
  const { payoutId } = await params;
  if (!payoutId) {
    return NextResponse.json({ error: "payoutId is required" }, { status: 400 });
  }

  const sec = await securityCheck(request, "finance-payout-detail", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const result = await fetchPayoutById(payoutId, request);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
