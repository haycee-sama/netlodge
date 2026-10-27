import { NextRequest, NextResponse } from "next/server";
import { fetchRefunds, createRefund } from "@/lib/supabase/finance-service";
import { securityCheck } from "@/lib/security/api-security";

export async function GET(request: NextRequest) {
  const sec = securityCheck(request, "finance-refunds", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const sp = request.nextUrl.searchParams;
  const result = await fetchRefunds({
    status: sp.get("status") ?? undefined,
    q: sp.get("q") ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 20,
  }, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function POST(request: NextRequest) {
  const sec = securityCheck(request, "finance-refund-create", { capacity: 5, refillPerSecond: 0.2 });
  if (sec) return sec;

  let body: { paymentId?: string; amountKobo?: number; reason?: string; reasonDetail?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.paymentId || !body.amountKobo || !body.reason || !body.reasonDetail) {
    return NextResponse.json({ error: "paymentId, amountKobo, reason, reasonDetail are required" }, { status: 400 });
  }

  const result = await createRefund({
    paymentId: body.paymentId,
    amountKobo: body.amountKobo,
    reason: body.reason,
    reasonDetail: body.reasonDetail,
  }, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}
