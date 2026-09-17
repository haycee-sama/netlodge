/**
 * Server-side environment configuration for NetLodge.
 *
 * Phase 13 fix: env is now loaded LAZILY (on first access) instead of
 * eagerly at module-import time. This prevents build-time crashes when
 * Next.js collects page data for routes that import server-only modules
 * — the build environment doesn't have the real env vars, and the eager
 * `loadEnv()` call would throw, killing the entire build.
 *
 * At runtime (dev server or production), env vars are present and the
 * lazy loader works identically to the eager loader.
 */

type EnvShape = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PAYSTACK_SECRET_KEY: string;
  PAYSTACK_WEBHOOK_SECRET: string;
  EMAIL_PROVIDER_API_KEY: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM_ADDRESS: string;
  NODE_ENV: "development" | "production" | "test";
};

const REQUIRED: ReadonlyArray<keyof EnvShape> = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PAYSTACK_SECRET_KEY",
];

function loadEnv(): EnvShape {
  const missing: string[] = [];
  for (const name of REQUIRED) {
    if (!process.env[name]) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[netlodge] Missing required environment variables: ${missing.join(", ")}. ` +
        `Copy .env.example to .env.local and populate before running server code.`,
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY!,
    PAYSTACK_WEBHOOK_SECRET:
      process.env.PAYSTACK_WEBHOOK_SECRET ?? process.env.PAYSTACK_SECRET_KEY!,
    EMAIL_PROVIDER_API_KEY: process.env.EMAIL_PROVIDER_API_KEY ?? "",
    SMTP_HOST: process.env.SMTP_HOST ?? "",
    SMTP_PORT: process.env.SMTP_PORT ?? "587",
    SMTP_USER: process.env.SMTP_USER ?? "",
    SMTP_PASS: process.env.SMTP_PASS ?? "",
    SMTP_FROM_ADDRESS: process.env.SMTP_FROM_ADDRESS ?? "no-reply@netlodge.app",
    NODE_ENV: (process.env.NODE_ENV ?? "development") as EnvShape["NODE_ENV"],
  };
}

// ── Lazy proxy — defers loadEnv() until first property access ───────────────
//
// During `next build`, this module is imported by route handlers / server
// components for type-checking and page-data collection. At that point,
// process.env doesn't have the real values. The lazy proxy returns
// placeholder strings for build-time access, and loads the real env
// lazily at runtime when the server actually handles a request.
//
// This is the standard pattern for Next.js apps with server-only env vars.

let _env: EnvShape | null = null;

function getEnv(): EnvShape {
  if (_env) return _env;
  _env = loadEnv();
  return _env;
}

// During build (next build), process.env.NEXT_PHASE === 'phase-production-build'
// In that case, return placeholder env to avoid throwing.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

export const env: EnvShape = isBuildPhase
  ? new Proxy({} as EnvShape, {
      get() {
        return "";
      },
    })
  : new Proxy({} as EnvShape, {
      get(_target, prop: string) {
        return getEnv()[prop as keyof EnvShape];
      },
    });

export const isProduction = process.env.NODE_ENV === "production";
