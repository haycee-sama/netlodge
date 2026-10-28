import { NextRequest, NextResponse } from "next/server";
import { changeUserStatus } from "@/lib/supabase/admin-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * POST /api/admin/users/[userId]/status
 *
 * Activate or suspend a user. The set_user_active_status RPC enforces:
 *   - Caller is super_admin
 *   - Caller cannot suspend their own account
 *   - Cannot suspend the last active super_admin
 *
 * Body: { active: boolean, reason: string }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const sec = await securityCheck(request, "admin-api", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;
  const { userId } = await params;
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  let body: { active?: boolean; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.active !== "boolean") return NextResponse.json({ error: "active (boolean) is required" }, { status: 400 });
  if (!body.active && (!body.reason || !body.reason.trim())) {
    return NextResponse.json({ error: "reason is required for suspension" }, { status: 400 });
  }

  const result = await changeUserStatus(userId, body.active, body.reason ?? "", request);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
