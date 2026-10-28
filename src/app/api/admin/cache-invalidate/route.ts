import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { securityCheck } from "@/lib/security/api-security";

/**
 * POST /api/admin/cache-invalidate
 *
 * Securely invalidates public cache tags after a successful property/room
 * mutation. Only authenticated users with landlord+ roles can call this.
 *
 * Body: { tags: string[] }
 *
 * Allowed tags are restricted to a fixed set — clients cannot pass
 * arbitrary tags.
 */
const ALLOWED_TAGS = ["properties", "universities", "neighbourhoods", "units"];

export async function POST(request: NextRequest) {
  const sec = await securityCheck(request, "cache-invalidate", { capacity: 10, refillPerSecond: 0.5 });
  if (sec) return sec;

  // Authenticate
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify the user has a role that can modify properties (landlord or admin
  // roles that manage property data). Support staff and finance admins
  // should NOT be able to trigger property cache invalidation.
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const userRoles = (roles ?? []).map((r) => r.role as string);
  const allowed = userRoles.some((r) =>
    ["landlord", "property_manager", "super_admin", "verification_officer"].includes(r)
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse body
  let body: { tags?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const requestedTags = body.tags ?? [];
  if (!Array.isArray(requestedTags) || requestedTags.length === 0) {
    return NextResponse.json({ error: "tags array is required" }, { status: 400 });
  }

  // Filter to only allowed tags — never trust client-supplied tag names
  const validTags = requestedTags.filter((t) => ALLOWED_TAGS.includes(t));
  if (validTags.length === 0) {
    return NextResponse.json({ error: "No valid tags to invalidate" }, { status: 400 });
  }

  // Revalidate — Next.js 16 requires a cache-life profile as the second arg.
  // 'default' matches the profile used by unstable_cache in public-cache.ts.
  for (const tag of validTags) {
    revalidateTag(tag, "default");
  }

  return NextResponse.json({ invalidated: validTags });
}
