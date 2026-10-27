import { NextRequest, NextResponse } from "next/server";
import { fetchPlatformMetrics } from "@/lib/supabase/admin-service";

/**
 * GET /api/admin/metrics
 *
 * Returns aggregate platform metrics (super_admin only). The RPC enforces
 * the role check; RLS also restricts the underlying tables.
 */
export async function GET(request: NextRequest) {
  const result = await fetchPlatformMetrics(request);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
