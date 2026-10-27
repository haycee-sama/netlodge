import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/supabase/storage-service";
import { securityCheck } from "@/lib/security/api-security";

/**
 * POST /api/uploads/property-image
 *
 * Upload a property image to the public property-images bucket.
 * Body: multipart/form-data with:
 *   - file: the image file (JPEG/PNG/WebP/GIF, max 5MB)
 *   - propertyId: the property ID (the landlord must own this property)
 *
 * Returns: { path, publicUrl }
 */
export async function POST(request: NextRequest) {
  const sec = await securityCheck(request, "upload-property-image", { capacity: 10, refillPerSecond: 0.5 });
  if (sec) return sec;

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = formData.get("file");

  if (!file || !(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });

  // propertyId is optional — if not provided (e.g. during property creation
  // before the property exists), the path is user-scoped. The caller can
  // later associate the storage_path with a property via property_images.
  const propertyId = (formData.get("propertyId") as string | null) || undefined;

  const buffer = await file.arrayBuffer();

  const result = await uploadFile(
    "property-images",
    { name: file.name, size: file.size, type: file.type, buffer },
    propertyId,
    request,
  );

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}
