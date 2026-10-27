import { NextRequest, NextResponse } from "next/server";
import { fetchNotifications, markAllNotificationsRead } from "@/lib/supabase/notification-service";
import { securityCheck } from "@/lib/security/api-security";

export async function GET(request: NextRequest) {
  const sec = securityCheck(request, "notifications-list", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const result = await fetchNotifications(request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function POST(request: NextRequest) {
  const sec = securityCheck(request, "notifications-mark-all", { capacity: 10, refillPerSecond: 0.5 });
  if (sec) return sec;

  const result = await markAllNotificationsRead(request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
