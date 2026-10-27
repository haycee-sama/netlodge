import { NextRequest, NextResponse } from "next/server";
import { updateTicket, type TicketAction } from "@/lib/supabase/support-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * POST /api/admin/support/tickets/[ticketId]/update
 * Body: { action: TicketAction, value?: string, reason?: string }
 *
 * Actions: assign, unassign, change_status, escalate, de_escalate, set_priority, set_team
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  if (!ticketId) return NextResponse.json({ error: "ticketId is required" }, { status: 400 });

  const sec = await securityCheck(request, "support-ticket-update", { capacity: 10, refillPerSecond: 0.5 });
  if (sec) return sec;

  let body: { action?: TicketAction; value?: string; reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.action) return NextResponse.json({ error: "action is required" }, { status: 400 });

  const result = await updateTicket(ticketId, {
    action: body.action,
    value: body.value,
    reason: body.reason,
  }, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
