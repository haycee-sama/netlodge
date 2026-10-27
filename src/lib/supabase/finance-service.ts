/**
 * Finance server service — Finance Admin operations.
 *
 * All functions:
 *  1. Require an authenticated Supabase session (verified server-side).
 *  2. Verify the caller's role (finance_admin or super_admin) via the database.
 *  3. Call SECURITY DEFINER RPCs for state changes.
 *
 * This module is server-only. Never import it from a client component.
 */

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { refundTransaction, verifyTransaction } from "@/lib/paystack/server";

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null, status: 200 };
}
function err<T>(error: string, status: number): ServiceResult<T> {
  return { data: null, error, status };
}

interface SupabaseUserClient {
  auth: {
    getUser(accessToken?: string): Promise<{ data: { user: User | null }; error: unknown }>;
    setSession(session: { access_token: string; refresh_token: string }): Promise<unknown>;
  };
  from(table: string): any;
  rpc(name: string, params?: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }>;
}

async function createUserClient(request?: Request): Promise<SupabaseUserClient> {
  const authHeader = request?.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const accessToken = authHeader.slice(7);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const client = createSupabaseJsClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    return client as unknown as SupabaseUserClient;
  }
  return (await createServerClient()) as unknown as SupabaseUserClient;
}

async function requireRole(
  allowedRoles: string[],
  request?: Request,
): Promise<{ user: User; supabase: SupabaseUserClient } | ServiceResult<never>> {
  const supabase = await createUserClient(request);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return err("Not authenticated", 401);

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id);
  if (rolesError) return err("Failed to verify role", 500);

  const userRoles = (roles ?? []).map((r: any) => r.role as string);
  const hasAllowed = userRoles.some((r: string) => allowedRoles.includes(r));
  if (!hasAllowed) return err(`Forbidden: requires one of ${allowedRoles.join(", ")}`, 403);

  return { user, supabase };
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

export interface PaymentRow {
  id: string;
  reference: string;
  gateway_reference: string | null;
  booking_id: string;
  student_id: string;
  amount_kobo: number;
  fee_kobo: number;
  net_kobo: number;
  currency: string;
  channel: string;
  status: string;
  confirmed_by_backend: boolean;
  initiated_at: string;
  confirmed_at: string | null;
  failure_reason: string | null;
  bookings?: { id: string; reference: string; property_id: string; properties?: { id: string; name: string } };
}

export async function fetchPayments(
  filters: { status?: string; q?: string; page?: number; pageSize?: number },
  request?: Request,
): Promise<ServiceResult<{ items: PaymentRow[]; total: number }>> {
  const authResult = await requireRole(["finance_admin", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("payments")
    .select("*, bookings ( id, reference, property_id, properties ( id, name ) )", { count: "exact" });

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.q) query = query.or(`reference.ilike.%${filters.q}%,gateway_reference.ilike.%${filters.q}%`);
  query = query.order("initiated_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) return err(error.message, 500);
  return ok({ items: (data ?? []) as PaymentRow[], total: count ?? 0 });
}

export interface RefundRow {
  id: string;
  reference: string;
  payment_id: string;
  payment_reference: string;
  booking_id: string;
  student_id: string;
  amount_kobo: number;
  currency: string;
  reason: string;
  reason_detail: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  provider_reference: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchRefunds(
  filters: { status?: string; q?: string; page?: number; pageSize?: number },
  request?: Request,
): Promise<ServiceResult<{ items: RefundRow[]; total: number }>> {
  const authResult = await requireRole(["finance_admin", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("refunds").select("*", { count: "exact" });
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.q) query = query.or(`reference.ilike.%${filters.q}%,payment_reference.ilike.%${filters.q}%`);
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) return err(error.message, 500);
  return ok({ items: (data ?? []) as RefundRow[], total: count ?? 0 });
}

export interface PayoutRow {
  id: string;
  reference: string;
  landlord_id: string;
  booking_id: string;
  gross_kobo: number;
  platform_fee_kobo: number;
  net_kobo: number;
  status: string;
  settled_at: string | null;
  bank_account_masked: string;
  scheduled_for: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  provider_reference: string | null;
  eligibility_flags: string[];
  created_at: string;
}

export async function fetchPayouts(
  filters: { status?: string; q?: string; page?: number; pageSize?: number },
  request?: Request,
): Promise<ServiceResult<{ items: PayoutRow[]; total: number }>> {
  const authResult = await requireRole(["finance_admin", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("payouts").select("*", { count: "exact" });
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.q) query = query.or(`reference.ilike.%${filters.q}%`);
  query = query.order("scheduled_for", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) return err(error.message, 500);
  return ok({ items: (data ?? []) as PayoutRow[], total: count ?? 0 });
}

export interface ReconciliationRow {
  id: string;
  internal_reference: string;
  provider_reference: string | null;
  internal_amount_kobo: number;
  provider_amount_kobo: number | null;
  internal_settled_at: string | null;
  provider_settled_at: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export async function fetchReconciliation(
  filters: { status?: string; page?: number; pageSize?: number },
  request?: Request,
): Promise<ServiceResult<{ items: ReconciliationRow[]; total: number }>> {
  const authResult = await requireRole(["finance_admin", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("reconciliation_records").select("*", { count: "exact" });
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) return err(error.message, 500);
  return ok({ items: (data ?? []) as ReconciliationRow[], total: count ?? 0 });
}

export interface FinanceMetrics {
  gross_volume_kobo: number;
  platform_revenue_kobo: number;
  pending_payouts_count: number;
  pending_payouts_total_kobo: number;
  settled_payouts_total_kobo: number;
  refund_total_kobo: number;
  pending_refunds_count: number;
  failed_txns_count: number;
  success_rate: number;
  total_payments: number;
}

export async function fetchFinanceMetrics(request?: Request): Promise<ServiceResult<FinanceMetrics>> {
  const authResult = await requireRole(["finance_admin", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  // Fetch all payments (RLS restricts to admin)
  const { data: payments } = await supabase
    .from("payments").select("amount_kobo, fee_kobo, status").eq("status", "successful");
  const allPayments = (payments ?? []) as any[];

  const { data: allPayouts } = await supabase
    .from("payouts").select("net_kobo, platform_fee_kobo, status");
  const payouts = (allPayouts ?? []) as any[];

  const { data: refunds } = await supabase
    .from("refunds").select("amount_kobo, status");
  const allRefunds = (refunds ?? []) as any[];

  const { count: totalPayments } = await supabase
    .from("payments").select("*", { count: "exact", head: true });

  const { count: failedCount } = await supabase
    .from("payments").select("*", { count: "exact", head: true }).eq("status", "failed");

  const grossVolume = allPayments.reduce((s, p) => s + Number(p.amount_kobo), 0);
  const platformRevenue = allPayments.reduce((s, p) => s + Number(p.fee_kobo), 0)
    + payouts.filter((p) => p.status === "settled").reduce((s, p) => s + Number(p.platform_fee_kobo), 0);
  const pendingPayouts = payouts.filter((p) => p.status === "scheduled" || p.status === "in_flight");
  const pendingPayoutsTotal = pendingPayouts.reduce((s, p) => s + Number(p.net_kobo), 0);
  const settledPayoutsTotal = payouts.filter((p) => p.status === "settled").reduce((s, p) => s + Number(p.net_kobo), 0);
  const refundTotal = allRefunds.filter((r) => r.status === "completed").reduce((s, r) => s + Number(r.amount_kobo), 0);
  const pendingRefunds = allRefunds.filter((r) => ["requested", "under_review", "approved", "processing"].includes(r.status));
  const successRate = (totalPayments ?? 0) > 0
    ? Math.round((allPayments.length / (totalPayments ?? 1)) * 100)
    : 0;

  return ok({
    gross_volume_kobo: grossVolume,
    platform_revenue_kobo: platformRevenue,
    pending_payouts_count: pendingPayouts.length,
    pending_payouts_total_kobo: pendingPayoutsTotal,
    settled_payouts_total_kobo: settledPayoutsTotal,
    refund_total_kobo: refundTotal,
    pending_refunds_count: pendingRefunds.length,
    failed_txns_count: failedCount ?? 0,
    success_rate: successRate,
    total_payments: totalPayments ?? 0,
  });
}

// ---------------------------------------------------------------------------
// Refund operations
// ---------------------------------------------------------------------------

export interface CreateRefundInput {
  paymentId: string;
  amountKobo: number;
  reason: string;
  reasonDetail: string;
}

export async function createRefund(
  input: CreateRefundInput,
  request?: Request,
): Promise<ServiceResult<{ refundId: string }>> {
  const authResult = await requireRole(["finance_admin", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const { data, error } = await supabase.rpc("create_refund", {
    p_payment_id: input.paymentId,
    p_amount_kobo: input.amountKobo,
    p_reason: input.reason,
    p_reason_detail: input.reasonDetail,
    p_actor_email: null,
  });

  if (error) {
    if (error.message.includes("Not authenticated")) return err(error.message, 401);
    if (error.message.includes("Not authorized")) return err(error.message, 403);
    if (error.message.includes("not found")) return err(error.message, 404);
    if (error.message.includes("required") || error.message.includes("must be") || error.message.includes("exceeds") || error.message.includes("fully refunded")) return err(error.message, 400);
    return err(error.message, 500);
  }
  return ok({ refundId: String(data ?? "") });
}

export interface ReviewRefundInput {
  action: "approve" | "reject";
  notes?: string;
}

export async function reviewRefund(
  refundId: string,
  input: ReviewRefundInput,
  request?: Request,
): Promise<ServiceResult<{ newStatus: string; providerReference?: string }>> {
  const authResult = await requireRole(["finance_admin", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  if (input.action === "reject") {
    if (!input.notes?.trim()) return err("A rejection reason is required", 400);
    const { data, error } = await supabase.rpc("review_refund", {
      p_refund_id: refundId,
      p_action: "reject",
      p_notes: input.notes,
      p_provider_reference: null,
      p_failure_reason: null,
      p_actor_email: null,
    });
    if (error) return err(error.message, 500);
    return ok({ newStatus: String(data ?? "") });
  }

  // approve — need to fetch the refund to get the payment reference for Paystack
  const { data: refund, error: refundErr } = await supabase
    .from("refunds").select("payment_reference, amount_kobo, currency")
    .eq("id", refundId).single();
  if (refundErr || !refund) return err("Refund not found", 404);

  // Call Paystack refund API (test mode only — enforced inside refundTransaction)
  const paystackResult = await refundTransaction(refund.payment_reference, refund.amount_kobo);
  if (!paystackResult.success) {
    // Record the failure on the refund
    await supabase.rpc("review_refund", {
      p_refund_id: refundId,
      p_action: "approve",
      p_notes: input.notes ?? null,
      p_provider_reference: null,
      p_failure_reason: paystackResult.error ?? "Paystack refund failed",
      p_actor_email: null,
    });
    return err(`Paystack refund failed: ${paystackResult.error}`, 502);
  }

  // Paystack accepted the refund — record the provider reference
  const { data, error } = await supabase.rpc("review_refund", {
    p_refund_id: refundId,
    p_action: "approve",
    p_notes: input.notes ?? null,
    p_provider_reference: paystackResult.refundReference ?? paystackResult.refundId,
    p_failure_reason: null,
    p_actor_email: null,
  });

  if (error) return err(error.message, 500);
  return ok({
    newStatus: String(data ?? ""),
    providerReference: paystackResult.refundReference ?? paystackResult.refundId,
  });
}

// ---------------------------------------------------------------------------
// Payout operations
// ---------------------------------------------------------------------------

export async function approvePayout(
  payoutId: string,
  request?: Request,
): Promise<ServiceResult<{ newStatus: string }>> {
  const authResult = await requireRole(["finance_admin", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const { data, error } = await supabase.rpc("approve_payout", {
    p_payout_id: payoutId,
    p_actor_email: null,
  });

  if (error) {
    if (error.message.includes("Not authenticated")) return err(error.message, 401);
    if (error.message.includes("Not authorized")) return err(error.message, 403);
    if (error.message.includes("Conflict of interest")) return err(error.message, 403);
    if (error.message.includes("not found")) return err(error.message, 404);
    if (error.message.includes("not in scheduled status")) return err(error.message, 400);
    return err(error.message, 500);
  }
  return ok({ newStatus: String(data ?? "") });
}

export async function rejectPayout(
  payoutId: string,
  reason: string,
  request?: Request,
): Promise<ServiceResult<{ newStatus: string }>> {
  const authResult = await requireRole(["finance_admin", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  if (!reason.trim()) return err("A rejection reason is required", 400);

  const { data, error } = await supabase.rpc("reject_payout", {
    p_payout_id: payoutId,
    p_reason: reason,
    p_actor_email: null,
  });

  if (error) {
    if (error.message.includes("Not authenticated")) return err(error.message, 401);
    if (error.message.includes("Not authorized")) return err(error.message, 403);
    if (error.message.includes("not found")) return err(error.message, 404);
    if (error.message.includes("required")) return err(error.message, 400);
    return err(error.message, 500);
  }
  return ok({ newStatus: String(data ?? "") });
}

// ---------------------------------------------------------------------------
// Reconciliation operations
// ---------------------------------------------------------------------------

export async function runReconciliation(
  from: string,
  to: string,
  request?: Request,
): Promise<ServiceResult<{ total: number; inserted: number; skipped: number; discrepancies: number }>> {
  const authResult = await requireRole(["finance_admin", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  // Step 1: Create reconciliation_records for all successful payments in range
  const { data: rpcResult, error: rpcError } = await supabase.rpc("run_reconciliation", {
    p_from: from,
    p_to: to,
    p_actor_email: null,
  });

  if (rpcError) return err(rpcError.message, 500);

  const result = rpcResult as { total: number; inserted: number; skipped: number };

  // Step 2: For newly-inserted records, verify with Paystack and flag discrepancies.
  // We fetch records that are still 'matched' and have a provider_reference.
  const { data: recs } = await supabase
    .from("reconciliation_records")
    .select("id, internal_reference, provider_reference, internal_amount_kobo, internal_settled_at")
    .eq("status", "matched")
    .gte("internal_settled_at", from)
    .lte("internal_settled_at", to);

  let discrepancies = 0;
  for (const rec of (recs ?? []) as any[]) {
    if (!rec.provider_reference) continue;

    // Verify with Paystack
    const verifyResult = await verifyTransaction(rec.internal_reference);
    if (!verifyResult.success || !verifyResult.data) {
      // Can't verify — flag as unmatched_provider
      await supabase.rpc("flag_reconciliation_discrepancy", {
        p_record_id: rec.id,
        p_status: "unmatched_provider",
        p_provider_amount: null,
        p_provider_settled_at: null,
        p_notes: `Paystack verify failed: ${verifyResult.error}`,
      });
      discrepancies++;
      continue;
    }

    const txn = verifyResult.data;
    let newStatus: string | null = null;

    if (txn.amount !== Number(rec.internal_amount_kobo)) {
      newStatus = "amount_discrepancy";
    } else if (txn.status !== "success") {
      newStatus = "unmatched_provider";
    }

    if (newStatus) {
      await supabase.rpc("flag_reconciliation_discrepancy", {
        p_record_id: rec.id,
        p_status: newStatus,
        p_provider_amount: txn.amount,
        p_provider_settled_at: txn.paid_at,
        p_notes: `Paystack reports status=${txn.status}, amount=${txn.amount}`,
      });
      discrepancies++;
    }
  }

  return ok({
    total: result.total,
    inserted: result.inserted,
    skipped: result.skipped,
    discrepancies,
  });
}

export async function resolveReconciliation(
  recordId: string,
  notes: string,
  request?: Request,
): Promise<ServiceResult<{ newStatus: string }>> {
  const authResult = await requireRole(["finance_admin", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  if (!notes.trim()) return err("Resolution notes are required", 400);

  const { data, error } = await supabase.rpc("resolve_reconciliation", {
    p_record_id: recordId,
    p_notes: notes,
    p_actor_email: null,
  });

  if (error) {
    if (error.message.includes("Not authenticated")) return err(error.message, 401);
    if (error.message.includes("Not authorized")) return err(error.message, 403);
    if (error.message.includes("not found")) return err(error.message, 404);
    if (error.message.includes("required")) return err(error.message, 400);
    return err(error.message, 500);
  }
  return ok({ newStatus: String(data ?? "") });
}
