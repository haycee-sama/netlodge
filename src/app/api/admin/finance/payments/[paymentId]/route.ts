import { NextRequest, NextResponse } from "next/server";
import { fetchPaymentById } from "@/lib/supabase/finance-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * GET /api/admin/finance/payments/[paymentId]
 *
 * Returns the full payment record, its booking, linked refunds, ledger
 * entries, and audit history. finance_admin or super_admin only — enforced
 * by fetchPaymentById.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await params;
  if (!paymentId) {
    return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
  }

  const sec = await securityCheck(request, "finance-payment-detail", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const result = await fetchPaymentById(paymentId, request);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
