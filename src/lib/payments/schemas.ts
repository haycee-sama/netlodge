/**
 * Payment validation schemas (Zod) — Phase 9.
 *
 * Per API_CONTRACTS.md §11 + §2 conventions.
 * All schemas use `.strict()` to reject protected fields.
 *
 * CRITICAL: `payments.initiate` accepts ONLY `bookingId` — no `amount`,
 * no `currency`, no `paystackReference`. The server derives the amount
 * from `bookings.reserved_price` and generates the Paystack reference.
 */
import { z } from "zod";
import { uuidSchema } from "@/validation";

// ── Initiate payment ───────────────────────────────────────────────────────

export const initiatePaymentSchema = z
  .object({
    bookingId: uuidSchema,
  })
  .strict();

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

// ── Get payment status ──────────────────────────────────────────────────────

export const getPaymentStatusSchema = z
  .object({
    bookingId: uuidSchema,
  })
  .strict();

export type GetPaymentStatusInput = z.infer<typeof getPaymentStatusSchema>;

// ── Result types ─────────────────────────────────────────────────────────────

export interface InitiatePaymentResult {
  paymentTransactionId: string;
  paystackReference: string;
  authorizationUrl: string;
  amountKobo: number;
  currency: string;
}

export interface PaymentStatusResult {
  bookingId: string;
  bookingStatus: string;
  paymentStatus: string | null;
  paystackReference: string | null;
  amountKobo: number | null;
  currency: string | null;
}

// ── Paystack API response schemas (runtime validation) ──────────────────────

/**
 * Paystack transaction initialization response.
 * Validated at runtime — never trust the external API's shape without checking.
 */
export const paystackInitResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z.object({
    authorization_url: z.string().url(),
    access_code: z.string(),
    reference: z.string(),
  }),
});

export type PaystackInitResponse = z.infer<typeof paystackInitResponseSchema>;

/**
 * Paystack transaction verification response.
 * Validated at runtime — the webhook handler independently calls this API
 * and validates the response before confirming any booking.
 */
export const paystackVerifyResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z.object({
    id: z.number(),
    domain: z.string(),
    status: z.string(),
    reference: z.string(),
    amount: z.number(), // in kobo
    currency: z.string(),
    paid_at: z.string().optional(),
    created_at: z.string(),
    channel: z.string().optional(),
    gateway_response: z.string().optional(),
  }),
});

export type PaystackVerifyResponse = z.infer<typeof paystackVerifyResponseSchema>;

// ── Webhook payload schema ──────────────────────────────────────────────────

/**
 * Paystack webhook payload structure.
 * Validated after signature verification — the payload is only trusted
 * after the signature check passes.
 *
 * Phase 12 finding F-002: the original schema used `z.number()` for
 * `amount`, which accepts negative, NaN, and Infinity. While signature
 * verification makes a malicious payload unlikely, defense-in-depth
 * requires the schema to reject malformed amounts. Tightened to
 * `z.number().int().positive()` to match the documented contract
 * (amount is a positive integer in kobo per API_CONTRACTS.md §2).
 *
 * NOTE: the schema is intentionally NOT `.strict()` because the webhook
 * payload comes from an external provider (Paystack) and may include
 * additional fields we don't use. Strict mode would break on Paystack
 * adding new optional fields. Signature verification is the trust
 * boundary, not schema strictness.
 */
export const paystackWebhookPayloadSchema = z.object({
  event: z.string(),
  data: z.object({
    id: z.number(),
    domain: z.string(),
    status: z.string(),
    reference: z.string(),
    amount: z.number().int().positive("amount must be a positive integer (kobo)"),
    currency: z.string(),
    paid_at: z.string().nullable().optional(),
    created_at: z.string(),
    channel: z.string().nullable().optional(),
    gateway_response: z.string().nullable().optional(),
  }),
});

export type PaystackWebhookPayload = z.infer<typeof paystackWebhookPayloadSchema>;
