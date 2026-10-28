import { NextRequest, NextResponse } from "next/server";
import { fetchIntegrationsOverview } from "@/lib/supabase/admin-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * GET /api/admin/integrations
 *
 * Returns two arrays:
 *   - integrations: rows from the `integration_health` table (persisted status
 *     reported by heartbeat jobs or operators).
 *   - effective:    live "is this integration actually configured?" checks
 *     derived from environment variables at request time. We never reveal the
 *     configured values themselves; only whether each is set.
 *
 * super_admin only — enforced by fetchIntegrationsOverview.
 *
 * Read-only: no live calls to external providers are made. We do not perform
 * test charges, refunds, or transfers to verify connectivity.
 */
export async function GET(request: NextRequest) {
  const sec = await securityCheck(request, "admin-integrations", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  const result = await fetchIntegrationsOverview(request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
