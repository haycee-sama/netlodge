/**
 * Browser-side Supabase client.
 *
 * Imported from Client Components that genuinely need direct read access to
 * RLS-protected, user-scoped data (per TECHNICAL_ARCHITECTURE §4: "viewing own
 * profile", "viewing own bookings", "public approved listings" are safe under
 * RLS alone).
 *
 * NEVER use this client for:
 *   - Mutations on protected state (booking/payment status, verification
 *     decisions) — those are Server Actions only.
 *   - Anything that requires service-role privilege.
 *
 * The anon key is safe to bundle in the browser — Supabase's RLS, not key
 * secrecy, is the protection (IMPLEMENTATION_PLAN §25).
 */
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/config/env";

export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
