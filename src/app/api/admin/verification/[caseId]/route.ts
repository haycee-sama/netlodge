import { NextRequest, NextResponse } from "next/server";
import { fetchVerificationCaseDetail } from "@/lib/supabase/admin-service";

/**
 * GET /api/admin/verification/[caseId]
 *
 * Returns the full case detail (evidence, internal notes, audit logs, and
 * related property/landlord context).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  if (!caseId) return NextResponse.json({ error: "caseId is required" }, { status: 400 });

  const result = await fetchVerificationCaseDetail(caseId, request);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
