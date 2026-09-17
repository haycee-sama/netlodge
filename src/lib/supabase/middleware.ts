/**
 * Supabase session-refresh middleware helper.
 *
 * Phase 2 — creates a Supabase server client configured to read/write
 * cookies via Next.js's `cookies()` API, suitable for use inside
 * middleware. The middleware itself lives at `src/middleware.ts` (project
 * root) and runs on every request — refreshing the session cookie before
 * the request reaches Server Components / Server Actions.
 *
 * Per @supabase/ssr docs: the middleware must call `supabase.auth.getSession()`
 * to trigger a token refresh if the access token is expired but the refresh
 * token is still valid. The refreshed session is then written back to the
 * cookie by `setAll()`.
 *
 * IMPORTANT: this client is created WITHOUT the `server-only` import guard
 * because middleware runs in the Next.js edge runtime (not the Node server
 * runtime), and `server-only` would fail at build time. It uses only
 * client-safe env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
 * — never the service-role key.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextResponse as NextResponseType } from "next/server";
import type { CookieMethodsServer } from "@supabase/ssr";
import { env } from "@/config/env";

/**
 * Refresh the Supabase session on every request. Called by `middleware.ts`
 * at the project root.
 *
 * @param request — the incoming Next.js request
 * @returns a NextResponse with refreshed cookies set
 */
export async function updateSession(
  request: Request,
): Promise<NextResponseType> {
  const response = NextResponse.next({ request });

  // Phase 13 — add standard security headers to every response.
  // These are safe headers that don't require knowledge of external
  // dependencies (Paystack, Supabase Auth) to configure correctly.
  //
  // NOT added here (require production testing):
  //   - Content-Security-Policy: too risky without testing against the real
  //     Paystack checkout widget + Supabase Auth redirect flow. Documented
  //     as a follow-up in the launch smoke-test plan.
  //   - Strict-Transport-Security: should only be set when HTTPS is confirmed
  //     active in production. Setting it on HTTP can cause issues in dev.
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      // Parse cookies from the request headers — middleware can't use
      // next/headers (that's only for Server Components/Route Handlers).
      const cookieHeader = request.headers.get("cookie") ?? "";
      return parseCookies(cookieHeader);
    },
    setAll(cookiesToSet) {
      // Set cookies on the response — middleware can write cookies via
      // NextResponse.cookies.
      try {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      } catch {
        // If set fails (e.g., middleware returned early), no-op.
      }
    },
  };

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: cookieMethods },
  );

  // IMPORTANT: this call triggers the session refresh. Even if the result
  // isn't used directly, DO NOT remove it — `getSession()` is what
  // refreshes the access token if it's expired.
  //
  // Wrap in try/catch — if Supabase is unreachable (network error, timeout),
  // we still return the response with security headers. The user will see
  // the unauthenticated version of the page rather than a crash.
  try {
    await supabase.auth.getSession();
  } catch {
    // Supabase unreachable — proceed without session refresh.
    // The page-level getCurrentSession() call will also handle this gracefully.
  }

  return response;
}

/**
 * Parse a cookie header string into an array of { name, value } objects.
 *
 * Standalone helper — middleware can't import `next/headers`, so we parse
 * the raw cookie header ourselves.
 */
function parseCookies(cookieHeader: string): Array<{ name: string; value: string }> {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(";")
    .map((pair) => pair.trim())
    .filter((pair) => pair.length > 0)
    .map((pair) => {
      const idx = pair.indexOf("=");
      if (idx === -1) return { name: pair, value: "" };
      return {
        name: pair.slice(0, idx).trim(),
        value: pair.slice(idx + 1).trim(),
      };
    });
}
