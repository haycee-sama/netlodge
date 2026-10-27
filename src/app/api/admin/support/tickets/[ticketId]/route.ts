import { NextRequest, NextResponse } from "next/server";
import { fetchTicketDetail } from "@/lib/supabase/support-service";
import { securityCheck } from "@/lib/security/api-security";

export async function GET(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  if (!ticketId) return NextResponse.json({ error: "ticketId is required" }, { status: 400 });

  const sec = securityCheck(request, "support-ticket-detail", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const result = await fetchTicketDetail(ticketId, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
