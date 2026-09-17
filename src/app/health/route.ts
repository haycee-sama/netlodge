import { NextResponse } from "next/server";

/**
 * Health-check endpoint.
 *
 * Phase 0 — verifies the Next.js Route Handler surface works and that the
 * environment configuration has the required server-only variables defined
 * (presence only, never the values). Used by the smoke test to confirm the
 * dev server starts and responds.
 *
 * Returns 503 if any required server-only variable is missing — this is a
 * deploy-time signal, not a runtime error.
 */
export async function GET() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "PAYSTACK_SECRET_KEY",
    "PAYSTACK_WEBHOOK_SECRET",
  ] as const;

  const missing = required.filter((name) => !process.env[name]);
  const ok = missing.length === 0;

  return NextResponse.json(
    {
      status: ok ? "ok" : "misconfigured",
      // Names only, never values. Safe to surface to the operator.
      missing_env: missing,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
