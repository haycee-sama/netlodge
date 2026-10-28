import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/paystack/server";

/**
 * POST /api/paystack/webhook
 *
 * Handles Paystack webhook events.
 *
 * Security:
 * - Verifies the webhook signature using HMAC-SHA512 (the same
 *   PAYSTACK_SECRET_KEY used for API calls) with a timing-safe comparison
 * - Rejects invalid signatures with 401
 * - For 'charge.success': re-verifies the transaction with Paystack's verify
 *   API (defense in depth), validates amount + currency, then calls the
 *   `confirm_payment` RPC for atomic, idempotent booking confirmation.
 * - For 'charge.failed': records the failure
 * - Returns 200 for processed events (including duplicates and unknown events)
 *   so Paystack doesn't retry indefinitely
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
      .select("id, reference, booking_id, amount_kobo, currency, status, confirmed_by_backend")
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

      // Validate amount — Paystack's `amount` includes fees; `requested_amount` is what we sent
      const verifiedAmount = Number(verified.amount);
      const verifiedRequested = Number((verified as any).requested_amount ?? verifiedAmount);
      const expectedAmount = Number(payment.amount_kobo);

      if (verifiedAmount !== expectedAmount && verifiedRequested !== expectedAmount) {
        console.error(`[paystack/webhook] Amount mismatch: expected ${expectedAmount}, got amount=${verifiedAmount}, requested_amount=${verifiedRequested}`);
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
          failure_reason: "Currency mismatch during webhook verification",
        }).eq("id", payment.id);
        return NextResponse.json({ status: "ok", message: "Currency mismatch" }, { status: 200 });
      }

      // Atomic, idempotent confirmation via RPC. The function locks both the
      // payment and booking rows FOR UPDATE, prevents duplicate ledger entries
      // via the unique (entry_type, reference) constraint, records an audit
      // log, and handles all edge cases (cancelled bookings, already-confirmed
      // bookings, etc.) safely.
      const { data: rpcResult, error: rpcError } = await adminClient.rpc("confirm_payment", {
        p_payment_id: payment.id,
        p_gateway_reference: verified.reference,
        p_actor_email: "system@netlodge.test",
      });

      if (rpcError) {
        console.error("[paystack/webhook] confirm_payment RPC failed:", rpcError.message);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }

      const result = String(rpcResult ?? "");
      console.log(`[paystack/webhook] confirm_payment returned: ${result} for ${txnData.reference}`);

      // Send a notification to the student (deduped via create_notification RPC)
      if (result === "confirmed") {
        await adminClient.rpc("create_notification", {
          p_user_id: payment.student_id,
          p_type: "payment_update",
          p_title: "Payment confirmed",
          p_body: `Your payment ${payment.reference} has been confirmed. Your booking is now active.`,
          p_href: `/student/bookings/${payment.booking_id}`,
        });
      } else if (result === "needs_reconciliation") {
        await adminClient.rpc("create_notification", {
          p_user_id: payment.student_id,
          p_type: "payment_update",
          p_title: "Payment received — under review",
          p_body: `Your payment ${payment.reference} was received but your booking needs manual review. Our team will contact you.`,
          p_href: `/student/bookings/${payment.booking_id}`,
        });
      }

      return NextResponse.json({ status: "ok", result }, { status: 200 });
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
