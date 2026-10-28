import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { securityCheck } from "@/lib/security/api-security";

/**
 * GET /api/admin/testimonials
 *
 * Returns all testimonials (any status) for the super admin review queue.
 * Super admin only — RLS enforces this on the database side too.
 *
 * Query: status (pending|approved|rejected|all), page, pageSize
 */
export async function GET(request: NextRequest) {
  const sec = await securityCheck(request, "admin-testimonials", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify super_admin role
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const userRoles = (roles ?? []).map((r: any) => r.role as string);
  if (!userRoles.includes("super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status") ?? "all";
  const page = sp.get("page") ? Number(sp.get("page")) : 1;
  const pageSize = Math.min(sp.get("pageSize") ? Number(sp.get("pageSize")) : 50, 200);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("testimonials")
    .select("*", { count: "exact" });

  if (status !== "all") query = query.eq("status", status);

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [], total: count ?? 0 });
}

/**
 * POST /api/admin/testimonials
 *
 * Create a testimonial directly (super admin can create on behalf of a user,
 * e.g. transcribing a phone review). The testimonial is created with
 * status='pending' by default — the admin must still approve it to publish.
 *
 * Body: { authorName, authorRole, authorUniversity?, authorLevel?, quote, rating? }
 */
export async function POST(request: NextRequest) {
  const sec = await securityCheck(request, "admin-testimonial-create", { capacity: 10, refillPerSecond: 0.5 });
  if (sec) return sec;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const userRoles = (roles ?? []).map((r: any) => r.role as string);
  if (!userRoles.includes("super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    authorName?: string;
    authorRole?: string;
    authorUniversity?: string;
    authorLevel?: string;
    quote?: string;
    rating?: number;
  };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.authorName?.trim() || !body.authorRole || !body.quote?.trim()) {
    return NextResponse.json({ error: "authorName, authorRole, and quote are required" }, { status: 400 });
  }

  if (!["student", "landlord", "parent", "staff"].includes(body.authorRole)) {
    return NextResponse.json({ error: "authorRole must be student, landlord, parent, or staff" }, { status: 400 });
  }

  if (body.rating !== undefined && body.rating !== null) {
    const r = Number(body.rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return NextResponse.json({ error: "rating must be an integer 1-5" }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("testimonials")
    .insert({
      author_name: body.authorName.trim(),
      author_role: body.authorRole,
      author_university: body.authorUniversity?.trim() || null,
      author_level: body.authorLevel?.trim() || null,
      quote: body.quote.trim(),
      rating: body.rating ?? null,
      status: "pending",
      published: false,
      submitted_by: user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
