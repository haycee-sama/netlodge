import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { securityCheck } from "@/lib/security/api-security";

/**
 * POST /api/admin/testimonials/[testimonialId]/review
 *
 * Approve or reject a testimonial. Super admin only.
 * Approving sets status='approved' and published=true.
 * Rejecting sets status='rejected' and published=false.
 *
 * Body: { action: "approve" | "reject", reviewNotes?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ testimonialId: string }> },
) {
  const { testimonialId } = await params;
  if (!testimonialId) {
    return NextResponse.json({ error: "testimonialId is required" }, { status: 400 });
  }

  const sec = await securityCheck(request, "admin-testimonial-review", { capacity: 10, refillPerSecond: 0.5 });
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

  let body: { action?: string; reviewNotes?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.action || !["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("review_testimonial", {
    p_testimonial_id: testimonialId,
    p_action: body.action,
    p_review_notes: body.reviewNotes ?? null,
    p_actor_email: null,
  });

  if (error) {
    if (error.message.includes("Not authenticated")) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error.message.includes("Not authorized")) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.message.includes("not found")) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ action: String(data) });
}
