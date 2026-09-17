import type { NextConfig } from "next";

/**
 * Next.js configuration for NetLodge.
 *
 * Phase 0 baseline. No experimental features, no rewrites — only what the
 * approved TECHNICAL_ARCHITECTURE.md stack requires. Server-side trusted
 * operations (Server Actions + Route Handlers) remain the sole mutation path.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Defensive: Paystack webhook route handler must receive the raw body so the
  // HMAC signature can be verified. Next.js Route Handlers expose the body via
  // `request.text()` for this purpose — no custom parser config required.
  experimental: {},
  // Server external packages: keep Supabase + Paystack server-only deps off the
  // webpack bundler so they resolve cleanly in Node runtime route handlers.
  serverExternalPackages: [
    "@supabase/supabase-js",
    "nodemailer",
    "pg",
    "@electric-sql/pglite",
  ],
};

export default nextConfig;
