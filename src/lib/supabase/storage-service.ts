/**
 * Storage service — secure file uploads via Supabase Storage.
 *
 * Buckets:
 *  - property-images (public read, authenticated upload, 5MB, image MIME types)
 *  - verification-evidence (private, uploader+officer read, 10MB, image+PDF)
 *  - ticket-attachments (private, owner+staff read, 10MB, image+PDF+text)
 *
 * All functions:
 *  1. Require an authenticated Supabase session.
 *  2. Validate file size + MIME type against the bucket's allowed list.
 *  3. Generate server-scoped storage paths (user_id/filename pattern).
 *  4. Issue short-lived signed URLs for private bucket reads.
 *
 * This module is server-only. Never import it from a client component.
 */

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null, status: 200 };
}
function err<T>(error: string, status: number): ServiceResult<T> {
  return { data: null, error, status };
}

interface SupabaseUserClient {
  auth: {
    getUser(accessToken?: string): Promise<{ data: { user: User | null }; error: unknown }>;
  };
  from(table: string): any;
  rpc(name: string, params?: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }>;
  storage: {
    from(bucket: string): {
      upload(path: string, body: Blob | ArrayBuffer | File, options?: { contentType?: string; upsert?: boolean }): Promise<{ data: { path: string } | null; error: { message: string } | null }>;
      createSignedUrl(path: string, expiresIn: number, options?: { download?: boolean }): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
      getPublicUrl(path: string): { data: { publicUrl: string } };
      remove(paths: string[]): Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };
}

async function createUserClient(request?: Request): Promise<SupabaseUserClient> {
  const authHeader = request?.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const accessToken = authHeader.slice(7);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const client = createSupabaseJsClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    return client as unknown as SupabaseUserClient;
  }
  return (await createServerClient()) as unknown as SupabaseUserClient;
}

async function requireAuth(request?: Request): Promise<{ user: User; supabase: SupabaseUserClient } | ServiceResult<never>> {
  const supabase = await createUserClient(request);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return err("Not authenticated", 401);
  return { user, supabase };
}

// ---------------------------------------------------------------------------
// Bucket configurations
// ---------------------------------------------------------------------------

const BUCKET_CONFIG: Record<string, {
  publicRead: boolean;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  pathPrefix: string;
}> = {
  "property-images": {
    publicRead: true,
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    pathPrefix: "properties",
  },
  "verification-evidence": {
    publicRead: false,
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf", "image/webp"],
    pathPrefix: "evidence",
  },
  "ticket-attachments": {
    publicRead: false,
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf", "image/webp", "text/plain"],
    pathPrefix: "tickets",
  },
};

function validateFile(bucket: string, file: { size: number; type: string }): string | null {
  const cfg = BUCKET_CONFIG[bucket];
  if (!cfg) return `Unknown bucket: ${bucket}`;
  if (file.size > cfg.maxSizeBytes) {
    return `File too large: ${file.size} bytes (max ${cfg.maxSizeBytes})`;
  }
  if (!cfg.allowedMimeTypes.includes(file.type)) {
    return `File type not allowed: ${file.type} (allowed: ${cfg.allowedMimeTypes.join(", ")})`;
  }
  return null;
}

function sanitizeFileName(name: string): string {
  // Keep only alphanumeric, dash, underscore, dot. Replace spaces with dash.
  return name.toLowerCase().replace(/[^a-z0-9.\-_/]/g, "-").replace(/-+/g, "-").slice(0, 100);
}

function generateStoragePath(bucket: string, userId: string, fileName: string, contextId?: string): string {
  const cfg = BUCKET_CONFIG[bucket];
  const safeName = sanitizeFileName(fileName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);

  if (bucket === "ticket-attachments" && contextId) {
    return `${cfg.pathPrefix}/${contextId}/${timestamp}-${random}-${safeName}`;
  }
  if (bucket === "verification-evidence" && contextId) {
    return `${cfg.pathPrefix}/${userId}/${contextId}/${timestamp}-${random}-${safeName}`;
  }
  if (bucket === "property-images" && contextId) {
    return `${cfg.pathPrefix}/${contextId}/${timestamp}-${random}-${safeName}`;
  }
  return `${cfg.pathPrefix}/${userId}/${timestamp}-${random}-${safeName}`;
}

// ---------------------------------------------------------------------------
// Upload operations
// ---------------------------------------------------------------------------

export interface UploadResult {
  path: string;
  publicUrl?: string;
  signedUrl?: string;
}

export async function uploadFile(
  bucket: string,
  file: { name: string; size: number; type: string; buffer: ArrayBuffer },
  contextId: string | undefined,
  request?: Request,
): Promise<ServiceResult<UploadResult>> {
  const authResult = await requireAuth(request);
  if ("status" in authResult) return authResult;
  const { user, supabase } = authResult;

  // Validate file
  const validationError = validateFile(bucket, { size: file.size, type: file.type });
  if (validationError) return err(validationError, 400);

  // Optimize images with Sharp before upload — resize to max 1600px wide,
  // convert to JPEG quality 80. This reduces file size by 60-80% for
  // phone photos without visible quality loss.
  let uploadBuffer: ArrayBuffer = file.buffer;
  let contentType = file.type;
  if (file.type.startsWith("image/")) {
    try {
      const sharp = (await import("sharp")).default;
      const processed = await sharp(Buffer.from(file.buffer))
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      uploadBuffer = processed.buffer.slice(processed.byteOffset, processed.byteOffset + processed.byteLength) as ArrayBuffer;
      contentType = "image/jpeg";
    } catch {
      // Sharp failed (e.g. GIF) — upload the original
      uploadBuffer = file.buffer;
    }
  }

  // Generate safe path
  const path = generateStoragePath(bucket, user.id, file.name, contextId);

  // Upload — the user's JWT authorizes this via the storage RLS policies
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, uploadBuffer, { contentType, upsert: false });

  if (error) {
    return err(`Upload failed: ${error.message}`, 500);
  }

  const cfg = BUCKET_CONFIG[bucket];
  const result: UploadResult = { path: data?.path ?? path };

  if (cfg.publicRead) {
    // For public buckets, return the public URL
    const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(path);
    result.publicUrl = pubData.publicUrl;
  } else {
    // For private buckets, return a short-lived signed URL (1 hour)
    const { data: signedData, error: signedErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);
    if (signedErr) {
      return err(`Upload succeeded but signed URL failed: ${signedErr.message}`, 500);
    }
    result.signedUrl = signedData?.signedUrl;
  }

  return ok(result);
}

// ---------------------------------------------------------------------------
// Signed URL generation (for viewing private files)
// ---------------------------------------------------------------------------

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600,
  request?: Request,
): Promise<ServiceResult<{ signedUrl: string }>> {
  const authResult = await requireAuth(request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  if (BUCKET_CONFIG[bucket]?.publicRead) {
    // Public bucket — return the public URL
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return ok({ signedUrl: data.publicUrl });
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) return err(`Failed to generate signed URL: ${error.message}`, 500);
  if (!data?.signedUrl) return err("No signed URL returned", 500);

  return ok({ signedUrl: data.signedUrl });
}

// ---------------------------------------------------------------------------
// Delete operation (for cleanup / orphan handling)
// ---------------------------------------------------------------------------

export async function deleteFile(
  bucket: string,
  path: string,
  request?: Request,
): Promise<ServiceResult<{ ok: true }>> {
  const authResult = await requireAuth(request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) return err(`Delete failed: ${error.message}`, 500);
  return ok({ ok: true });
}
