import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

/**
 * Server-only admin Supabase client.
 *
 * Uses the SUPABASE_SECRET_KEY (service role) — this bypasses RLS.
 * NEVER import this in a client component or expose it via NEXT_PUBLIC_.
 *
 * Use ONLY for:
 *  - Running database migrations
 *  - Privileged administrative operations (user suspension, role changes)
 *  - Webhook verification
 *
 * All operations performed with this client MUST be independently authorized
 * in the calling server action.
 */

// This check ensures the module is never bundled into the browser.
// The secret key has no NEXT_PUBLIC_ prefix, so it's only available server-side.
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SECRET_KEY && process.env.NODE_ENV === "production") {
  console.warn(
    "[NetLodge] SUPABASE_SECRET_KEY is not set. Admin operations will fail.",
  );
}

export function createAdminClient() {
  if (!SECRET_KEY) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not available. Admin client can only be used server-side.",
    );
  }

  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
