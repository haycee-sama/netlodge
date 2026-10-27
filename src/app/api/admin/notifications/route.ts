import { NextRequest, NextResponse } from "next/server";
import { fetchNotifications } from "@/lib/supabase/support-service";
import { securityCheck } from "@/lib/security/api-security";

export async function GET(request: NextRequest) {
  const sec = securityCheck(request, "admin-notifications", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const result = await fetchNotifications(request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
