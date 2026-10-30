import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase session-refresh middleware.
 *
 * - Refreshes the user's Supabase auth session on every request.
 * - Protects dashboard routes — redirects to /login if no real session.
 * - Redirects authenticated users away from auth pages.
 *
 * There is no demo mode. All routes require a real Supabase Auth session.
 * If Supabase is unreachable, protected routes redirect to /login (fail
 * closed — never grant access on auth failure).
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  const protectedPaths = ["/student", "/landlord", "/manager", "/agent", "/admin"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  const authPaths = ["/login", "/register", "/forgot-password", "/reset-password"];
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  let supabaseResponse = NextResponse.next({ request });
  let user: { id: string } | null = null;

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
    // Supabase unreachable — user stays null. Protected routes will redirect to /login.
  }

  // Protect dashboard routes — redirect to login if no real session.
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // F-03: Server-side validation of the redirect parameter on auth pages.
  // The login page also validates client-side (startsWith("/") &&
  // !startsWith("//")), but this middleware check is defense-in-depth —
  // it strips invalid redirect values before the page even renders.
  if (isAuthPage) {
    const redirect = request.nextUrl.searchParams.get("redirect");
    if (redirect) {
      // Must be a relative path: starts with /, not // (protocol-relative),
      // not javascript:, not a data: URL, no backslash escapes.
      const isValid = redirect.startsWith("/")
        && !redirect.startsWith("//")
        && !redirect.toLowerCase().startsWith("javascript:")
        && !redirect.toLowerCase().startsWith("data:")
        && !redirect.includes("\\");
      if (!isValid) {
        const url = request.nextUrl.clone();
        url.searchParams.delete("redirect");
        return NextResponse.redirect(url);
      }
    }
  }

  // Redirect authenticated users away from auth pages.
  if (isAuthPage && user) {
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
