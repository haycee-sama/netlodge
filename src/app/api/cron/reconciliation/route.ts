import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "@/lib/paystack/server";

/**
 * GET /api/cron/reconciliation
 *
 * Scheduled reconciliation endpoint. Authenticates via a CRON_SECRET
 * environment variable (passed as the `authorization` header).
 *
 * The endpoint:
 * 1. Verifies the CRON_SECRET.
 * 2. Fetches successful payments from the last 24 hours.
 * 3. For each, calls Paystack's verify API.
 * 4. Flags discrepancies via the flag_reconciliation_discrepancy RPC.
 * 5. Is idempotent — safe to retry.
 *
 * Deployment: Set up a cron job (e.g. Vercel Cron, GitHub Actions, or
 * external scheduler) to call this endpoint daily:
 *   curl -H "authorization: Bearer $CRON_SECRET" \
 *     https://your-domain.com/api/cron/reconciliation
 *
 * Configure in vercel.json:
 *   { "crons": [{ "path": "/api/cron/reconciliation", "schedule": "0 2 * * *" }] }
 *
 * And set CRON_SECRET in your environment variables.
 */
export async function GET(request: NextRequest) {
  // Authenticate via CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = createAdminClient();
    const supabase = await createClient();

    // Step 0: Release expired booking holds
    // This runs the release_expired_holds() RPC which resets bookings
    // past their hold_expires_at back to expired and frees the room.
    try {
      await adminClient.rpc("release_expired_holds");
      console.log("[cron/reconciliation] Released expired holds");
    } catch (err) {
      console.error("[cron/reconciliation] Failed to release expired holds:", err instanceof Error ? err.message : String(err));
      // Non-fatal — continue with reconciliation
    }

    // Step 0b: Process expired bookings (check_out passed, no renewal)
    // Completes bookings whose period has ended and releases rooms.
    try {
      const { data: expiredCount } = await adminClient.rpc("process_expired_bookings");
      console.log(`[cron/reconciliation] Processed ${expiredCount ?? 0} expired bookings`);
    } catch (err) {
      console.error("[cron/reconciliation] Failed to process expired bookings:", err instanceof Error ? err.message : String(err));
      // Non-fatal — continue with reconciliation
    }

    // Date range: last 24 hours
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

    // Fetch successful payments in the range
    const { data: payments, error: payErr } = await adminClient
      .from("payments")
      .select("id, reference, gateway_reference, amount_kobo, currency, confirmed_at")
      .eq("status", "successful")
      .eq("confirmed_by_backend", true)
      .gte("confirmed_at", from.toISOString())
      .lte("confirmed_at", to.toISOString());

    if (payErr) {
      console.error("[cron/reconciliation] Failed to fetch payments:", payErr.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    let matched = 0;
    let discrepancies = 0;
    let skipped = 0;

    for (const payment of payments ?? []) {
      if (!payment.gateway_reference) {
        skipped++;
        continue;
      }

      // Verify with Paystack
      const verifyResult = await verifyTransaction(payment.reference);
      if (!verifyResult.success || !verifyResult.data) {
        // Can't verify — flag as unmatched_provider
        // Check if a reconciliation record already exists
        const { data: existing } = await adminClient
          .from("reconciliation_records")
          .select("id, status")
          .eq("internal_reference", payment.reference)
          .maybeSingle();

        if (existing) {
          if (existing.status !== "resolved") {
            await supabase.rpc("flag_reconciliation_discrepancy", {
              p_record_id: existing.id,
              p_status: "unmatched_provider",
              p_provider_amount: null,
              p_provider_settled_at: null,
              p_notes: `Paystack verify failed: ${verifyResult.error}`,
            });
          }
        } else {
          await adminClient.from("reconciliation_records").insert({
            internal_reference: payment.reference,
            provider_reference: payment.gateway_reference,
            internal_amount_kobo: payment.amount_kobo,
            status: "unmatched_provider",
            internal_settled_at: payment.confirmed_at,
          });
        }
        discrepancies++;
        continue;
      }

      const txn = verifyResult.data;

      // Check for discrepancies
      let discrepancyStatus: string | null = null;
      if (txn.amount !== payment.amount_kobo) {
        discrepancyStatus = "amount_discrepancy";
      } else if (txn.status !== "success") {
        discrepancyStatus = "unmatched_provider";
      }

      if (discrepancyStatus) {
        const { data: existing } = await adminClient
          .from("reconciliation_records")
          .select("id, status")
          .eq("internal_reference", payment.reference)
          .maybeSingle();

        if (existing) {
          if (existing.status !== "resolved") {
            await supabase.rpc("flag_reconciliation_discrepancy", {
              p_record_id: existing.id,
              p_status: discrepancyStatus as any,
              p_provider_amount: txn.amount,
              p_provider_settled_at: txn.paid_at,
              p_notes: `Paystack reports status=${txn.status}, amount=${txn.amount}`,
            });
          }
        } else {
          await adminClient.from("reconciliation_records").insert({
            internal_reference: payment.reference,
            provider_reference: payment.gateway_reference,
            internal_amount_kobo: payment.amount_kobo,
            provider_amount_kobo: txn.amount,
            internal_settled_at: payment.confirmed_at,
            provider_settled_at: txn.paid_at,
            status: discrepancyStatus,
          });
        }
        discrepancies++;
      } else {
        matched++;
      }
    }

    // Record audit log
    await adminClient.rpc("record_audit", {
      p_actor_id: null,
      p_actor_email: "cron@netlodge.test",
      p_actor_role: "super_admin",
      p_category: "finance",
      p_action: "reconciliation.cron",
      p_resource_type: "reconciliation",
      p_resource_id: `${from.toISOString()}..${to.toISOString()}`,
      p_summary: `Cron reconciliation: ${payments?.length ?? 0} payments, ${matched} matched, ${discrepancies} discrepancies, ${skipped} skipped`,
      p_severity: "info",
    });

    return NextResponse.json({
      status: "ok",
      range: { from: from.toISOString(), to: to.toISOString() },
      total: payments?.length ?? 0,
      matched,
      discrepancies,
      skipped,
    });
  } catch (err) {
    console.error("[cron/reconciliation] Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
