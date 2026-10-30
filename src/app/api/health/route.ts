import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Production-safe health check endpoint.
 *
 * Returns:
 *   - status: "ok" | "degraded" | "error"
 *   - timestamp: ISO string
 *   - checks: { supabase: "ok" | "error", config: "ok" | "missing" }
 *   - version: package.json version
 *
 * Liveness: the server responding at all means it's alive.
 * Readiness: status === "ok" means Supabase is reachable + config is present.
 *
 * This endpoint:
 *   - Does NOT expose secrets, tokens, or connection strings
 *   - Does NOT make Paystack API calls
 *   - Does NOT perform writes or side effects
 *   - Uses short timeouts (3s) to avoid hanging on Vercel
 *   - Returns 503 when a critical dependency is unavailable
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const version = process.env.npm_package_version ?? "unknown";

  const checks: Record<string, string> = {};

  // Check 1: Required configuration (presence only, never values)
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const hasSecretKey = !!process.env.SUPABASE_SECRET_KEY;
  const hasPaystackKey = !!process.env.PAYSTACK_SECRET_KEY;

  checks.config = hasSupabaseUrl && hasSupabaseKey && hasSecretKey && hasPaystackKey
    ? "ok"
    : "missing";

  // Check 2: Supabase database connectivity (lightweight read-only query)
  let supabaseStatus = "ok";
  try {
    // Use a 3-second timeout via AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

    // Query the universities table (always seeded, small, public read)
    const res = await fetch(`${supabaseUrl}/rest/v1/universities?select=id&limit=1`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      supabaseStatus = "error";
    }
  } catch {
    supabaseStatus = "error";
  }
  checks.supabase = supabaseStatus;

  // Overall status
  const allOk = checks.config === "ok" && checks.supabase === "ok";
  const status = allOk ? "ok" : checks.config === "missing" ? "degraded" : "error";
  const httpStatus = allOk ? 200 : checks.supabase === "error" ? 503 : 200;

  // F-04: Return only a coarse status to anonymous callers. Detailed
  // component health (checks, timestamp, version) is withheld to avoid
  // disclosing the backend integration type and server time.
  return NextResponse.json(
    { status },
    { status: httpStatus },
  );
}
