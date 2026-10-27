import { NextRequest, NextResponse } from "next/server";
import { reviewRefund } from "@/lib/supabase/finance-service";
import { securityCheck } from "@/lib/security/api-security";

export async function POST(request: NextRequest, { params }: { params: Promise<{ refundId: string }> }) {
  const { refundId } = await params;
  if (!refundId) return NextResponse.json({ error: "refundId is required" }, { status: 400 });

  const sec = securityCheck(request, "finance-refund-review", { capacity: 5, refillPerSecond: 0.2 });
  if (sec) return sec;

  let body: { action?: "approve" | "reject"; notes?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.action || !["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const result = await reviewRefund(refundId, { action: body.action, notes: body.notes }, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
