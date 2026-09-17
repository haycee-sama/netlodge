/**
 * Server-only payment boundary — public API.
 * Phase 9 — re-exports the payment core + Server Actions.
 */
import "server-only";

export type {
  SupabaseDbClient,
  PaystackAdapter,
  WebhookProcessingResult,
} from "./core";

export {
  initiatePaymentCore,
  getPaymentStatusCore,
  processWebhookCore,
  deriveAmountKobo,
} from "./core";

export {
  initiatePayment,
  getPaymentStatus,
} from "./actions";
