import { NextRequest, NextResponse } from "next/server";
import { fetchPlatformSettings } from "@/lib/supabase/admin-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * GET /api/admin/settings
 *
 * Returns all rows from platform_settings. Sensitive values (any key matching
 * /secret|password|token|key|sk_live|sk_test/i) are masked server-side before
 * being returned. super_admin only — enforced by fetchPlatformSettings.
 *
 * Read-only: no POST/PATCH endpoints exist. Settings mutations require an
 * audited, reauthenticated workflow that does not yet exist.
 */
export async function GET(request: NextRequest) {
  const sec = await securityCheck(request, "admin-settings", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const result = await fetchPlatformSettings(request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
