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

      // KYC / Onboarding gate: after authentication, check if the user has
      // completed onboarding (profile_completed = true). If not, redirect to
      // the role-specific onboarding page before they can access any dashboard.
      if (user && isProtected) {
        // Allow access to the onboarding pages themselves (don't redirect from them)
        const onboardingPaths = ["/student/onboarding", "/landlord/onboarding", "/manager/onboarding", "/agent/onboarding"];
        const isOnboardingPage = onboardingPaths.some((p) => pathname.startsWith(p));
        // Allow access to settings (so they can update profile)
        const isSettingsPage = pathname.endsWith("/settings") || pathname.endsWith("/profile");

        if (!isOnboardingPage && !isSettingsPage) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("profile_completed")
              .eq("id", user.id)
              .single();

            if (profile && !profile.profile_completed) {
              // Determine onboarding route by role
              const { data: roles } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id);
              const role = (roles ?? [])[0]?.role ?? "student";
              const onboardingRoute = `/student/onboarding`;
              // Map role to onboarding route
              const routeMap: Record<string, string> = {
                student: "/student/onboarding",
                landlord: "/landlord/onboarding",
                property_manager: "/manager/onboarding",
                agent: "/agent/onboarding",
              };
              const targetRoute = routeMap[role] ?? "/student/onboarding";

              const url = request.nextUrl.clone();
              url.pathname = targetRoute;
              url.searchParams.set("redirect", pathname);
              return NextResponse.redirect(url);
            }
          } catch {
            // If profile check fails (DB unreachable), allow access — fail open
            // rather than locking users out of their dashboard.
          }
        }
      }
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

  // NOTE: We do NOT redirect authenticated users away from auth pages
  // in the middleware. This was previously done here but caused
  // "This page couldn't load" errors during client-side navigation
  // (RSC prefetch). When the router requests the RSC payload for
  // /login, a middleware redirect response confuses the router.
  // Instead, the client-side AuthProvider/LoginForm handles the
  // redirect smoothly after the page renders.
  //
  // The redirect param validation above still runs for security.

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
