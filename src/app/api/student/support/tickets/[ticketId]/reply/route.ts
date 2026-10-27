import { NextRequest, NextResponse } from "next/server";
import { replyToTicket } from "@/lib/supabase/student-support-service";
import { securityCheck } from "@/lib/security/api-security";

export async function POST(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  if (!ticketId) return NextResponse.json({ error: "ticketId is required" }, { status: 400 });

  const sec = await securityCheck(request, "student-ticket-reply", { capacity: 5, refillPerSecond: 0.2 });
  if (sec) return sec;

  let body: { message?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.message?.trim()) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const result = await replyToTicket(ticketId, body.message, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}
