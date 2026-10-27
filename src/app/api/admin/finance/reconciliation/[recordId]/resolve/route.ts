import { NextRequest, NextResponse } from "next/server";
import { resolveReconciliation } from "@/lib/supabase/finance-service";
import { securityCheck } from "@/lib/security/api-security";

export async function POST(request: NextRequest, { params }: { params: Promise<{ recordId: string }> }) {
  const { recordId } = await params;
  if (!recordId) return NextResponse.json({ error: "recordId is required" }, { status: 400 });

  const sec = securityCheck(request, "finance-reconciliation-resolve", { capacity: 5, refillPerSecond: 0.2 });
  if (sec) return sec;

  let body: { notes?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.notes?.trim()) return NextResponse.json({ error: "notes is required" }, { status: 400 });

  const result = await resolveReconciliation(recordId, body.notes, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
