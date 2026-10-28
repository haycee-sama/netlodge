import { NextRequest, NextResponse } from "next/server";
import { addTicketMessage } from "@/lib/supabase/support-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * POST /api/admin/support/tickets/[ticketId]/messages
 * Body: { message: string, internal?: boolean }
 *
 * Adds a message to the ticket. If internal=true, the message is only
 * visible to staff (not the customer).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  if (!ticketId) return NextResponse.json({ error: "ticketId is required" }, { status: 400 });

  const sec = await securityCheck(request, "support-ticket-message", { capacity: 10, refillPerSecond: 0.5 });
  if (sec) return sec;

  let body: { message?: string; internal?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.message?.trim()) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const result = await addTicketMessage(ticketId, body.message, body.internal === true, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}
