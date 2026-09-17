/**
 * Paystack webhook Route Handler — Phase 9.
 *
 * Implements the full webhook processing pipeline per
 * TECHNICAL_ARCHITECTURE.md §18 / API_CONTRACTS.md §11.
 *
 * Processing order (EXACT — do not reorder):
 *   1. Read raw request body (required for signature verification).
 *   2. Verify Paystack signature against raw body.
 *   3. Parse the now-trusted payload.
 *   4. Process via processWebhookCore (idempotency gate, independent
 *      verification, atomic confirmation).
 *   5. Return 200 OK to Paystack.
 *
 * This is a Route Handler (not a Server Action) because Paystack is an
 * external non-browser caller.
 */
import { NextResponse } from "next/server";
import { createPrivilegedClient } from "@/server/supabase/privileged";
import { verifyWebhookSignature } from "@/server/paystack/index";
import { processWebhookCore } from "@/server/payments/core";
import * as paystackAdapter from "@/server/paystack/index";
import { paystackWebhookPayloadSchema } from "@/lib/payments/schemas";

export async function POST(request: Request) {
  // 1. Read raw body — MUST be before any parsing for signature verification.
  const rawBody = await request.text();

  // 2. Verify Paystack signature.
  const signature = request.headers.get("x-paystack-signature");

  if (!signature) {
    console.warn("[netlodge] Webhook received without signature header");
    return NextResponse.json(
      { error: { code: "invalid_webhook", message: "Missing signature." } },
      { status: 401 },
    );
  }

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[netlodge] Webhook signature verification failed");
    return NextResponse.json(
      { error: { code: "invalid_webhook", message: "Invalid signature." } },
      { status: 401 },
    );
  }

  // 3. Parse the now-trusted payload.
  let payload;
  try {
    const json = JSON.parse(rawBody);
    const parsed = paystackWebhookPayloadSchema.safeParse(json);
    if (!parsed.success) {
      console.warn("[netlodge] Webhook payload failed schema validation");
      return NextResponse.json(
        { error: { code: "malformed_payload", message: "Invalid payload structure." } },
        { status: 400 },
      );
    }
    payload = parsed.data;
  } catch {
    console.warn("[netlodge] Webhook payload is not valid JSON");
    return NextResponse.json(
      { error: { code: "malformed_payload", message: "Invalid JSON." } },
      { status: 400 },
    );
  }

  // 4. Process the webhook event.
  const db = createPrivilegedClient();

  try {
    const result = await processWebhookCore(db, paystackAdapter, payload);

    // 5. Return 200 OK to Paystack (even for duplicates/failures, so
    // Paystack stops retrying — the idempotency gate makes retries safe).
    return NextResponse.json({ status: "ok", outcome: result.outcome });
  } catch (err) {
    // Internal error — return non-200 so Paystack retries.
    console.error("[netlodge] Webhook processing failed", {
      reference: payload.data.reference,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: { code: "internal_error", message: "Webhook processing failed." } },
      { status: 500 },
    );
  }
}
