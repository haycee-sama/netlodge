import { NextRequest, NextResponse } from "next/server";
import { fetchStudentTicketDetail } from "@/lib/supabase/student-support-service";
import { securityCheck } from "@/lib/security/api-security";

export async function GET(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  if (!ticketId) return NextResponse.json({ error: "ticketId is required" }, { status: 400 });

  const sec = securityCheck(request, "student-ticket-detail", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const result = await fetchStudentTicketDetail(ticketId, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
