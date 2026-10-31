import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { securityCheck } from "@/lib/security/api-security";

/**
 * POST /api/uploads/room-media
 *
 * Uploads a video or 360 panorama for a rentable unit. The landlord
 * selects the media type (video/panorama) and the file is stored in
 * the room-photos Supabase Storage bucket. A unit_images row is
 * inserted with the appropriate media_type, video_url/panorama_url.
 *
 * Body (multipart/form-data):
 *   - file: the video/panorama file (max 50MB for video, 20MB for panorama)
 *   - unitId: the rentable unit UUID
 *   - mediaType: "video" | "panorama"
 *   - altText: optional description
 *   - posterUrl: optional poster image URL (for video)
 */
export async function POST(request: NextRequest) {
  const sec = await securityCheck(request, "upload", { capacity: 3, refillPerSecond: 0.1, failClosed: true });
  if (sec) return sec;

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const unitId = formData.get("unitId") as string | null;
    const mediaType = formData.get("mediaType") as string | null;
    const altText = (formData.get("altText") as string | null) ?? "";
    const posterUrl = (formData.get("posterUrl") as string | null) ?? null;

    if (!file || !unitId || !mediaType) {
      return NextResponse.json({ error: "file, unitId, and mediaType are required" }, { status: 400 });
    }

    if (!["video", "panorama"].includes(mediaType)) {
      return NextResponse.json({ error: "mediaType must be 'video' or 'panorama'" }, { status: 400 });
    }

    // Size limits
    const maxBytes = mediaType === "video" ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({
        error: `File too large. Max ${mediaType === "video" ? "50MB" : "20MB"} for ${mediaType}.`,
      }, { status: 413 });
    }

    // Verify the user owns the property that contains this unit
    const { data: unit } = await supabase
      .from("rentable_units")
      .select("id, property_id, properties(landlord_id)")
      .eq("id", unitId)
      .single();

    if (!unit || (unit as any).properties?.landlord_id !== user.id) {
      // Also check if user is admin
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "super_admin");
      if (!isAdmin) {
        return NextResponse.json({ error: "Not authorized to upload media for this unit" }, { status: 403 });
      }
    }

    // Upload to Supabase Storage (room-photos bucket)
    const ext = file.name.split(".").pop()?.toLowerCase() ?? (mediaType === "video" ? "mp4" : "jpg");
    const fileName = `${unitId}/${mediaType}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("room-photos")
      .upload(fileName, file, {
        contentType: file.type || (mediaType === "video" ? "video/mp4" : "image/jpeg"),
        upsert: false,
      });

    if (uploadError) {
      console.error("[uploads/room-media] Storage error:", uploadError.message);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("room-photos").getPublicUrl(fileName);
    const mediaUrl = urlData.publicUrl;

    // Insert unit_images row with media_type
    const insertData: Record<string, unknown> = {
      unit_id: unitId,
      storage_path: fileName,
      public_url: posterUrl ?? (mediaType === "panorama" ? mediaUrl : null),
      alt_text: altText || `${mediaType} for unit`,
      position: 999, // appended to end
      media_type: mediaType,
    };

    if (mediaType === "video") {
      insertData.video_url = mediaUrl;
      if (posterUrl) insertData.public_url = posterUrl;
    } else {
      insertData.panorama_url = mediaUrl;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("unit_images")
      .insert(insertData)
      .select("id, media_type, video_url, panorama_url, public_url")
      .single();

    if (insertError) {
      console.error("[uploads/room-media] Insert error:", insertError.message);
      return NextResponse.json({ error: "Failed to create media record" }, { status: 500 });
    }

    return NextResponse.json({ success: true, media: inserted });
  } catch (err) {
    console.error("[uploads/room-media] Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
