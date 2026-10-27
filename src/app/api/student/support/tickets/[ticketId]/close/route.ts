import { NextRequest, NextResponse } from "next/server";
import { closeTicket } from "@/lib/supabase/student-support-service";
import { securityCheck } from "@/lib/security/api-security";

export async function POST(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  if (!ticketId) return NextResponse.json({ error: "ticketId is required" }, { status: 400 });

  const sec = await securityCheck(request, "student-ticket-close", { capacity: 5, refillPerSecond: 0.2 });
  if (sec) return sec;

  const result = await closeTicket(ticketId, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
