import { NextRequest, NextResponse } from "next/server";
import { approvePayout } from "@/lib/supabase/finance-service";
import { securityCheck } from "@/lib/security/api-security";

export async function POST(request: NextRequest, { params }: { params: Promise<{ payoutId: string }> }) {
  const { payoutId } = await params;
  if (!payoutId) return NextResponse.json({ error: "payoutId is required" }, { status: 400 });

  const sec = await securityCheck(request, "finance-payout-approve", { capacity: 5, refillPerSecond: 0.2, failClosed: true });
  if (sec) return sec;

  const result = await approvePayout(payoutId, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
