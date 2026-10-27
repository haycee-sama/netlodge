import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/paystack/server";

/**
 * POST /api/paystack/webhook
 *
 * Handles Paystack webhook events.
 *
 * Security:
 * - Verifies the webhook signature using HMAC-SHA512
 * - Rejects invalid signatures with 401
 * - Processes events idempotently (duplicate deliveries are safe)
 * - For 'charge.success': verifies the transaction with Paystack's API
 *   before updating booking/payment state
 * - For 'charge.failed': records the failure
 * - Returns 200 for processed events, 400 for invalid signatures
 *
 * The webhook URL must be configured in the Paystack Dashboard:
 * Settings → API Keys & Webhooks → Add Webhook URL
 * URL: https://your-domain.com/api/paystack/webhook
 */

export async function POST(request: NextRequest) {
  try {
    // Get the raw body and signature
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature") ?? "";

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // Verify the signature
    const webhookSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!webhookSecret) {
      console.error("[paystack/webhook] PAYSTACK_SECRET_KEY not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse the event
    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const txnData = event.data;

    if (!txnData || !txnData.reference) {
      return NextResponse.json({ error: "Invalid event data" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Find the payment record by reference
    const { data: payment, error: paymentError } = await adminClient
      .from("payments")
      .select("*")
      .eq("reference", txnData.reference)
      .single();

    if (paymentError || !payment) {
      // Payment not found — could be a test webhook or from another system
      console.log(`[paystack/webhook] Payment not found for reference: ${txnData.reference}`);
      return NextResponse.json({ status: "ok", message: "Payment not found" }, { status: 200 });
    }

    // IDEMPOTENCY: If payment is already confirmed as successful, skip
    if (payment.status === "successful" && payment.confirmed_by_backend) {
      console.log(`[paystack/webhook] Payment ${txnData.reference} already confirmed — skipping (idempotent)`);
      return NextResponse.json({ status: "ok", message: "Already processed" }, { status: 200 });
    }

    // Handle different event types
    if (eventType === "charge.success") {
      // Verify the transaction with Paystack's API (defense in depth)
      const verifyResult = await verifyTransaction(txnData.reference);

      if (!verifyResult.success || !verifyResult.data) {
        console.error(`[paystack/webhook] Verification failed for ${txnData.reference}:`, verifyResult.error);
        // Don't update state — wait for the next webhook or manual verification
        return NextResponse.json({ status: "ok", message: "Verification pending" }, { status: 200 });
      }

      const verified = verifyResult.data;

      // Validate amount
      if (verified.amount !== payment.amount_kobo) {
        console.error(`[paystack/webhook] Amount mismatch: expected ${payment.amount_kobo}, got ${verified.amount}`);
        await adminClient.from("payments").update({
          status: "failed",
          failure_reason: "Amount mismatch during webhook verification",
        }).eq("id", payment.id);
        return NextResponse.json({ status: "ok", message: "Amount mismatch" }, { status: 200 });
      }

      // Validate currency
      if (verified.currency !== payment.currency) {
        console.error(`[paystack/webhook] Currency mismatch: expected ${payment.currency}, got ${verified.currency}`);
        await adminClient.from("payments").update({
          status: "failed",
          failure_reason: "Currency mismatch",
        }).eq("id", payment.id);
        return NextResponse.json({ status: "ok", message: "Currency mismatch" }, { status: 200 });
      }

      // SUCCESS — update payment
      const { error: updatePaymentErr } = await adminClient.from("payments").update({
        status: "successful",
        confirmed_by_backend: true,
        confirmed_at: new Date().toISOString(),
        gateway_reference: verified.reference,
      }).eq("id", payment.id);

      if (updatePaymentErr) {
        console.error("[paystack/webhook] Failed to update payment:", updatePaymentErr.message);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }

      // Fetch the booking
      const { data: booking } = await adminClient
        .from("bookings")
        .select("id, status, total_kobo, paid_kobo, outstanding_kobo")
        .eq("id", payment.booking_id)
        .single();

      if (!booking) {
        console.error(`[paystack/webhook] Booking not found: ${payment.booking_id}`);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      // Check if booking is still valid
      if (["cancelled", "expired", "refunded"].includes(booking.status)) {
        // Payment succeeded but booking is invalid — needs reconciliation
        console.error(`[paystack/webhook] Booking ${booking.id} is ${booking.status} but payment succeeded. Needs reconciliation.`);
        // Don't confirm the booking — flag for manual review
        return NextResponse.json({ status: "ok", message: "Needs reconciliation" }, { status: 200 });
      }

      // IDEMPOTENCY: Check if booking is already confirmed
      if (booking.status === "confirmed" || booking.status === "active") {
        console.log(`[paystack/webhook] Booking ${booking.id} already confirmed — skipping`);
        return NextResponse.json({ status: "ok", message: "Already confirmed" }, { status: 200 });
      }

      // Update booking
      const newPaidKobo = booking.paid_kobo + payment.amount_kobo;
      const newOutstandingKobo = Math.max(0, booking.total_kobo - newPaidKobo);

      await adminClient.from("bookings").update({
        status: "confirmed",
        current_step: "booking_confirmation",
        paid_kobo: newPaidKobo,
        outstanding_kobo: newOutstandingKobo,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", booking.id);

      // Update room status
      await adminClient.from("rentable_units").update({
        status: "occupied",
        active_booking_id: booking.id,
        active_hold_id: null,
        updated_at: new Date().toISOString(),
      }).eq("active_hold_id", booking.id);

      // Record status history
      await adminClient.from("booking_status_history").insert({
        booking_id: booking.id,
        from_status: booking.status,
        to_status: "confirmed",
        reason: `Payment confirmed via Paystack webhook (ref: ${txnData.reference})`,
      });

      // Insert ledger entry
      await adminClient.from("ledger_entries").insert({
        entry_type: "payment",
        reference: payment.reference,
        booking_id: booking.id,
        payment_id: payment.id,
        credit_kobo: payment.amount_kobo,
        description: `Payment confirmed via Paystack webhook`,
      });

      console.log(`[paystack/webhook] Successfully processed charge.success for ${txnData.reference}`);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (eventType === "charge.failed") {
      await adminClient.from("payments").update({
        status: "failed",
        failure_reason: txnData.gateway_response || "Payment failed",
      }).eq("id", payment.id);

      console.log(`[paystack/webhook] Recorded charge.failed for ${txnData.reference}`);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Unhandled event type — acknowledge but don't process
    return NextResponse.json({ status: "ok", message: `Event ${eventType} not handled` }, { status: 200 });
  } catch (err) {
    console.error("[paystack/webhook] Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
