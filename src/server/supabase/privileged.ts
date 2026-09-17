/**
 * Privileged Supabase client — service-role.
 *
 * This module is the SINGLE entry point for the Supabase service-role key
 * in the entire codebase. It bypasses RLS entirely and is therefore the
 * most dangerous credential in the project.
 *
 * Hard rules — enforced by architecture, review, and the `server-only`
 * import guard below:
 *
 *   1. NEVER import this from a Client Component. The `server-only` package
 *      makes that import fail at build time, not just at runtime — this is
 *      the single most important line in this file.
 *
 *   2. NEVER expose `env.SUPABASE_SERVICE_ROLE_KEY` to the browser — it is
 *      not prefixed with NEXT_PUBLIC_, and `next.config.ts` does not allow
 *      its inlining. ESLint's `no-restricted-syntax` could additionally
 *      pin this down if needed in a later hardening pass.
 *
 *   3. Scope narrowly in code. The service-role client is intentionally
 *      powerful — call sites must use it for one specific privileged
 *      operation and nothing else. A future Phase 18 (Security Hardening)
 *      review pass audits each call site.
 *
 *   4. The service-role key NEVER writes `bookings.status = 'confirmed'` or
 *      `payment_transactions.status = 'success'` directly from anywhere
 *      except the atomic confirmation transaction in the webhook handler
 *      (Phase 9 — not yet implemented). This rule is restated in the
 *      comment on every privileged client call site as it is written.
 *
 * Per IMPLEMENTATION_PLAN §25, this key is server-only and must NEVER
 * be present in any client-bundled code or NEXT_PUBLIC_-prefixed variable.
 */
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

export function createPrivilegedClient() {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // The service-role client should never participate in user session
        // management — disable persistence to prevent accidental session
        // leakage in server-side code.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
