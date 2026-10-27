import { NextRequest, NextResponse } from "next/server";
import { runReconciliation } from "@/lib/supabase/finance-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * POST /api/admin/finance/reconciliation/run
 * Body: { from: string (ISO), to: string (ISO) }
 *
 * Idempotent reconciliation pass. Creates reconciliation_records for all
 * successful payments in the date range, then verifies each with Paystack
 * and flags discrepancies.
 */
export async function POST(request: NextRequest) {
  const sec = securityCheck(request, "finance-reconciliation-run", { capacity: 2, refillPerSecond: 0.1 });
  if (sec) return sec;

  let body: { from?: string; to?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.from || !body.to) return NextResponse.json({ error: "from and to (ISO dates) are required" }, { status: 400 });

  const result = await runReconciliation(body.from, body.to, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
