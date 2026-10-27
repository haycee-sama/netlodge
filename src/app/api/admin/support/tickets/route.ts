import { NextRequest, NextResponse } from "next/server";
import { fetchTickets } from "@/lib/supabase/support-service";
import { securityCheck } from "@/lib/security/api-security";

export async function GET(request: NextRequest) {
  const sec = await securityCheck(request, "support-tickets", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const sp = request.nextUrl.searchParams;
  const result = await fetchTickets({
    status: sp.get("status") ?? undefined,
    priority: sp.get("priority") ?? undefined,
    q: sp.get("q") ?? undefined,
    escalated: sp.get("escalated") === "1" ? true : undefined,
    assignedToMe: sp.get("assignedToMe") ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 20,
  }, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
