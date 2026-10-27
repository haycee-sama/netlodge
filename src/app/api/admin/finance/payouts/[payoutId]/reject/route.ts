import { NextRequest, NextResponse } from "next/server";
import { rejectPayout } from "@/lib/supabase/finance-service";
import { securityCheck } from "@/lib/security/api-security";

export async function POST(request: NextRequest, { params }: { params: Promise<{ payoutId: string }> }) {
  const { payoutId } = await params;
  if (!payoutId) return NextResponse.json({ error: "payoutId is required" }, { status: 400 });

  const sec = securityCheck(request, "finance-payout-reject", { capacity: 5, refillPerSecond: 0.2 });
  if (sec) return sec;

  let body: { reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.reason?.trim()) return NextResponse.json({ error: "reason is required" }, { status: 400 });

  const result = await rejectPayout(payoutId, body.reason, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
