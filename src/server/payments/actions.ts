/**
 * Server-only Payment Server Actions — Phase 9.
 */
import "server-only";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { createPrivilegedClient } from "@/server/supabase/privileged";
import { requireAccountActive, requireAuthenticated } from "@/server/auth/authorize";
import { assertRateLimit } from "@/server/ratelimit";
import { getClientIp } from "@/server/auth/client-ip";
import {
  initiatePaymentCore,
  getPaymentStatusCore,
} from "@/server/payments/core";
import * as paystackAdapter from "@/server/paystack/index";
import type {
  InitiatePaymentResult,
  PaymentStatusResult,
} from "@/lib/payments/schemas";

export async function initiatePayment(input: unknown): Promise<InitiatePaymentResult> {
  // Phase 12 — rate-limit payments.initiate per API_CONTRACTS.md §22
  // (prevent transaction-creation spam against Paystack).
  // IP-based limit: 10 per minute per IP.
  // Account-based limit: 5 per minute per authenticated student.
  const clientIp = await getClientIp();
  await assertRateLimit("payments.initiate", `ip:${clientIp}`, 10, 60_000);

  const user = await requireAccountActive();
  await assertRateLimit("payments.initiate", `account:${user.id}`, 5, 60_000);

  const db = createPrivilegedClient();
  return initiatePaymentCore(db, paystackAdapter, user, input);
}

export async function getPaymentStatus(input: unknown): Promise<PaymentStatusResult> {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return getPaymentStatusCore(db, user, input);
}
