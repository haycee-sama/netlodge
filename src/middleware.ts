/**
 * Next.js middleware — refreshes the Supabase session on every request.
 *
 * Phase 2 — the only middleware-level concern at this phase is keeping
 * the Supabase session cookie fresh. Server Components and Server Actions
 * then read the session via `@/lib/supabase/server`'s `createClient()`.
 *
 * Per @supabase/ssr docs, the middleware should NOT perform route-level
 * authorization — that's the job of Server Components and Server Actions
 * (each independently re-checking auth via `requireAuthenticated()` etc.).
 * The middleware only refreshes the session.
 *
 * Auth-based route protection lives in the page/layout Server Components
 * themselves (e.g., `dashboard/layout.tsx` calls `getCurrentSession()` and
 * redirects to `/login` if null).
 */
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest): Promise<Response> {
  // NextRequest extends Request, so we can pass it directly.
  return await updateSession(request);
}

export const config = {
  // Run on all routes except Next internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|map)$).*)",
  ],
};
