/**
 * Server-side Supabase client — session-scoped.
 *
 * Imported from Server Components and Server Actions. This client carries
 * the calling user's session, so RLS policies apply as if the user queried
 * the database directly. Per TECHNICAL_ARCHITECTURE §7, RLS alone is
 * sufficient for: viewing own profile, viewing own bookings, viewing public
 * approved listings.
 *
 * For operations requiring business-rule-conditional authorization
 * (verification-status preconditions, status-transition preconditions),
 * the Server Action additionally performs explicit server-side checks —
 * RLS enforces *ownership*, not *business-rule-conditional* permissions.
 *
 * For privileged/admin operations requiring the service-role key, use
 * `src/server/supabase/privileged.ts` instead — never this client.
 */
import { createServerClient } from "@supabase/ssr";
import type { CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/config/env";

export async function createClient() {
  const cookieStore = await cookies();

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // The `setAll` method was called from a Server Component.
        // This can be ignored when using Server Components — middleware
        // refreshes the session. Supabase docs explicitly note this is
        // expected and safe.
      }
    },
  };

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: cookieMethods },
  );
}
