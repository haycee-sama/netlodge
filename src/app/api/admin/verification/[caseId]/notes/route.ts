import { NextRequest, NextResponse } from "next/server";
import { addInternalNote } from "@/lib/supabase/admin-service";

/**
 * POST /api/admin/verification/[caseId]/notes
 *
 * Add an internal note to a verification case. Visible only to officers +
 * super admins (RLS enforces on internal_notes).
 *
 * Body: { message: string }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  if (!caseId) return NextResponse.json({ error: "caseId is required" }, { status: 400 });

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.message || !body.message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const result = await addInternalNote(caseId, body.message, request);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
