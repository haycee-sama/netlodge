import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase session-refresh middleware.
 *
 * - Refreshes the user's Supabase auth session on every request.
 * - Protects dashboard routes — redirects to /login if no session.
 * - Allows demo-mode access via a cookie set by the auth context.
 * - Redirects authenticated users away from auth pages.
 *
 * The middleware is wrapped in try-catch to prevent 500 errors if
 * Supabase is unreachable or env vars are missing. In that case,
 * requests are allowed through (demo-mode cookie still works).
 */
export async function middleware(request: NextRequest) {
  // Quick check: if this is a static file or API route, skip entirely.
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  // Check for demo-mode cookie (set by the auth context for UI preview)
  const hasDevSession = request.cookies.has("netlodge-dev-session");

  // Protected routes
  const protectedPaths = ["/student", "/landlord", "/manager", "/agent", "/admin"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  // Auth routes
  const authPaths = ["/login", "/register", "/forgot-password", "/reset-password"];
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  let supabaseResponse = NextResponse.next({ request });
  let user: { id: string } | null = null;

  // Try to refresh the Supabase session — if this fails, fall back gracefully.
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      });

      const result = await supabase.auth.getUser();
      user = result.data.user;
    }
  } catch {
    // Supabase unreachable or misconfigured — allow the request through.
    // RLS and client-side auth will handle protection.
  }

  // Protect dashboard routes — redirect to login if no session.
  // Admin routes (/admin) require a real Supabase session — demo-mode
  // cookies are NOT sufficient. This is defense-in-depth: the admin API
  // routes also reject demo users via server-side role checks.
  if (isProtected && !user) {
    // Allow demo-mode access to marketplace routes only (not /admin)
    if (pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    if (!hasDevSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages.
  if (isAuthPage && (user || hasDevSession)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.delete("redirect");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
