/**
 * Landlord row provisioning — Phase 4.
 *
 * Called by Phase 2's `registerLandlord` Server Action after the
 * `profiles` row is created. Creates the corresponding `landlords` row
 * with `current_verification_status = 'unsubmitted'`.
 *
 * Uses the PRIVILEGED (service-role) client because `landlords` has NO
 * INSERT RLS policy by design (Phase 4 migration 0005) — landlord rows
 * are created only at registration, never by direct client INSERT.
 *
 * The `landlords` row is created in the SAME logical operation as the
 * `profiles` row (Phase 2's provisionProfile + Phase 4's provisionLandlordRow).
 * If provisionLandlordRow fails, Phase 2's cleanupAuthUser deletes the
 * just-created auth.users row (which cascades to profiles + landlords).
 *
 * This module is testable (pure function taking the privileged client
 * as a parameter). The `server-only` guard is in `actions.ts` (the
 * wrapper that calls this function).
 */
import { internalError } from "@/errors";

/**
 * Loose-typed Supabase client interface (same pattern as Phase 2's auth core
 * and Phase 3's storage core — strict typing causes TS2589 infinite recursion
 * against Supabase's PostgrestBuilder).
 */
export interface SupabasePrivilegedClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
}

/**
 * Create the `landlords` row for a newly-registered landlord.
 *
 * Returns the created row. Throws `internalError` on failure — the caller
 * (Phase 2's registerLandlord) is responsible for cleanup (deleting the
 * auth.users row, which cascades).
 *
 * Per DATABASE_SCHEMA.md §4.2:
 *   - profile_id = the new landlord's profile id (= auth.users.id).
 *   - current_verification_status = 'unsubmitted' (default).
 *   - verification_valid_until = NULL (never approved yet).
 *   - is_suspended = false (default).
 *   - suspension_reason = NULL.
 */
export async function provisionLandlordRowCore(
  privileged: SupabasePrivilegedClient,
  params: { landlordId: string },
): Promise<void> {
  const { error } = await privileged
    .from("landlords")
    .insert({
      profile_id: params.landlordId,
      // current_verification_status defaults to 'unsubmitted' per the
      // migration. We don't set it explicitly — the default is the source
      // of truth for "newly registered".
      // verification_valid_until, is_suspended, suspension_reason all default.
    });

  if (error) {
    console.error("[netlodge] provisionLandlordRowCore: INSERT failed", {
      landlordId: params.landlordId,
    });
    throw internalError(
      "We couldn't complete your registration. Please try again.",
      { phase: "provisionLandlordRow", error },
    );
  }
}
