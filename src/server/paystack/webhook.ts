/**
 * Paystack webhook signature verification — re-exported from the adapter.
 *
 * Phase 9 — the actual implementation lives in `src/server/paystack/index.ts`.
 * This file re-exports it so the webhook handler can import from the
 * established boundary path.
 */
export { verifyWebhookSignature } from "@/server/paystack/index";
