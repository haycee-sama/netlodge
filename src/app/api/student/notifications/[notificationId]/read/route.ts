import { NextRequest, NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/supabase/notification-service";
import { securityCheck } from "@/lib/security/api-security";

export async function POST(request: NextRequest, { params }: { params: Promise<{ notificationId: string }> }) {
  const { notificationId } = await params;
  if (!notificationId) return NextResponse.json({ error: "notificationId is required" }, { status: 400 });

  const sec = securityCheck(request, "notification-read", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const result = await markNotificationRead(notificationId, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
