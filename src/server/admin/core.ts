/**
 * Admin operations core — testable pure functions for Phase 10.
 *
 * Implements:
 *   * `adminProperty.suspend` / `.liftSuspension` (API_CONTRACTS.md §8)
 *   * `adminBookings.list` (API_CONTRACTS.md §16)
 *   * `adminPayments.list` (API_CONTRACTS.md §16, includes providerMetadata)
 *   * `adminPayments.listWebhookEvents` (API_CONTRACTS.md §16)
 *
 * Verification approve/reject and property approve/reject are KEPT in their
 * existing modules (verification/core.ts and properties/core.ts) but have
 * been updated in Phase 10 to call the new SECURITY DEFINER atomic admin
 * mutation RPC functions (migration 0009). The atomic transaction ensures
 * the business mutation AND the audit log insert commit together or not
 * at all (IMPLEMENTATION_PLAN.md §17).
 *
 * CRITICAL SECURITY PROPERTIES:
 *
 *   1. Every mutation calls a SECURITY DEFINER plpgsql function
 *      (migration 0009) that independently validates the caller is an
 *      active admin via `netlodge_is_current_user_active_admin()`. A
 *      malicious user invoking the RPC directly via PostgREST without
 *      admin authorization is rejected by the function body itself —
 *      not by the application layer.
 *
 *   2. Actor identity is NEVER a function parameter. The RPC function
 *      derives `actor_id` from `auth.uid()` inside the DB transaction.
 *      A client-supplied `actorId` field in the request body is rejected
 *      by the Zod schema's `.strict()` mode.
 *
 *   3. Audit logging happens atomically with the mutation — no separate
 *      "perform action, then call logAudit()" code path that could fail
 *      between the two operations.
 *
 *   4. Admin reads (monitoring) use the session-scoped Supabase client
 *      (RLS applies). RLS on `bookings`/`payment_transactions`/
 *      `payment_webhook_events` allows admin full read access via
 *      `netlodge_is_current_user_admin()`.
 *
 *   5. Sensitive data boundaries:
 *        - `payment_transactions.provider_metadata` is included in admin
 *          reads (API_CONTRACTS.md §16 explicitly documents this).
 *        - `payment_webhook_events.raw_payload` is included.
 *        - Secret keys (PAYSTACK_SECRET_KEY, webhook secret) are NEVER
 *          exposed — they live only in server env vars.
 *        - Verification document contents are NEVER returned — only
 *          signed download URLs that admins must explicitly request.
 */
import {
  validationError,
  forbiddenError,
  notFoundError,
  conflictError,
  internalError,
} from "@/errors";
import type { AuthenticatedUser } from "@/lib/auth";
import { formatZodError } from "@/validation";
import {
  suspendPropertySchema,
  liftSuspensionPropertySchema,
  adminListBookingsSchema,
  adminListPaymentsSchema,
  adminListWebhookEventsSchema,
} from "@/lib/admin/schemas";
import type {
  AdminBookingRow,
  AdminPaymentRow,
  AdminWebhookEventRow,
  AdminListResult,
} from "@/lib/admin/schemas";

export type SupabaseDbClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(fn: string, params?: Record<string, unknown>): any;
};

// ── Helper: translate RPC errors to AppError ─────────────────────────────────

/**
 * Translate SECURITY DEFINER RPC error messages into the standardized
 * AppError model. The functions in migration 0009 raise specific PGCODE
 * errors that map cleanly to our error codes.
 *
 * - `insufficient_privilege` (42501) → forbidden
 * - `check_violation` (23514) → conflict (state-machine failure / missing reason)
 * - `foreign_key_violation` (23503) → not_found (entity doesn't exist)
 *
 * Used by `suspendPropertyCore` and `liftSuspensionPropertyCore`. The
 * `approvePropertyCore`/`rejectPropertyCore` in `properties/core.ts` inline
 * their own translation for finer-grained messages.
 */
function translateRpcError(
  err: { message?: string; code?: string } | undefined,
  fallbackMessage: string,
  fallbackPhase: string,
): never {
  if (!err) {
    throw internalError(fallbackMessage, { phase: fallbackPhase });
  }
  const msg = err.message ?? "";
  const code = err.code ?? "";

  if (
    code === "42501" ||
    msg.includes("insufficient_privilege") ||
    msg.includes("Only active admins")
  ) {
    throw forbiddenError("You do not have permission to do this.");
  }
  if (msg.includes("reason is required") || msg.includes("2000 characters")) {
    throw validationError("Invalid reason.", [
      { field: "reason", issue: msg },
    ]);
  }
  if (
    code === "23514" ||
    msg.includes("check_violation") ||
    msg.includes("already suspended") ||
    msg.includes("not currently suspended") ||
    msg.includes("Cannot suspend") ||
    msg.includes("Cannot lift")
  ) {
    throw conflictError(
      msg || "Invalid state transition.",
      "invalid_state_transition",
    );
  }
  if (code === "23503" || msg.includes("not found")) {
    throw notFoundError("The referenced record was not found.");
  }
  throw internalError(fallbackMessage, {
    phase: fallbackPhase,
    error: err,
  });
}

// ── Admin: suspend property ───────────────────────────────────────────────────

/**
 * `adminProperty.suspend` — API_CONTRACTS.md §8.
 *
 * Sets `properties.is_suspended = true` and `suspension_reason = $reason`.
 * Per the design comment in migration 0009, suspension is ORTHOGONAL to
 * property_status — the property's underlying status (approved, etc.)
 * is unchanged. Discovery + booking queries add `is_suspended = false`
 * as a filter, so suspended properties disappear from search immediately
 * and cannot be re-booked. Existing confirmed bookings remain honored
 * (PRD §19 — they are NOT cancelled by suspension).
 *
 * The atomic RPC function inserts the audit row in the same transaction.
 *
 * Note: `adminProperty.approve` and `adminProperty.reject` are implemented
 * in `src/server/properties/core.ts` (Phase 5 origin) and refactored in
 * Phase 10 to call the new SECURITY DEFINER RPC functions. They're
 * re-exported from `src/server/admin/index.ts` for convenience.
 */
export async function suspendPropertyCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can suspend properties.");
  }

  const parsed = suspendPropertySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid suspension.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  const { error } = await db.rpc("admin_suspend_property", {
    p_property_id: input.propertyId,
    p_reason: input.reason,
  });

  if (error) {
    translateRpcError(error, "Could not suspend property.", "suspendProperty");
  }

  // Phase 11 — dispatch suspension notification AFTER the RPC commits.
  try {
    const { data: property } = await db
      .from("properties")
      .select("landlord_id, area")
      .eq("id", input.propertyId)
      .maybeSingle();
    const { data: landlordProfile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", property?.landlord_id ?? "")
      .maybeSingle();

    if (property?.landlord_id) {
      const { dispatchNotification } = await import("@/server/notifications/core");
      await dispatchNotification({
        event: "property.suspended",
        recipientUserId: property.landlord_id,
        data: {
          landlordFullName: landlordProfile?.full_name ?? "Landlord",
          propertyArea: property.area ?? "",
          reason: input.reason,
        },
      }, { db });
    }
  } catch (err) {
    console.error("[netlodge] post-suspend notification dispatch failed", {
      propertyId: input.propertyId,
      error: err,
    });
  }
}

// ── Admin: lift suspension on property ────────────────────────────────────────

/**
 * `adminProperty.liftSuspension` — API_CONTRACTS.md §8.
 *
 * Reverses `adminProperty.suspend`. Requires a reason (per PRD §11 —
 * lifting a suspension is itself a trust decision and must be audited
 * with its own rationale).
 */
export async function liftSuspensionPropertyCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can lift property suspensions.");
  }

  const parsed = liftSuspensionPropertySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError(
      "Invalid lift-suspension request.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  const { error } = await db.rpc("admin_lift_suspension_property", {
    p_property_id: input.propertyId,
    p_reason: input.reason,
  });

  if (error) {
    translateRpcError(
      error,
      "Could not lift property suspension.",
      "liftSuspensionProperty",
    );
  }

  // Phase 11 — dispatch suspension-lifted notification AFTER the RPC commits.
  try {
    const { data: property } = await db
      .from("properties")
      .select("landlord_id, area")
      .eq("id", input.propertyId)
      .maybeSingle();
    const { data: landlordProfile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", property?.landlord_id ?? "")
      .maybeSingle();

    if (property?.landlord_id) {
      const { dispatchNotification } = await import("@/server/notifications/core");
      await dispatchNotification({
        event: "property.suspension_lifted",
        recipientUserId: property.landlord_id,
        data: {
          landlordFullName: landlordProfile?.full_name ?? "Landlord",
          propertyArea: property.area ?? "",
          reason: input.reason,
        },
      }, { db });
    }
  } catch (err) {
    console.error("[netlodge] post-lift-suspension notification dispatch failed", {
      propertyId: input.propertyId,
      error: err,
    });
  }
}

// ── Admin: list all bookings (monitoring, read-only) ──────────────────────────

/**
 * `adminBookings.list` — API_CONTRACTS.md §16.
 *
 * Returns ALL bookings (no ownership filter), optionally filtered by
 * status / propertyId / studentId. Read-only — no mutation contract.
 *
 * Authorization: caller must be an authenticated admin with an active
 * account. RLS on `bookings` allows admin full read access via
 * `netlodge_is_current_user_admin()`.
 */
export async function listBookingsAdminCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<AdminListResult<AdminBookingRow>> {
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can list all bookings.");
  }

  const parsed = adminListBookingsSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw validationError(
      "Invalid bookings query.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  let query = db
    .from("bookings")
    .select(
      `id, room_id, property_id, student_id, landlord_id, status, reserved_price,
       hold_expires_at, confirmed_at, cancelled_at, cancellation_reason,
       created_at, updated_at`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize - 1,
    );

  if (input.status) {
    query = query.eq("status", input.status);
  }
  if (input.propertyId) {
    query = query.eq("property_id", input.propertyId);
  }
  if (input.studentId) {
    query = query.eq("student_id", input.studentId);
  }

  const { data, error, count } = await query;

  if (error) {
    throw internalError("Could not retrieve bookings.", {
      phase: "listBookingsAdmin",
      error,
    });
  }

  const items: AdminBookingRow[] = (data ?? []).map((raw: unknown) => {
    const r = raw as {
      id: string;
      room_id: string;
      property_id: string;
      student_id: string;
      landlord_id: string;
      status: string;
      reserved_price: string;
      hold_expires_at: string;
      confirmed_at: string | null;
      cancelled_at: string | null;
      cancellation_reason: string | null;
      created_at: string;
      updated_at: string;
    };
    return {
      id: r.id,
      roomId: r.room_id,
      propertyId: r.property_id,
      studentId: r.student_id,
      landlordId: r.landlord_id,
      status: r.status,
      reservedPriceKobo: Math.round(parseFloat(r.reserved_price) * 100),
      holdExpiresAt: r.hold_expires_at,
      confirmedAt: r.confirmed_at,
      cancelledAt: r.cancelled_at,
      cancellationReason: r.cancellation_reason,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    totalCount: count ?? 0,
  };
}

// ── Admin: list all payment transactions (monitoring) ─────────────────────────

/**
 * `adminPayments.list` — API_CONTRACTS.md §16.
 *
 * Returns ALL payment_transactions including `provider_metadata` — this
 * field is admin-only per API_CONTRACTS.md §16 (the student-facing payment
 * read path explicitly excludes it; see Phase 9's getPaymentStatusCore).
 *
 * Authorization: caller must be an authenticated admin with an active
 * account.
 */
export async function listPaymentsAdminCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<AdminListResult<AdminPaymentRow>> {
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can list all payment transactions.");
  }

  const parsed = adminListPaymentsSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw validationError(
      "Invalid payments query.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  let query = db
    .from("payment_transactions")
    .select(
      `id, booking_id, paystack_reference, amount, currency, status,
       initiated_at, verified_at, failure_reason, provider_metadata,
       created_at, updated_at`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize - 1,
    );

  if (input.status) {
    query = query.eq("status", input.status);
  }
  if (input.bookingId) {
    query = query.eq("booking_id", input.bookingId);
  }

  const { data, error, count } = await query;

  if (error) {
    throw internalError("Could not retrieve payment transactions.", {
      phase: "listPaymentsAdmin",
      error,
    });
  }

  const items: AdminPaymentRow[] = (data ?? []).map((raw: unknown) => {
    const r = raw as {
      id: string;
      booking_id: string;
      paystack_reference: string;
      amount: string;
      currency: string;
      status: string;
      initiated_at: string;
      verified_at: string | null;
      failure_reason: string | null;
      provider_metadata: unknown;
      created_at: string;
      updated_at: string;
    };
    return {
      id: r.id,
      bookingId: r.booking_id,
      paystackReference: r.paystack_reference,
      amountKobo: Math.round(parseFloat(r.amount) * 100),
      currency: r.currency,
      status: r.status,
      initiatedAt: r.initiated_at,
      verifiedAt: r.verified_at,
      failureReason: r.failure_reason,
      providerMetadata: r.provider_metadata,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    totalCount: count ?? 0,
  };
}

// ── Admin: list webhook events (monitoring) ───────────────────────────────────

/**
 * Lists `payment_webhook_events` (API_CONTRACTS.md §16 — admin payment
 * monitoring includes webhook events).
 *
 * Read-only. The webhook events table has NO mutation contract — it's the
 * idempotency ledger for the webhook handler (Phase 9). Admins can read
 * it for investigation but cannot modify it.
 */
export async function listWebhookEventsAdminCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<AdminListResult<AdminWebhookEventRow>> {
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can list webhook events.");
  }

  const parsed = adminListWebhookEventsSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw validationError(
      "Invalid webhook events query.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  let query = db
    .from("payment_webhook_events")
    .select(
      `id, provider_event_id, paystack_reference, received_at, processed_at,
       processing_outcome, raw_payload`,
      { count: "exact" },
    )
    .order("received_at", { ascending: false })
    .range(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize - 1,
    );

  if (input.outcome) {
    query = query.eq("processing_outcome", input.outcome);
  }

  const { data, error, count } = await query;

  if (error) {
    throw internalError("Could not retrieve webhook events.", {
      phase: "listWebhookEventsAdmin",
      error,
    });
  }

  const items: AdminWebhookEventRow[] = (data ?? []).map((raw: unknown) => {
    const r = raw as {
      id: string;
      provider_event_id: string;
      paystack_reference: string | null;
      received_at: string;
      processed_at: string | null;
      processing_outcome: string | null;
      raw_payload: unknown;
    };
    return {
      id: r.id,
      providerEventId: r.provider_event_id,
      paystackReference: r.paystack_reference,
      receivedAt: r.received_at,
      processedAt: r.processed_at,
      processingOutcome: r.processing_outcome,
      rawPayload: r.raw_payload,
    };
  });

  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    totalCount: count ?? 0,
  };
}
