import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction } from "@/lib/paystack/server";
import { securityCheck } from "@/lib/security/api-security";

/**
 * Paystack rejects emails with invalid TLDs (e.g. `.test`). This helper
 * validates the email format against a reasonable pattern. If the email
 * is not valid for Paystack, the route falls back to a safe placeholder.
 */
function isValidPaystackEmail(email: string): boolean {
  if (!email) return false;
  // Basic email regex — requires a valid-looking TLD (2+ alpha chars)
  const re = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
}

/**
 * POST /api/payments/initiate
 *
 * Initializes a Paystack test-mode transaction for a booking.
 *
 * Security:
 * - Requires authenticated Supabase session (verified server-side)
 * - Derives amount from the booking record in the database — never from client input
 * - Verifies the booking belongs to the authenticated user
 * - Checks the booking is eligible for payment (status = pending_payment, not expired)
 * - Uses a unique transaction reference
 * - Records the payment in the payments table with status = 'initiated'
 */
export async function POST(request: NextRequest) {
  try {
    // Security: rate limit + origin validation
    const sec = await securityCheck(request, "payment-initiate", { capacity: 5, refillPerSecond: 0.2, failClosed: true });
    if (sec) return sec;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    // Fetch the booking — RLS ensures only the owner can see it
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify ownership
    if (booking.student_id !== user.id) {
      return NextResponse.json({ error: "Not authorized to pay for this booking" }, { status: 403 });
    }

    // Check booking is eligible for payment
    if (!["pending_payment", "payment_initiated"].includes(booking.status)) {
      return NextResponse.json({
        error: `Booking is not eligible for payment (status: ${booking.status})`,
      }, { status: 400 });
    }

    // Check hold hasn't expired
    if (booking.hold_expires_at && new Date(booking.hold_expires_at) < new Date()) {
      return NextResponse.json({ error: "Booking hold has expired" }, { status: 400 });
    }

    // Check if there's already an active payment
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, reference, status")
      .eq("booking_id", bookingId)
      .in("status", ["initiated", "pending", "successful"])
      .order("initiated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPayment?.status === "successful") {
      return NextResponse.json({ error: "Booking has already been paid" }, { status: 400 });
    }

    // Derive amount from the booking record — never from client input
    const amountKobo = booking.outstanding_kobo;
    if (amountKobo <= 0) {
      return NextResponse.json({ error: "No outstanding amount to pay" }, { status: 400 });
    }

    // Generate a unique reference
    const reference = `NLG-PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Build callback URL
    const origin = request.nextUrl.origin;
    const callbackUrl = `${origin}/api/payments/verify?reference=${reference}`;

    // Record the payment in the database FIRST — with status='initiated' and
    // confirmed_by_backend=false. If Paystack init fails below, we mark the
    // payment as 'failed' but the row stays for audit. This avoids the
    // partial-failure case where Paystack succeeds but the DB write fails
    // (which would orphan the payment and break webhook reconciliation).
    const adminClient = createAdminClient();
    const { error: insertPaymentError } = await adminClient.from("payments").insert({
      reference,
      booking_id: bookingId,
      student_id: user.id,
      amount_kobo: amountKobo,
      fee_kobo: Math.round(amountKobo * 0.0235),
      net_kobo: amountKobo - Math.round(amountKobo * 0.0235),
      currency: "NGN",
      channel: "card",
      status: "initiated",
      confirmed_by_backend: false,
    });

    if (insertPaymentError) {
      // Likely a unique-reference collision (extremely rare) — surface as 500.
      console.error("[payments/initiate] Failed to insert payment:", insertPaymentError.message);
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }

    // Initialize with Paystack
    // Paystack rejects emails with TLDs like .test — use a safe fallback
    // if the student's email is not valid for Paystack (e.g. test accounts).
    const studentEmail = user.email ?? "";
    const safeEmail = isValidPaystackEmail(studentEmail)
      ? studentEmail
      : "student@netlodge.com";
    const result = await initializeTransaction({
      email: safeEmail,
      amountKobo,
      reference,
      callbackUrl,
      metadata: {
        booking_id: bookingId,
        booking_reference: booking.reference,
        student_id: user.id,
        student_email: studentEmail, // preserve the real email in metadata
      },
    });

    if (!result.success || !result.authorizationUrl) {
      // Mark the payment as failed so the audit trail is intact.
      // payments.reference is unique, so this update targets exactly one row.
      await adminClient.from("payments").update({
        status: "failed",
        failure_reason: result.error || "Paystack initialization failed",
      }).eq("reference", reference);

      return NextResponse.json({
        error: "Failed to initialize payment",
        details: result.error,
      }, { status: 502 });
    }

    // Update booking status
    await adminClient.from("bookings").update({
      status: "payment_initiated",
      current_step: "payment_initiation",
      updated_at: new Date().toISOString(),
    }).eq("id", bookingId);

    await adminClient.from("booking_status_history").insert({
      booking_id: bookingId,
      from_status: booking.status,
      to_status: "payment_initiated",
      changed_by: user.id,
      reason: "Payment initiated via Paystack",
    });

    return NextResponse.json({
      authorizationUrl: result.authorizationUrl,
      reference,
    });
  } catch (err) {
    console.error("[payments/initiate] Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
