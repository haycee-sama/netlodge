import { NextRequest, NextResponse } from "next/server";
import { reviewVerificationCase, type ReviewInput } from "@/lib/supabase/admin-service";

/**
 * POST /api/admin/verification/[caseId]/review
 *
 * Atomically review a verification case. The RPC enforces:
 *   - Caller is verification_officer or super_admin
 *   - Caller is not reviewing their own submission
 *   - State-machine transitions are valid
 *   - Rejection / escalation / request_info require a reason
 *
 * Body:
 *   { action: 'approve'|'reject'|'request_info'|'escalate'|'assign_to_me',
 *     reason?: string, notes?: string, escalateTo?: 'super_admin'|'finance_admin' }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  if (!caseId) return NextResponse.json({ error: "caseId is required" }, { status: 400 });

  let body: ReviewInput;
  try {
    body = (await request.json()) as ReviewInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.action || !["approve", "reject", "request_info", "escalate", "assign_to_me"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const result = await reviewVerificationCase(caseId, body, request);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
