import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "@/lib/paystack/server";

/**
 * GET /api/payments/verify?reference=NLG-PAY-...
 *
 * Paystack redirects here after the user completes (or abandons) the payment.
 *
 * IMPORTANT: This redirect is NOT proof of payment. We verify the transaction
 * with Paystack's server-side verification API before changing any state.
 *
 * Flow:
 * 1. Get the reference from the query string
 * 2. Verify the transaction with Paystack's verify endpoint (defense-in-depth:
 *    the webhook will also verify, so a network error here is recoverable)
 * 3. On success: call the `confirm_payment` RPC for atomic, idempotent booking
 *    confirmation (locks payment + booking rows, ledger entry unique on
 *    (entry_type, reference), audit log recorded inside the function)
 * 4. Redirect to the student's booking page with the result
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");

  if (!reference) {
    return NextResponse.redirect(new URL("/student/bookings?payment=error", request.nextUrl.origin));
  }

  try {
    const adminClient = createAdminClient();

    // Fetch the payment record
    const { data: payment, error: paymentError } = await adminClient
      .from("payments")
      .select("id, reference, booking_id, amount_kobo, currency, status, confirmed_by_backend")
      .eq("reference", reference)
      .single();

    if (paymentError || !payment) {
      console.error("[payments/verify] Payment not found:", reference, paymentError?.message);
      return NextResponse.redirect(new URL("/student/bookings?payment=error", request.nextUrl.origin));
    }

    // Idempotency: already confirmed — no need to call Paystack again.
    if (payment.status === "successful" && payment.confirmed_by_backend) {
      return NextResponse.redirect(new URL(`/student/bookings/${payment.booking_id}?payment=success`, request.nextUrl.origin));
    }

    // Verify with Paystack — this is the authoritative check
    const verifyResult = await verifyTransaction(reference);

    if (!verifyResult.success || !verifyResult.data) {
      // Verification failed — could be network error or transaction not yet
      // settled. Don't mark as failed — the webhook might still come through.
      console.error("[payments/verify] Verification failed:", verifyResult.error);

      // Update payment status to 'pending' (awaiting webhook)
      await adminClient.from("payments").update({ status: "pending" }).eq("id", payment.id);

      return NextResponse.redirect(new URL(`/student/bookings/${payment.booking_id}?payment=pending`, request.nextUrl.origin));
    }

    const txn = verifyResult.data;

    // Validate the transaction details from Paystack
    if (txn.status !== "success") {
      // Payment was not successful (abandoned, failed, etc.)
      await adminClient.from("payments").update({
        status: "failed",
        failure_reason: txn.gateway_response || txn.status,
      }).eq("id", payment.id);

      return NextResponse.redirect(new URL(`/student/bookings/${payment.booking_id}?payment=failed`, request.nextUrl.origin));
    }

    // Validate amount matches the trusted payment record.
    // Paystack's `amount` field includes fees (total charged to customer).
    // The `requested_amount` field is what we originally specified.
    // Accept if either matches our payment.amount_kobo.
    const txnAmount = Number(txn.amount);
    const txnRequestedAmount = Number((txn as any).requested_amount ?? txnAmount);
    const expectedAmount = Number(payment.amount_kobo);

    if (txnAmount !== expectedAmount && txnRequestedAmount !== expectedAmount) {
      console.error(`[payments/verify] Amount mismatch: expected ${expectedAmount}, got amount=${txnAmount}, requested_amount=${txnRequestedAmount}`);
      await adminClient.from("payments").update({
        status: "failed",
        failure_reason: "Amount mismatch during Paystack verification",
      }).eq("id", payment.id);

      return NextResponse.redirect(new URL(`/student/bookings/${payment.booking_id}?payment=error`, request.nextUrl.origin));
    }

    // Validate currency
    if (txn.currency !== payment.currency) {
      console.error(`[payments/verify] Currency mismatch: expected ${payment.currency}, got ${txn.currency}`);
      await adminClient.from("payments").update({
        status: "failed",
        failure_reason: "Currency mismatch during Paystack verification",
      }).eq("id", payment.id);

      return NextResponse.redirect(new URL(`/student/bookings/${payment.booking_id}?payment=error`, request.nextUrl.origin));
    }

    // Atomic, idempotent confirmation via the confirm_payment RPC.
    // This locks both payment and booking rows, prevents duplicate ledger
    // entries, records an audit log, and safely handles concurrent webhook
    // deliveries.
    const { data: rpcResult, error: rpcError } = await adminClient.rpc("confirm_payment", {
      p_payment_id: payment.id,
      p_gateway_reference: txn.reference,
      p_actor_email: "system@netlodge.test",
    });

    if (rpcError) {
      console.error("[payments/verify] confirm_payment RPC failed:", rpcError.message);
      return NextResponse.redirect(new URL(`/student/bookings/${payment.booking_id}?payment=error`, request.nextUrl.origin));
    }

    const result = String(rpcResult ?? "");
    console.log(`[payments/verify] confirm_payment returned: ${result} for ${reference}`);

    let redirectPath: string;
    if (result === "confirmed" || result === "already_confirmed") {
      redirectPath = `/student/bookings/${payment.booking_id}?payment=success`;
    } else if (result === "needs_reconciliation") {
      redirectPath = `/student/bookings/${payment.booking_id}?payment=needs-reconciliation`;
    } else {
      // 'invalid_booking' or 'payment_not_found' or unknown
      redirectPath = `/student/bookings/${payment.booking_id}?payment=error`;
    }

    return NextResponse.redirect(new URL(redirectPath, request.nextUrl.origin));
  } catch (err) {
    console.error("[payments/verify] Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(new URL("/student/bookings?payment=error", request.nextUrl.origin));
  }
}
