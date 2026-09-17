/**
 * Vitest global setup.
 *
 * Phase 0 — minimal. Ensures `process.env.NODE_ENV` reads as `"test"` so the env
 * loader doesn't trip on missing real secrets during unit tests. Each test
 * that touches env-dependent code must construct its own fixture env.
 *
 * Phase 2 — additionally stubs the `server-only` package so test files can
 * import Server Components / Server Actions without the build-time guard
 * throwing. In production, `server-only` throws when imported from a
 * Client Component bundle (caught at build time by Next.js). In tests,
 * we're running in Node, not a browser bundle — so the guard is
 * unnecessary. The stub is a no-op module.
 *
 * Phase 3 — also sets placeholder values for the required env vars so
 * the env loader (`src/config/env.ts`) doesn't throw when imported by
 * storage modules. The placeholders are clearly-fake values that match
 * the `.env.local` convention. Tests that need to verify env-var-missing
 * behavior should override these per-test.
 *
 * Note: `process.env.NODE_ENV` is read-only in some TS lib.dom typings, so
 * we use `Object.defineProperty` to set it reliably across environments.
 */
import { vi } from "vitest";

// Stub `server-only` so tests can import server modules without the
// build-time guard throwing. The real package throws on import; the stub
// is a no-op. This does NOT weaken the production boundary — Next.js
// enforces `server-only` at build time, not runtime.
vi.mock("server-only", () => ({}));

// Also stub `next/headers` because some server modules import `cookies()`
// from it at module-load time. Tests that exercise those modules should
// mock the specific functions they need; this default stub prevents the
// import itself from throwing.
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: () => [],
      set: () => {},
    }),
  ),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

Object.defineProperty(process.env, "NODE_ENV", {
  value: "test",
  writable: true,
  configurable: true,
  enumerable: true,
});

// Phase 3: set placeholder env vars so the env loader doesn't throw when
// imported transitively (e.g., storage modules → config → env).
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ??= "pk_test_placeholder";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.PAYSTACK_SECRET_KEY ??= "sk_test_placeholder";
process.env.PAYSTACK_WEBHOOK_SECRET ??= "test-webhook-secret";
process.env.NEXT_PUBLIC_SITE_URL ??= "http://localhost:3000";
