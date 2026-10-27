import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/supabase/storage-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * POST /api/uploads/verification-evidence
 *
 * Upload verification evidence to the private verification-evidence bucket.
 * Body: multipart/form-data with:
 *   - file: the document (JPEG/PNG/PDF/WebP, max 10MB)
 *   - caseId (optional): the verification case ID
 *
 * Returns: { path, signedUrl } — the signed URL is valid for 1 hour.
 */
export async function POST(request: NextRequest) {
  const sec = await securityCheck(request, "upload-verification-evidence", { capacity: 10, refillPerSecond: 0.5 });
  if (sec) return sec;

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = formData.get("file");
  const caseId = formData.get("caseId") as string | null;

  if (!file || !(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });

  const buffer = await file.arrayBuffer();

  const result = await uploadFile(
    "verification-evidence",
    { name: file.name, size: file.size, type: file.type, buffer },
    caseId ?? undefined,
    request,
  );

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}
