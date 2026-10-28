import { NextRequest, NextResponse } from "next/server";
import { changeUserRole } from "@/lib/supabase/admin-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * POST /api/admin/users/[userId]/role
 *
 * Change a user's role. The set_user_role RPC enforces:
 *   - Caller is super_admin
 *   - Caller cannot change their own role
 *   - Cannot demote the last active super_admin
 *
 * Body: { newRole: string, reason: string }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const sec = await securityCheck(request, "admin-api", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;
  const { userId } = await params;
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  let body: { newRole?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.newRole) return NextResponse.json({ error: "newRole is required" }, { status: 400 });
  if (!body.reason || !body.reason.trim()) return NextResponse.json({ error: "reason is required" }, { status: 400 });

  const result = await changeUserRole(userId, body.newRole, body.reason, request);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
