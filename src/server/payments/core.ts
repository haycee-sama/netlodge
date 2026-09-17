/**
 * Payment core — testable pure functions for payment operations.
 *
 * Phase 9 — implements `payments.initiate`, `payments.getStatus`,
 * and the webhook processing pipeline per API_CONTRACTS.md §11 +
 * TECHNICAL_ARCHITECTURE.md §16-18.
 *
 * CRITICAL SECURITY PROPERTIES:
 *
 *   1. Amount is NEVER accepted from the client. The server loads
 *      `bookings.reserved_price` (a snapshot of the room's price at
 *      reservation time) and converts it to kobo. A client attempting
 *      to pass an `amount` field receives a `validation_error`.
 *
 *   2. The Paystack reference is server-generated, never client-supplied.
 *      Format: `netlodge-{bookingId}-{timestamp}-{random}`.
 *
 *   3. Payment confirmation is exclusively webhook-driven. The only code
 *      path that sets `payment_transactions.status = 'success'` and
 *      `bookings.status = 'confirmed'` is the `confirmPaymentCore` function,
 *      called by the webhook handler AFTER independent Paystack verification.
 *
 *   4. Idempotency: the `payment_webhook_events.provider_event_id` UNIQUE
 *      constraint is the race-safe gate. Duplicate webhook deliveries
 *      fail at INSERT time, not via "check then act" application logic.
 *
 *   5. Amount verification: the webhook handler compares the
 *      independently-verified Paystack amount with the
 *      `payment_transactions.amount` (which was set from
 *      `bookings.reserved_price`). A mismatch means the payment is
 *      for the wrong amount — rejected.
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
import { initiatePaymentSchema, getPaymentStatusSchema } from "@/lib/payments/schemas";
import type {
  InitiatePaymentResult,
  PaymentStatusResult,
} from "@/lib/payments/schemas";
import { randomUUID } from "node:crypto";

// ── Types ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseDbClient = { from(table: string): any; rpc(fn: string, params?: Record<string, unknown>): any };

export interface PaystackAdapter {
  initializeTransaction(params: {
    email: string;
    amountKobo: number;
    reference: string;
    currency?: string;
    callbackUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  }>;

  verifyTransaction(params: {
    reference: string;
  }): Promise<{
    status: string;
    reference: string;
    amount: number; // kobo
    currency: string;
    transactionId: number;
    gatewayResponse: string | null;
    paidAt: string | null;
    channel: string | null;
    providerMetadata: Record<string, unknown>;
  }>;
}

export interface WebhookProcessingResult {
  outcome: "confirmed" | "duplicate_ignored" | "verification_failed" | "reconciliation_needed" | "malformed_payload";
  reference: string | null;
}

// ── Amount derivation (isolated, unit-testable) ────────────────────────────

/**
 * Derive the Paystack amount (in kobo) from a booking's reserved_price.
 *
 * Per API_CONTRACTS.md §2: "Monetary amounts: minor units (kobo),
 * represented as integers. ₦50,000 is represented as 5000000 (kobo)."
 *
 * The database stores `bookings.reserved_price` as `numeric(12,2)` in naira.
 * The API layer converts to kobo at the boundary by multiplying by 100
 * and rounding to the nearest integer.
 *
 * This function is isolated specifically so "client cannot influence amount"
 * is provable in isolation, not just by inspection (IMPLEMENTATION_PLAN.md §12).
 */
export function deriveAmountKobo(reservedPriceNaira: string | number): number {
  const naira = typeof reservedPriceNaira === "string"
    ? parseFloat(reservedPriceNaira)
    : reservedPriceNaira;
  return Math.round(naira * 100);
}

// ── Initiate payment ────────────────────────────────────────────────────────

/**
 * `payments.initiate` — API_CONTRACTS.md §11.
 *
 * Flow:
 *   1. Authenticate student (done by actions wrapper).
 *   2. Verify booking ownership + status = reservation_pending.
 *   3. Verify hold hasn't expired.
 *   4. Derive amount from bookings.reserved_price (kobo).
 *   5. Generate server-side Paystack reference.
 *   6. Create payment_transactions row (status = 'initiated').
 *   7. Move booking to payment_pending.
 *   8. Call Paystack initialize API.
 *   9. Return authorization URL.
 *
 * Double-click protection: if the booking is already payment_pending,
 * return `conflict`/`already_in_payment` rather than creating a second
 * payment_transactions row.
 */
export async function initiatePaymentCore(
  db: SupabaseDbClient,
  paystack: PaystackAdapter,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<InitiatePaymentResult> {
  if (user.profile.role !== "student") {
    throw forbiddenError("Only students can initiate payments.");
  }
  if (user.profile.accountStatus === "suspended") {
    throw forbiddenError("Your account is suspended.");
  }

  const parsed = initiatePaymentSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid payment input.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // 1. Load booking — RLS enforces student can only see own bookings.
  const { data: booking, error: bookingErr } = await db
    .from("bookings")
    .select("id, student_id, status, reserved_price, hold_expires_at")
    .eq("id", input.bookingId)
    .maybeSingle();

  if (bookingErr) {
    throw internalError("Could not retrieve booking.", { phase: "initiatePayment.bookingLookup", error: bookingErr });
  }

  if (!booking) {
    throw notFoundError("Booking not found.");
  }

  // 2. Verify ownership.
  if (booking.student_id !== user.id) {
    throw notFoundError("Booking not found.");
  }

  // 3. Check booking status.
  if (booking.status === "payment_pending") {
    throw conflictError("Payment is already in progress for this booking.", "already_in_payment");
  }
  if (booking.status === "confirmed") {
    throw conflictError("This booking is already confirmed.", "already_confirmed");
  }
  if (booking.status === "expired") {
    throw conflictError("This booking has expired.", "reservation_expired");
  }
  if (booking.status !== "reservation_pending") {
    throw conflictError(`Cannot initiate payment for booking in status: ${booking.status}.`, "invalid_state");
  }

  // 4. Check hold hasn't expired.
  const now = new Date();
  const holdExpires = new Date(booking.hold_expires_at);
  if (holdExpires <= now) {
    throw conflictError("The reservation hold has expired.", "reservation_expired");
  }

  // 5. Derive amount from reserved_price (server-authoritative).
  const amountKobo = deriveAmountKobo(booking.reserved_price);

  // 6. Generate server-side Paystack reference.
  const paystackReference = `netlodge-${booking.id}-${Date.now()}-${randomUUID().slice(0, 8)}`;

  // 7. Create payment_transactions row + move booking to payment_pending.
  // Using the privileged client (service-role) to bypass RLS for these writes.
  // The state-machine trigger allows reservation_pending → payment_pending
  // only for service-role (auth.uid() IS NULL).
  const { error: paymentErr } = await db
    .from("payment_transactions")
    .insert({
      booking_id: booking.id,
      paystack_reference: paystackReference,
      amount: booking.reserved_price, // stored in naira in the DB
      currency: "NGN",
      status: "initiated",
    });

  if (paymentErr) {
    throw internalError("Could not create payment transaction.", { phase: "initiatePayment.paymentInsert", error: paymentErr });
  }

  // 8. Move booking to payment_pending.
  const { error: bookingUpdateErr } = await db
    .from("bookings")
    .update({ status: "payment_pending" })
    .eq("id", booking.id);

  if (bookingUpdateErr) {
    // The payment_transactions row was created but the booking wasn't updated.
    // This is a recoverable state — the payment_transactions row exists with
    // status='initiated' and the booking is still reservation_pending.
    // The student can retry, or the expiry job will eventually clean up.
    throw internalError("Could not update booking status.", { phase: "initiatePayment.bookingUpdate", error: bookingUpdateErr });
  }

  // 9. Call Paystack initialize API.
  let paystackResult;
  try {
    paystackResult = await paystack.initializeTransaction({
      email: user.email,
      amountKobo,
      reference: paystackReference,
      currency: "NGN",
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/bookings/${booking.id}`,
      metadata: {
        booking_id: booking.id,
        custom_fields: [
          { display_name: "Booking ID", variable_name: "booking_id", value: booking.id },
        ],
      },
    });
  } catch (err) {
    // Paystack init failed. The payment_transactions row exists with
    // status='initiated' and the booking is payment_pending.
    // The student can retry or the booking will expire.
    throw internalError(
      "Could not initialize payment with Paystack. Please try again.",
      { phase: "initiatePayment.paystackInit", error: err },
    );
  }

  // 10. Update payment_transactions to pending (Paystack transaction created).
  const { error: updatePaymentErr } = await db
    .from("payment_transactions")
    .update({ status: "pending" })
    .eq("paystack_reference", paystackReference);

  if (updatePaymentErr) {
    // Non-fatal — the payment_transactions row is still at 'initiated',
    // but the Paystack transaction was created. The webhook will still
    // work because it looks up by reference.
    console.error("[netlodge] Failed to update payment status to pending", { reference: paystackReference });
  }

  return {
    paymentTransactionId: paystackReference, // we don't have the UUID here without a SELECT
    paystackReference,
    authorizationUrl: paystackResult.authorizationUrl,
    amountKobo,
    currency: "NGN",
  };
}

// ── Get payment status ─────────────────────────────────────────────────────

/**
 * `payments.getStatus` — API_CONTRACTS.md §11.
 *
 * Returns the current derived payment/booking status for client-side polling.
 * Read-only — has ZERO write authority.
 */
export async function getPaymentStatusCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<PaymentStatusResult> {
  const parsed = getPaymentStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid status request.", formatZodError(parsed.error));
  }

  // RLS enforces: student sees own bookings only.
  const { data: booking, error: bookingErr } = await db
    .from("bookings")
    .select("id, status, student_id, reserved_price")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (bookingErr || !booking) {
    throw notFoundError("Booking not found.");
  }

  if (booking.student_id !== user.id) {
    throw notFoundError("Booking not found.");
  }

  // Load the latest payment_transactions row for this booking.
  const { data: payment, error: paymentErr } = await db
    .from("payment_transactions")
    .select("status, paystack_reference, amount, currency")
    .eq("booking_id", parsed.data.bookingId)
    .order("initiated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentErr) {
    throw internalError("Could not retrieve payment status.", { phase: "getPaymentStatus", error: paymentErr });
  }

  return {
    bookingId: booking.id,
    bookingStatus: booking.status,
    paymentStatus: payment?.status ?? null,
    paystackReference: payment?.paystack_reference ?? null,
    amountKobo: payment ? deriveAmountKobo(payment.amount) : null,
    currency: payment?.currency ?? null,
  };
}

// ── Process webhook ────────────────────────────────────────────────────────

/**
 * Process a Paystack webhook event.
 *
 * This is the core of the webhook processing pipeline, called by the
 * webhook Route Handler after signature verification.
 *
 * Steps (per TECHNICAL_ARCHITECTURE.md §18):
 *   1. Parse payload (already signature-verified).
 *   2. Insert into payment_webhook_events (idempotency gate — UNIQUE on provider_event_id).
 *   3. If duplicate → return duplicate_ignored.
 *   4. For charge.success: independently verify with Paystack.
 *   5. If verification confirms success:
 *      a. Compare amount (Paystack amount vs payment_transactions.amount).
 *      b. If amount matches → run atomic confirmation function.
 *      c. Update webhook event to 'confirmed'.
 *   6. If verification fails → update webhook event to 'verification_failed'.
 *   7. If booking already expired → update webhook event to 'reconciliation_needed'.
 */
export async function processWebhookCore(
  db: SupabaseDbClient,
  paystack: PaystackAdapter,
  payload: {
    event: string;
    data: {
      id: number;
      reference: string;
      amount: number; // kobo
      currency: string;
      status: string;
      paid_at?: string | null;
      created_at: string;
      channel?: string | null;
      gateway_response?: string | null;
      domain?: string;
    };
  },
): Promise<WebhookProcessingResult> {
  const reference = payload.data.reference;
  const eventType = payload.event;

  // 1. Generate provider_event_id — Paystack uses the event data ID + event type.
  const providerEventId = `${payload.data.id}-${eventType}`;

  // 2. Idempotency gate — INSERT into payment_webhook_events.
  // If this fails on UNIQUE constraint, it's a duplicate delivery.
  const { error: insertErr } = await db
    .from("payment_webhook_events")
    .insert({
      provider_event_id: providerEventId,
      paystack_reference: reference,
      event_type: eventType,
      raw_payload: payload,
    });

  if (insertErr) {
    // Duplicate delivery — return 200 OK so Paystack stops retrying.
    const msg = (insertErr.message ?? "").toLowerCase();
    if (msg.includes("unique constraint") || msg.includes("duplicate")) {
      return { outcome: "duplicate_ignored", reference };
    }
    // Some other error — log and return failure.
    console.error("[netlodge] Webhook event insert failed", { reference, error: insertErr.message });
    throw internalError("Could not persist webhook event.", { phase: "processWebhook.insert", error: insertErr });
  }

  // 3. Only process charge.success events.
  if (eventType !== "charge.success") {
    // Non-charge.success events are logged but no action taken.
    await db
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_outcome: "duplicate_ignored" })
      .eq("provider_event_id", providerEventId);

    return { outcome: "duplicate_ignored", reference };
  }

  // 4. Independently verify the transaction with Paystack.
  let verification;
  try {
    verification = await paystack.verifyTransaction({ reference });
  } catch (err) {
    // Paystack verification API failed — don't confirm anything.
    await db
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_outcome: "verification_failed" })
      .eq("provider_event_id", providerEventId);

    console.error("[netlodge] Paystack verification failed", { reference, error: err });
    return { outcome: "verification_failed", reference };
  }

  // 5. Verify the Paystack status is "success".
  if (verification.status !== "success") {
    await db
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_outcome: "verification_failed" })
      .eq("provider_event_id", providerEventId);

    return { outcome: "verification_failed", reference };
  }

  // 6. Load the payment_transactions row.
  const { data: payment, error: paymentErr } = await db
    .from("payment_transactions")
    .select("id, booking_id, amount, status, paystack_reference")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (paymentErr || !payment) {
    // Payment transaction not found — this could be a webhook for a payment
    // that we don't have a record of (rare edge case).
    await db
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_outcome: "verification_failed" })
      .eq("provider_event_id", providerEventId);

    console.error("[netlodge] Payment transaction not found for webhook", { reference });
    return { outcome: "verification_failed", reference };
  }

  // 7. Verify the booking is still in payment_pending state.
  const { data: booking, error: bookingErr } = await db
    .from("bookings")
    .select("id, status")
    .eq("id", payment.booking_id)
    .maybeSingle();

  if (bookingErr || !booking) {
    await db
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_outcome: "verification_failed" })
      .eq("provider_event_id", providerEventId);

    return { outcome: "verification_failed", reference };
  }

  if (booking.status === "expired") {
    // Late webhook after expiry — reconciliation case.
    await db
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_outcome: "reconciliation_needed" })
      .eq("provider_event_id", providerEventId);

    return { outcome: "reconciliation_needed", reference };
  }

  if (booking.status === "confirmed") {
    // Already confirmed — duplicate confirmation attempt. No-op.
    await db
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_outcome: "duplicate_ignored" })
      .eq("provider_event_id", providerEventId);

    return { outcome: "duplicate_ignored", reference };
  }

  if (booking.status !== "payment_pending") {
    // Booking is in an unexpected state.
    await db
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_outcome: "verification_failed" })
      .eq("provider_event_id", providerEventId);

    return { outcome: "verification_failed", reference };
  }

  // 8. CRITICAL: Compare the Paystack-verified amount with the
  //    payment_transactions.amount (which was derived from
  //    bookings.reserved_price). A mismatch means the payment
  //    is for the wrong amount — reject.
  const expectedAmountKobo = deriveAmountKobo(payment.amount);

  if (verification.amount !== expectedAmountKobo) {
    // Amount mismatch — potential tampering or Paystack error.
    await db
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_outcome: "verification_failed" })
      .eq("provider_event_id", providerEventId);

    console.error("[netlodge] Amount mismatch in webhook", {
      reference,
      expected: expectedAmountKobo,
      actual: verification.amount,
    });
    return { outcome: "verification_failed", reference };
  }

  // 9. Verify currency.
  if (verification.currency !== "NGN") {
    await db
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_outcome: "verification_failed" })
      .eq("provider_event_id", providerEventId);

    return { outcome: "verification_failed", reference };
  }

  // 10. Run the atomic confirmation transaction.
  // This calls the `confirm_booking_payment` SECURITY DEFINER function
  // which updates both payment_transactions.status = 'success' and
  // bookings.status = 'confirmed' in a single DB transaction.
  try {
    await db.rpc("confirm_booking_payment", {
      p_payment_transaction_id: payment.id,
      p_paystack_reference: reference,
      p_provider_metadata: verification.providerMetadata,
    });
  } catch (err) {
    // The confirmation transaction failed — could be a race condition
    // (booking was expired/cancelled between our check and the RPC call)
    // or a DB error.
    await db
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_outcome: "verification_failed" })
      .eq("provider_event_id", providerEventId);

    console.error("[netlodge] Atomic confirmation failed", { reference, error: err });
    return { outcome: "verification_failed", reference };
  }

  // 11. Update webhook event to 'confirmed'.
  await db
    .from("payment_webhook_events")
    .update({ processed_at: new Date().toISOString(), processing_outcome: "confirmed" })
    .eq("provider_event_id", providerEventId);

  // 12. Phase 11 — dispatch payment-success notifications AFTER the
  //     confirmation transaction commits. The webhook handler has already
  //     durably set bookings.status='confirmed' AND
  //     payment_transactions.status='success' via the atomic RPC. A
  //     failure here MUST NOT affect that committed state.
  //
  //     Recipients:
  //       - student (booking.student_id) — payment.success.student
  //       - landlord (booking.landlord_id) — payment.success.landlord
  //     Both emails are mandatory per PRD §15 / IMPLEMENTATION_PLAN.md §16.
  try {
    const { data: bookingDetails } = await db
      .from("bookings")
      .select(
        `id, student_id, landlord_id, reserved_price,
         rooms ( property_id, properties ( area ) )`,
      )
      .eq("id", payment.booking_id)
      .maybeSingle();

    if (bookingDetails) {
      const b = bookingDetails as {
        id: string;
        student_id: string;
        landlord_id: string;
        reserved_price: string;
        rooms?: { properties?: { area?: string } };
      };
      const propertyArea = b.rooms?.properties?.area ?? "";
      const amountNaira = b.reserved_price;

      // Look up names.
      const [studentProfile, landlordProfile] = await Promise.all([
        db.from("profiles").select("full_name").eq("id", b.student_id).maybeSingle(),
        db.from("profiles").select("full_name").eq("id", b.landlord_id).maybeSingle(),
      ]);

      const { dispatchNotification } = await import("@/server/notifications/core");

      // Student — payment confirmation.
      await dispatchNotification({
        event: "payment.success.student",
        recipientUserId: b.student_id,
        data: {
          studentFullName:
            (studentProfile.data as { full_name?: string } | null)?.full_name ??
            "Student",
          amountNaira,
          propertyArea,
          bookingId: b.id,
        },
      }, { db });

      // Landlord — reservation received.
      await dispatchNotification({
        event: "payment.success.landlord",
        recipientUserId: b.landlord_id,
        data: {
          landlordFullName:
            (landlordProfile.data as { full_name?: string } | null)?.full_name ??
            "Landlord",
          studentFullName:
            (studentProfile.data as { full_name?: string } | null)?.full_name ??
            "Student",
          amountNaira,
          propertyArea,
          bookingId: b.id,
        },
      }, { db });
    }
  } catch (err) {
    // CRITICAL: the booking is already confirmed + payment already 'success'.
    // A notification failure here is logged but MUST NOT affect the
    // confirmation outcome returned to the webhook handler — the webhook
    // returns 200 OK to Paystack regardless.
    console.error("[netlodge] post-payment-success notification dispatch failed", {
      reference,
      error: err,
    });
  }

  return { outcome: "confirmed", reference };
}
