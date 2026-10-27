import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/supabase/storage-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * POST /api/uploads/ticket-attachment
 *
 * Upload an attachment to a support ticket. Private bucket.
 * Body: multipart/form-data with:
 *   - file: the attachment (JPEG/PNG/PDF/WebP/TXT, max 10MB)
 *   - ticketId: the ticket ID (the caller must own the ticket)
 *
 * Returns: { path, signedUrl }
 */
export async function POST(request: NextRequest) {
  const sec = securityCheck(request, "upload-ticket-attachment", { capacity: 10, refillPerSecond: 0.5 });
  if (sec) return sec;

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = formData.get("file");
  const ticketId = formData.get("ticketId") as string | null;

  if (!file || !(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!ticketId) return NextResponse.json({ error: "ticketId is required" }, { status: 400 });

  const buffer = await file.arrayBuffer();

  const result = await uploadFile(
    "ticket-attachments",
    { name: file.name, size: file.size, type: file.type, buffer },
    ticketId,
    request,
  );

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}
