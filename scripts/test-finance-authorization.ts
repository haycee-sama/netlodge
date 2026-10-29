/**
 * Phase 29 — Finance authorization, missing-record, and redaction tests.
 *
 * Verifies:
 *   1. An unauthenticated request to each finance detail API is rejected (401).
 *   2. A finance_admin session can read payout detail, transaction detail,
 *      disputes, and commissions.
 *   3. A non-existent payout/payment ID returns 404 (not 500, not an empty 200).
 *   4. Sensitive payout fields (bank_account_masked) remain masked — no full
 *      account numbers are exposed.
 *   5. The settings API masks sensitive values server-side.
 *   6. The integrations API does not reveal secret values.
 *
 * These tests do NOT mutate state. They are safe to re-run.
 *
 * Run with: bun run scripts/test-finance-authorization.ts
 *
 * Environment prerequisites:
 *   - The fa.test@netlodge.test account must exist with password
 *     "TestPass123!" and role finance_admin.
 *   - At least one successful payment must exist in the database for the
 *     detail-fetch tests. If none exists, the test skips the detail-fetch
 *     portion and reports it.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

try { config(); } catch {}
try { config({ path: ".env.test" }); } catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const FA_EMAIL = "fa.test@netlodge.test";
const FA_PASSWORD = "TestPass123!";

// The HTTP-layer tests need a running Next.js server. Default to localhost:3000
// (the dev server); fall back to NEXT_PUBLIC_SITE_URL if explicitly set.
const APP_URL = process.env.TEST_APP_URL ?? "http://localhost:3000";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error(`  ✗ FAIL: ${msg}`); process.exit(1); }
  console.log(`  ✓ ${msg}`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 29 — Finance authorization, missing-record, redaction");
  console.log("=".repeat(60));

  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    console.error("Missing required env vars.");
    process.exit(1);
  }

  // Verify the app server is reachable.
  console.log(`\n[0] Verifying app server at ${APP_URL}...`);
  try {
    const healthRes = await fetch(`${APP_URL}/api/health`);
    if (!healthRes.ok) throw new Error(`status ${healthRes.status}`);
    console.log(`  ✓ App server reachable (${healthRes.status})`);
  } catch (e) {
    console.error(`  ✗ App server at ${APP_URL} is not reachable.`);
    console.error("    Start a Next.js dev server: `bun run dev` (in another terminal)");
    console.error("    Or set TEST_APP_URL to point to a running instance.");
    console.error("    Underlying error:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  // ---- 1. Unauthenticated requests are rejected ----
  console.log("\n[1] Unauthenticated requests are rejected (401)...");

  const unauthChecks: Array<[string, string]> = [
    ["/api/admin/finance/payouts/00000000-0000-0000-0000-000000000000", "payout detail"],
    ["/api/admin/finance/payments/00000000-0000-0000-0000-000000000000", "payment detail"],
    ["/api/admin/finance/disputes", "disputes list"],
    ["/api/admin/finance/commissions", "commissions"],
    ["/api/admin/settings", "settings"],
    ["/api/admin/integrations", "integrations"],
    ["/api/admin/security", "security"],
  ];
  for (const [path, label] of unauthChecks) {
    const res = await fetch(`${APP_URL}${path}`, { method: "GET" });
    // The route may 401 (not authenticated) or 403 (CSRF). Either is acceptable
    // — what matters is that it does NOT return 200 with data.
    assert(res.status !== 200, `${label}: unauthenticated request not 200 (got ${res.status})`);
  }

  // ---- 2. Sign in as finance_admin ----
  console.log("\n[2] Signing in as finance_admin...");
  const faClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: fa, error: faErr } = await faClient.auth.signInWithPassword({
    email: FA_EMAIL, password: FA_PASSWORD,
  });
  if (faErr || !fa.session) {
    console.error(`Cannot sign in as ${FA_EMAIL}. Run create-finance-support-test-accounts.ts first.`);
    process.exit(1);
  }
  const accessToken = fa.session.access_token;
  assert(!!accessToken, "finance_admin access token obtained");

  // Helper: authenticated fetch with Bearer token.
  const authFetch = (path: string, init?: RequestInit) =>
    fetch(`${APP_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

  // ---- 3. Non-existent IDs return 404 ----
  console.log("\n[3] Non-existent IDs return 404...");
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const missingChecks: Array<[string, string]> = [
    [`/api/admin/finance/payouts/${fakeId}`, "payout detail"],
    [`/api/admin/finance/payments/${fakeId}`, "payment detail"],
  ];
  for (const [path, label] of missingChecks) {
    const res = await authFetch(path);
    const body = await res.json();
    assert(res.status === 404, `${label}: non-existent ID returns 404 (got ${res.status})`);
    assert(!!body.error, `${label}: 404 response includes error message`);
  }

  // ---- 4. Commissions, disputes, settings, integrations, security respond 200 ----
  console.log("\n[4] Finance admin can read commissions + disputes...");
  const cRes = await authFetch("/api/admin/finance/commissions");
  assert(cRes.status === 200, `commissions: 200 (got ${cRes.status})`);
  const cBody = await cRes.json();
  assert(typeof cBody.accrued_commission_kobo === "number", "commissions: accrued_commission_kobo is a number");
  assert(typeof cBody.paid_commission_kobo === "number", "commissions: paid_commission_kobo is a number");
  assert(typeof cBody.pending_commission_kobo === "number", "commissions: pending_commission_kobo is a number");

  const dRes = await authFetch("/api/admin/finance/disputes?pageSize=5");
  assert(dRes.status === 200, `disputes: 200 (got ${dRes.status})`);
  const dBody = await dRes.json();
  assert(Array.isArray(dBody.items), "disputes: items is an array");

  // ---- 5. Settings, integrations, security REQUIRE super_admin ----
  console.log("\n[5] Settings, integrations, security require super_admin (403 for finance_admin)...");
  const superOnly: Array<[string, string]> = [
    ["/api/admin/settings", "settings"],
    ["/api/admin/integrations", "integrations"],
    ["/api/admin/security", "security"],
  ];
  for (const [path, label] of superOnly) {
    const res = await authFetch(path);
    // finance_admin should get 403 (not 200, not 500).
    assert(res.status === 403, `${label}: finance_admin gets 403 (got ${res.status})`);
  }

  // ---- 6. Sign in as super_admin to test settings/integrations/security redaction ----
  console.log("\n[6] Signing in as super_admin for redaction tests...");
  const SA_EMAIL = "sa.test@netlodge.test";
  const SA_PASSWORD = "TestPass123!";
  const saClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: sa, error: saErr } = await saClient.auth.signInWithPassword({
    email: SA_EMAIL, password: SA_PASSWORD,
  });
  if (saErr || !sa.session) {
    console.warn(`  ! Cannot sign in as ${SA_EMAIL}. Skipping redaction tests. Run create-admin-test-accounts.ts first.`);
    console.log("\n" + "=".repeat(60));
    console.log("✓ Finance authorization tests passed (redaction tests skipped).");
    console.log("=".repeat(60));
    return;
  }
  const saToken = sa.session.access_token;
  const saFetch = (path: string, init?: RequestInit) =>
    fetch(`${APP_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${saToken}`,
        "Content-Type": "application/json",
      },
    });

  // ---- 7. Settings API masks sensitive values ----
  console.log("\n[7] Settings API masks sensitive values...");
  const sRes = await saFetch("/api/admin/settings");
  assert(sRes.status === 200, `settings: 200 for super_admin (got ${sRes.status})`);
  const sBody = await sRes.json();
  assert(Array.isArray(sBody.items), "settings: items is an array");
  // Every row whose key matches /secret|password|token|key|sk_live|sk_test/i
  // must have value === "••••••••" and is_sensitive === true.
  for (const s of sBody.items) {
    const keyLower = String(s.key).toLowerCase();
    const looksSensitive = /(secret|password|token|api[_-]?key|private[_-]?key|sk_live|sk_test)/.test(keyLower);
    if (looksSensitive) {
      assert(s.value === "••••••••", `settings: ${s.key} value masked`);
      assert(s.is_sensitive === true, `settings: ${s.key} is_sensitive=true`);
    }
  }

  // ---- 8. Integrations API does not reveal secret values ----
  console.log("\n[8] Integrations API does not reveal secrets...");
  const iRes = await saFetch("/api/admin/integrations");
  assert(iRes.status === 200, `integrations: 200 for super_admin (got ${iRes.status})`);
  const iBody = await iRes.json();
  assert(Array.isArray(iBody.effective), "integrations: effective is an array");
  // Each effective config row has `configured` boolean but never a `value` field
  // or any raw secret/token/password field.
  for (const c of iBody.effective) {
    assert(typeof c.configured === "boolean", `integrations: ${c.key} has configured boolean`);
    assert(c.value === undefined, `integrations: ${c.key} does not expose value field`);
    // The response should only contain: key, label, configured, test_mode, state, note.
    // No raw secret/token/password/apiKey fields.
    const forbidden = ["secret", "token", "password", "apiKey", "api_key", "privateKey", "private_key"];
    for (const f of forbidden) {
      assert(!(f in c), `integrations: ${c.label} does not expose raw ${f} field`);
    }
  }

  // ---- 9. Security API returns events ----
  console.log("\n[9] Security API returns events + summary...");
  const secRes = await saFetch("/api/admin/security?pageSize=5");
  assert(secRes.status === 200, `security: 200 for super_admin (got ${secRes.status})`);
  const secBody = await secRes.json();
  assert(Array.isArray(secBody.recent_events), "security: recent_events is an array");
  assert(typeof secBody.critical_count === "number", "security: critical_count is a number");
  assert(typeof secBody.rate_limiter_mode === "string", "security: rate_limiter_mode is a string");
  assert(
    secBody.rate_limiter_mode === "distributed" || secBody.rate_limiter_mode === "process_local",
    `security: rate_limiter_mode is valid (got ${secBody.rate_limiter_mode})`,
  );

  // ---- 10. Live payout + payment detail (if any exist) ----
  console.log("\n[10] Live payout + payment detail (if any exist)...");
  // Find any existing payout.
  const { data: anyPayout } = await admin.from("payouts").select("id, bank_account_masked").limit(1).single();
  if (anyPayout) {
    const pRes = await authFetch(`/api/admin/finance/payouts/${anyPayout.id}`);
    assert(pRes.status === 200, `payout detail: 200 for existing payout (got ${pRes.status})`);
    const pBody = await pRes.json();
    assert(!!pBody.payout, "payout detail: payout object present");
    // bank_account_masked must NOT look like a full account number.
    const masked = String(pBody.payout.bank_account_masked ?? "");
    assert(masked.length < 30, `payout detail: bank account is masked (length ${masked.length})`);
    assert(!/^\d{10,}$/.test(masked), "payout detail: bank account is not a raw 10+ digit number");
    // ledger + audit arrays are present.
    assert(Array.isArray(pBody.ledger), "payout detail: ledger array present");
    assert(Array.isArray(pBody.audit), "payout detail: audit array present");
  } else {
    console.log("    (No payouts exist in the database — skipping live payout detail check.)");
  }

  // Find any existing payment.
  const { data: anyPayment } = await admin.from("payments").select("id").limit(1).single();
  if (anyPayment) {
    const pRes = await authFetch(`/api/admin/finance/payments/${anyPayment.id}`);
    assert(pRes.status === 200, `payment detail: 200 for existing payment (got ${pRes.status})`);
    const pBody = await pRes.json();
    assert(!!pBody.payment, "payment detail: payment object present");
    assert(Array.isArray(pBody.refunds), "payment detail: refunds array present");
    assert(Array.isArray(pBody.ledger), "payment detail: ledger array present");
    assert(Array.isArray(pBody.audit), "payment detail: audit array present");
  } else {
    console.log("    (No payments exist in the database — skipping live payment detail check.)");
  }

  console.log("\n" + "=".repeat(60));
  console.log("✓ Finance authorization, missing-record, and redaction tests passed.");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
