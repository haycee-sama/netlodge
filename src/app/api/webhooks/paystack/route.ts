/**
 * Paystack webhook Route Handler.
 *
 * This file is the HTTP entry point — the implementation lives in
 * `src/server/webhooks/paystack.ts` (server-only module). Per
 * TECHNICAL_ARCHITECTURE §4, the webhook endpoint is a Route Handler (not a
 * Server Action) because Paystack is an external non-browser caller and the
 * request is not bound by the same-origin convention Server Actions rely on.
 *
 * Phase 0 — implementation deliberately stubbed. See Phase 9.
 */
import { POST } from "@/server/webhooks/paystack";

export { POST };
