/**
 * Paystack API client — server-only.
 *
 * Never import this in a client component. The secret key must never
 * be exposed to the browser.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

interface InitializeTxnParams {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

interface InitializeTxnResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface VerifyTxnResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    reference: string;
    amount: number; // in kobo
    currency: string;
    status: string;
    gateway_response: string;
    paid_at: string | null;
    created_at: string;
    channel: string;
    customer: {
      email: string;
    };
  };
}

/**
 * Initialize a Paystack transaction.
 * Returns the authorization URL the user should be redirected to.
 */
export async function initializeTransaction(
  params: InitializeTxnParams,
): Promise<{ success: boolean; authorizationUrl?: string; reference?: string; error?: string }> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return { success: false, error: "PAYSTACK_SECRET_KEY is not configured" };
  }

  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo, // Paystack expects amount in kobo
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
        channels: ["card", "bank_transfer", "ussd"],
      }),
    });

    const data: InitializeTxnResponse = await response.json();

    if (!response.ok || !data.status) {
      return { success: false, error: data.message || "Paystack initialization failed" };
    }

    return {
      success: true,
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error during Paystack initialization",
    };
  }
}

/**
 * Verify a Paystack transaction by reference.
 * This is the authoritative check — never trust the browser redirect.
 */
export async function verifyTransaction(
  reference: string,
): Promise<{ success: boolean; data?: VerifyTxnResponse["data"]; error?: string }> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return { success: false, error: "PAYSTACK_SECRET_KEY is not configured" };
  }

  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    const data: VerifyTxnResponse = await response.json();

    if (!response.ok || !data.status) {
      return { success: false, error: data.message || "Paystack verification failed" };
    }

    return { success: true, data: data.data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error during Paystack verification",
    };
  }
}

/**
 * Verify a Paystack webhook signature.
 * Uses HMAC-SHA512 with the secret key against the raw body.
 *
 * Paystack sends the signature in the `x-paystack-signature` header.
 * The signature is computed as: HMAC-SHA512(secret, rawRequestBody)
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  try {
    const expectedSignature = createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex")
      .toLowerCase();

    // Use timing-safe comparison
    return timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(signature.toLowerCase(), "hex"),
    );
  } catch {
    return false;
  }
}
