import { NextRequest, NextResponse } from "next/server";
import { fetchAdminUserDetail } from "@/lib/supabase/admin-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * GET /api/admin/users/[userId]
 *
 * Fetch a single user's admin profile + roles + audit history (super_admin only).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const sec = await securityCheck(request, "admin-api", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;
  const { userId } = await params;
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  const result = await fetchAdminUserDetail(userId, request);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
