import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/supabase/storage-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * POST /api/uploads/room-photo
 *
 * Upload a room (unit) photo to the public room-photos bucket.
 * Body: multipart/form-data with:
 *   - file: the image file (JPEG/PNG/WebP/GIF, max 5MB)
 *   - roomId: the rentable_units ID (the landlord must own the property)
 *
 * Returns: { path, publicUrl }
 *
 * Security: rate-limited, requires authenticated session (enforced by
 * the storage RLS policy — only authenticated users can upload to
 * room-photos). The caller should verify room ownership before calling.
 */
export async function POST(request: NextRequest) {
  const sec = await securityCheck(request, "upload-room-photo", { capacity: 20, refillPerSecond: 1 });
  if (sec) return sec;

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const roomId = (formData.get("roomId") as string | null) || undefined;
  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();

  const result = await uploadFile(
    "room-photos",
    { name: file.name, size: file.size, type: file.type, buffer },
    roomId,
    request,
  );

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}

/**
 * DELETE /api/uploads/room-photo
 *
 * Delete a room photo from storage and the unit_images table.
 * Query params: ?path=<storage_path>&imageId=<unit_images.id>
 *
 * Requires authenticated session (storage RLS enforces service_role only
 * for delete — this route uses the admin client to delete).
 */
export async function DELETE(request: NextRequest) {
  const sec = await securityCheck(request, "upload-room-photo", { capacity: 10, refillPerSecond: 0.5 });
  if (sec) return sec;

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  const imageId = searchParams.get("imageId");

  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  // Delete from storage
  const { deleteFile } = await import("@/lib/supabase/storage-service");
  const deleteResult = await deleteFile("room-photos", path);
  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error }, { status: deleteResult.status });
  }

  // Delete from unit_images table if imageId provided
  if (imageId) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    await admin.from("unit_images").delete().eq("id", imageId);
  }

  return NextResponse.json({ success: true });
}
