import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl } from "@/lib/supabase/storage-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * POST /api/uploads/signed-url
 *
 * Generate a signed URL for viewing a private file.
 * Body: { bucket, path }
 *
 * Returns: { signedUrl }
 */
export async function POST(request: NextRequest) {
  const sec = securityCheck(request, "signed-url", { capacity: 30, refillPerSecond: 2 });
  if (sec) return sec;

  let body: { bucket?: string; path?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.bucket || !body.path) return NextResponse.json({ error: "bucket and path are required" }, { status: 400 });

  const result = await getSignedUrl(body.bucket, body.path, 3600, request);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
