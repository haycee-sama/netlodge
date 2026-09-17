import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase Auth callback route.
 *
 * Phase 2 — handles email-confirmation and password-reset redirects from
 * Supabase Auth emails. The `code` query param is exchanged for a session,
 * which is then set in the HTTP-only cookie by Supabase SSR.
 *
 * After exchanging the code, the user is redirected to the `next` URL
 * (default: /dashboard) or to /login on failure.
 *
 * This is a Route Handler (not a Server Action) because Supabase Auth
 * redirects to it via HTTP — there's no same-origin browser context.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    // No code in the URL — invalid callback. Redirect to login.
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Don't leak the Supabase error — redirect to login with a generic message.
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", "auth_callback_failed");
    return NextResponse.redirect(loginUrl);
  }

  // Success — redirect to the next URL (or dashboard).
  return NextResponse.redirect(new URL(next, url.origin));
}
