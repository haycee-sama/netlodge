import { NextRequest, NextResponse } from "next/server";
import { fetchAdminUsers, type UserListFilters } from "@/lib/supabase/admin-service";

/**
 * GET /api/admin/users
 *
 * List all users (super_admin only). RLS on profiles + user_roles restricts
 * to admins. The service layer also enforces the role check.
 *
 * Query: q, role, active (all|active|suspended), page, pageSize
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const filters: UserListFilters = {
    q: sp.get("q") ?? undefined,
    role: sp.get("role") ?? undefined,
    active: sp.get("active") ?? "all",
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 20,
  };

  const result = await fetchAdminUsers(filters, request);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
