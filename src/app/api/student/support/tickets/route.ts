import { NextRequest, NextResponse } from "next/server";
import { fetchStudentTickets, createTicket, type CreateTicketInput } from "@/lib/supabase/student-support-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * GET /api/student/support/tickets — list the student's own tickets.
 * POST /api/student/support/tickets — create a new ticket.
 */
export async function GET(request: NextRequest) {
  const sec = securityCheck(request, "student-tickets-list", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const result = await fetchStudentTickets(request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function POST(request: NextRequest) {
  const sec = securityCheck(request, "student-ticket-create", { capacity: 3, refillPerSecond: 0.1 });
  if (sec) return sec;

  let body: CreateTicketInput;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.subject || !body.category || !body.message) {
    return NextResponse.json({ error: "subject, category, message are required" }, { status: 400 });
  }

  const result = await createTicket(body, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}
