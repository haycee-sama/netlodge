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
 * 2. Verify the transaction with Paystack's verify endpoint
 * 3. If successful: update payment + booking status atomically
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
      .select("*")
      .eq("reference", reference)
      .single();

    if (paymentError || !payment) {
      console.error("[payments/verify] Payment not found:", reference);
      return NextResponse.redirect(new URL("/student/bookings?payment=error", request.nextUrl.origin));
    }

    // If already confirmed, redirect with success
    if (payment.status === "successful" && payment.confirmed_by_backend) {
      return NextResponse.redirect(new URL(`/student/bookings/${payment.booking_id}?payment=success`, request.nextUrl.origin));
    }

    // Verify with Paystack — this is the authoritative check
    const verifyResult = await verifyTransaction(reference);

    if (!verifyResult.success || !verifyResult.data) {
      // Verification failed — could be network error or transaction not found
      // Don't mark as failed yet — the webhook might still come through
      console.error("[payments/verify] Verification failed:", verifyResult.error);

      // Update payment status to 'pending' (awaiting webhook)
      await adminClient.from("payments").update({
        status: "pending",
      }).eq("id", payment.id);

      return NextResponse.redirect(new URL(`/student/bookings/${payment.booking_id}?payment=pending`, request.nextUrl.origin));
    }

    const txn = verifyResult.data;

    // Validate the transaction details
    if (txn.status !== "success") {
      // Payment was not successful (abandoned, failed, etc.)
      await adminClient.from("payments").update({
        status: txn.status === "abandoned" ? "failed" : "failed",
        failure_reason: txn.gateway_response || txn.status,
      }).eq("id", payment.id);

      return NextResponse.redirect(new URL(`/student/bookings/${payment.booking_id}?payment=failed`, request.nextUrl.origin));
    }

    // Validate amount matches
    if (txn.amount !== payment.amount_kobo) {
      console.error(`[payments/verify] Amount mismatch: expected ${payment.amount_kobo}, got ${txn.amount}`);
      await adminClient.from("payments").update({
        status: "failed",
        failure_reason: "Amount mismatch",
      }).eq("id", payment.id);

      return NextResponse.redirect(new URL(`/student/bookings/${payment.booking_id}?payment=error`, request.nextUrl.origin));
    }

    // SUCCESS — update payment and booking atomically
    // Use a database transaction via RPC or sequential updates with checks

    // 1. Update payment record
    const { error: updatePaymentError } = await adminClient.from("payments").update({
      status: "successful",
      confirmed_by_backend: true,
      confirmed_at: new Date().toISOString(),
      gateway_reference: txn.reference,
    }).eq("id", payment.id);

    if (updatePaymentError) {
      console.error("[payments/verify] Failed to update payment:", updatePaymentError.message);
      return NextResponse.redirect(new URL(`/student/bookings/${payment.booking_id}?payment=error`, request.nextUrl.origin));
    }

    // 2. Fetch the booking
    const { data: booking } = await adminClient
      .from("bookings")
      .select("id, status, total_kobo, paid_kobo, outstanding_kobo")
      .eq("id", payment.booking_id)
      .single();

    if (!booking) {
      console.error("[payments/verify] Booking not found for payment:", payment.booking_id);
      return NextResponse.redirect(new URL("/student/bookings?payment=error", request.nextUrl.origin));
    }

    // 3. Check if booking is still valid (not cancelled/expired)
    if (["cancelled", "expired", "refunded"].includes(booking.status)) {
      // Payment succeeded but booking is no longer valid — record for reconciliation
      console.error(`[payments/verify] Booking ${booking.id} is ${booking.status} but payment succeeded. Needs reconciliation.`);
      // Mark payment as successful but don't confirm the booking
      // This will be handled by the reconciliation process
      return NextResponse.redirect(new URL(`/student/bookings/${payment.booking_id}?payment=needs-reconciliation`, request.nextUrl.origin));
    }

    // 4. Update booking — mark as confirmed
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

    // 5. Update room status to 'occupied'
    await adminClient.from("rentable_units").update({
      status: "occupied",
      active_booking_id: booking.id,
      active_hold_id: null,
      updated_at: new Date().toISOString(),
    }).eq("active_hold_id", booking.id);

    // 6. Record booking status history
    await adminClient.from("booking_status_history").insert({
      booking_id: booking.id,
      from_status: booking.status,
      to_status: "confirmed",
      reason: `Payment confirmed via Paystack (ref: ${reference})`,
    });

    // 7. Insert ledger entry
    await adminClient.from("ledger_entries").insert({
      entry_type: "payment",
      reference: payment.reference,
      booking_id: booking.id,
      payment_id: payment.id,
      credit_kobo: payment.amount_kobo,
      description: `Payment confirmed for booking via Paystack`,
    });

    // 8. Record audit log
    await adminClient.rpc("record_audit", {
      p_actor_id: payment.student_id,
      p_actor_email: "system@netlodge.test",
      p_actor_role: "student",
      p_category: "finance",
      p_action: "payment.confirmed",
      p_resource_type: "payment",
      p_resource_id: payment.id,
      p_summary: `Payment ${reference} confirmed via Paystack verification`,
      p_severity: "info",
    });

    return NextResponse.redirect(new URL(`/student/bookings/${payment.booking_id}?payment=success`, request.nextUrl.origin));
  } catch (err) {
    console.error("[payments/verify] Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(new URL("/student/bookings?payment=error", request.nextUrl.origin));
  }
}
