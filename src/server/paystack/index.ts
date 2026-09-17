/**
 * Paystack API adapter — server-only.
 *
 * Phase 9 — implements the Paystack integration boundary per
 * TECHNICAL_ARCHITECTURE.md §16 + API_CONTRACTS.md §11.
 *
 * This module provides:
 *   - `initializeTransaction` — server-to-server Paystack transaction init
 *   - `verifyTransaction` — independent Paystack transaction verification
 *   - `verifyWebhookSignature` — HMAC-SHA512 signature verification
 *
 * All functions use the server-only `PAYSTACK_SECRET_KEY` and
 * `PAYSTACK_WEBHOOK_SECRET` environment variables. These are NEVER
 * exposed to the browser.
 *
 * The adapter is designed to be mockable in tests — each function
 * takes its configuration as a parameter so tests can inject mock
 * responses without hitting the real Paystack API.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/config/env";

// ── Types ───────────────────────────────────────────────────────────────────

export interface InitializeTransactionParams {
  email: string;
  amountKobo: number;
  reference: string;
  currency?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface VerifyTransactionParams {
  reference: string;
}

export interface VerifyTransactionResult {
  status: string; // "success" | "failed" | "abandoned" | "pending" | etc.
  reference: string;
  amount: number; // in kobo
  currency: string;
  transactionId: number;
  gatewayResponse: string | null;
  paidAt: string | null;
  channel: string | null;
  providerMetadata: Record<string, unknown>;
}

// ── Paystack API base URL ─────────────────────────────────────────────────

const PAYSTACK_API_BASE = "https://api.paystack.co";

// ── Initialize transaction ────────────────────────────────────────────────

/**
 * Initialize a Paystack transaction.
 *
 * Calls Paystack's `POST /transaction/initialize` endpoint.
 * Returns the authorization URL the browser should redirect to.
 *
 * The `amount` parameter is in kobo (minor units) per API_CONTRACTS.md §2.
 * The `reference` is server-generated, never client-supplied.
 *
 * @throws Error if the Paystack API call fails or returns an invalid response.
 */
export async function initializeTransaction(
  params: InitializeTransactionParams,
): Promise<InitializeTransactionResult> {
  const response = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      currency: params.currency ?? "NGN",
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });

  if (!response.ok) {
    console.error("[netlodge] Paystack init failed", {
      status: response.status,
      reference: params.reference,
    });
    throw new Error(
      `Paystack initialization failed (HTTP ${response.status})`,
    );
  }

  const json = await response.json();

  // Validate the response shape.
  if (!json?.status || !json?.data?.authorization_url || !json?.data?.reference) {
    console.error("[netlodge] Paystack init returned invalid response", {
      reference: params.reference,
    });
    throw new Error("Paystack initialization returned an invalid response");
  }

  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    reference: json.data.reference,
  };
}

// ── Verify transaction ─────────────────────────────────────────────────────

/**
 * Independently verify a Paystack transaction.
 *
 * Calls Paystack's `GET /transaction/verify/:reference` endpoint.
 * This is the independent verification step required by
 * TECHNICAL_ARCHITECTURE.md §18 step 5 — the webhook payload's claimed
 * status is NEVER trusted on its own.
 *
 * @throws Error if the Paystack API call fails or returns an invalid response.
 */
export async function verifyTransaction(
  params: VerifyTransactionParams,
): Promise<VerifyTransactionResult> {
  const response = await fetch(
    `${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(params.reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      },
    },
  );

  if (!response.ok) {
    console.error("[netlodge] Paystack verify failed", {
      status: response.status,
      reference: params.reference,
    });
    throw new Error(
      `Paystack verification failed (HTTP ${response.status})`,
    );
  }

  const json = await response.json();

  if (!json?.status || !json?.data) {
    console.error("[netlodge] Paystack verify returned invalid response", {
      reference: params.reference,
    });
    throw new Error("Paystack verification returned an invalid response");
  }

  const data = json.data;

  return {
    status: data.status,
    reference: data.reference,
    amount: data.amount,
    currency: data.currency,
    transactionId: data.id,
    gatewayResponse: data.gateway_response ?? null,
    paidAt: data.paid_at ?? null,
    channel: data.channel ?? null,
    providerMetadata: {
      transactionId: data.id,
      channel: data.channel,
      gatewayResponse: data.gateway_response,
      domain: data.domain,
    },
  };
}

// ── Verify webhook signature ──────────────────────────────────────────────

/**
 * Verify a Paystack webhook signature.
 *
 * Paystack sends webhooks with an `x-paystack-signature` header containing
 * an HMAC-SHA512 hash of the raw request body using the **Secret Key**
 * (`PAYSTACK_SECRET_KEY`) as the HMAC key — NOT a separate webhook secret.
 *
 * Per Paystack docs: "The signature is computed by creating an HMAC-SHA512
 * hash of the payload with your secret key."
 * https://paystack.com/docs/payments/webhooks
 *
 * This function computes the HMAC-SHA512 of the raw body using
 * `PAYSTACK_SECRET_KEY` and compares it to the provided signature
 * using a constant-time comparison to prevent timing attacks.
 *
 * @param rawBody The raw, unparsed request body as a string.
 * @param signature The value of the `x-paystack-signature` header.
 * @returns `true` iff the signature is valid.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  if (!rawBody || !signature) return false;

  // Paystack uses the Secret Key (PAYSTACK_SECRET_KEY) as the HMAC key.
  // If PAYSTACK_WEBHOOK_SECRET is explicitly set AND differs from the
  // secret key, prefer it (some Paystack setups may use a different key).
  // Otherwise, use PAYSTACK_SECRET_KEY (the documented standard behavior).
  const hmacKey = env.PAYSTACK_WEBHOOK_SECRET &&
    env.PAYSTACK_WEBHOOK_SECRET !== env.PAYSTACK_SECRET_KEY
    ? env.PAYSTACK_WEBHOOK_SECRET
    : env.PAYSTACK_SECRET_KEY;

  const hash = createHmac("sha512", hmacKey)
    .update(rawBody)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks.
  try {
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    // If the signature isn't valid hex, it's definitely invalid.
    return false;
  }
}
