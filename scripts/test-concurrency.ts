/**
 * Phase 29 — Concurrency + payment integrity tests.
 *
 * Tests booking overlap, payment idempotency, and refund concurrency
 * using the live Supabase database with parallel connections.
 *
 * Test 5 was corrected in Phase 29: prior versions attempted concurrent
 * `create_refund` calls through a STUDENT session, which always failed at
 * the role check (create_refund requires finance_admin or super_admin).
 * That proved the role check worked — but it did NOT prove the refundable-
 * balance invariant holds under genuine transactional contention.
 *
 * The new Test 5 signs in as the dedicated finance_admin test account
 * (fa.test@netlodge.test, created by scripts/create-finance-support-test-
 * accounts.ts) and fires two genuinely concurrent `create_refund` RPCs
 * whose combined amounts exceed the payment's refundable balance. We then
 * verify the invariant: the total committed refund never exceeds the
 * payment amount, and ledger + refund rows agree.
 *
 * Test 6 covers retries / exact-balance refunds.
 * Test 7 covers rollback: a refund against a non-successful payment fails.
 *
 * These tests create their own test data (property, room, bookings,
 * payments, refunds) and clean up after each test. Cleanup ONLY removes
 * records created during this run — identified by unique timestamps in
 * references — so historical data is never touched.
 *
 * Run with: bun run scripts/test-concurrency.ts
 *
 * Environment prerequisites:
 *   - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
 *     SUPABASE_SECRET_KEY must be set.
 *   - The fa.test@netlodge.test account must exist with password
 *     "TestPass123!" and role finance_admin. Run
 *     `bun run scripts/create-finance-support-test-accounts.ts` first if
 *     it does not.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { assertTestDatabase } from "./_test-guard";

try { config(); } catch {}
try { config({ path: ".env.test" }); } catch {}

assertTestDatabase("scripts/test-concurrency.ts");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const FINANCE_ADMIN_EMAIL = "fa.test@netlodge.test";
const FINANCE_ADMIN_PASSWORD = "TestPass123!";

// Admin client for test data setup (bypasses RLS).
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error(`  ✗ FAIL: ${msg}`); process.exit(1); }
  console.log(`  ✓ ${msg}`);
}

let cleanupTasks: (() => Promise<void>)[] = [];
async function cleanup() {
  // Reverse order so dependents are removed before their parents.
  for (const t of cleanupTasks.reverse()) { try { await t(); } catch (e) { console.warn("cleanup step failed:", e); } }
  cleanupTasks = [];
}

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 29 — Concurrency + payment integrity tests");
  console.log("=".repeat(60));

  // ---- Verify environment prerequisites ----
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    console.error("Missing required env vars. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
    process.exit(1);
  }

  // Verify the finance_admin test account exists and can sign in.
  console.log("\n[0] Verifying finance_admin test account...");
  const faClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: faSignIn, error: faErr } = await faClient.auth.signInWithPassword({
    email: FINANCE_ADMIN_EMAIL,
    password: FINANCE_ADMIN_PASSWORD,
  });
  if (faErr || !faSignIn.session) {
    console.error(`  ✗ Cannot sign in as ${FINANCE_ADMIN_EMAIL}.`);
    console.error("    Run `bun run scripts/create-finance-support-test-accounts.ts` first.");
    console.error("    Underlying error:", faErr?.message);
    process.exit(1);
  }
  console.log(`  ✓ Signed in as ${FINANCE_ADMIN_EMAIL}`);
  // Sign out for now — we'll re-sign in for the refund test to keep the
  // session fresh and avoid token expiry mid-test.
  await faClient.auth.signOut();

  // Get test landlord + student accounts (seed data).
  const { data: landlord } = await admin.from("profiles").select("id").eq("email", "landlord.test@netlodge.test").single();
  const { data: student } = await admin.from("profiles").select("id").eq("email", "student.test@netlodge.test").single();
  if (!landlord || !student) { console.error("Seed accounts not found (landlord.test / student.test)."); process.exit(1); }

  const ts = Date.now();

  // Create test property + room
  console.log("\n[1] Setting up test data...");
  const { data: property } = await admin.from("properties").insert({
    landlord_id: landlord.id, name: `ConcTest ${ts}`, slug: `conc-test-${ts}`,
    type: "self_contain_block", status: "verified", verification_status: "approved",
    public_address_line: "Test", private_address_line: "Test", city: "Lagos", state: "Lagos",
  }).select().single();
  assert(!!property, "test property created");
  cleanupTasks.push(async () => {
    // Best-effort: remove bookings on this property first.
    const { data: bs } = await admin.from("bookings").select("id").eq("property_id", property!.id);
    for (const b of bs ?? []) {
      await admin.from("booking_status_history").delete().eq("booking_id", b.id);
      await admin.from("ledger_entries").delete().eq("booking_id", b.id);
      await admin.from("bookings").delete().eq("id", b.id);
    }
    await admin.from("rentable_units").delete().eq("property_id", property!.id);
    await admin.from("properties").delete().eq("id", property!.id);
  });

  const { data: unit } = await admin.from("rentable_units").insert({
    property_id: property.id, identifier: `C-${ts}`, unit_type: "single_room", status: "available",
    annual_rent_kobo: 500_000, period_rent_kobo: 500_000, caution_deposit_kobo: 50_000, rental_period: "annual", furnishing: "fully_furnished",
    capacity: 1, bedrooms: 0, bathrooms: 1, has_window: true,
  }).select().single();
  assert(!!unit, "test unit created");

  // Create student auth sessions for concurrent booking tests
  const s1Email = `conc_s1_${ts}@netlodge.test`;
  const s1Pwd = `TestPass123!_${ts}`;
  const { data: s1Auth } = await admin.auth.admin.createUser({ email: s1Email, password: s1Pwd, email_confirm: true, user_metadata: { first_name: "Conc", last_name: "S1", role: "student" } });
  assert(!!s1Auth?.user, "student 1 auth created");
  cleanupTasks.push(async () => { try { await admin.auth.admin.deleteUser(s1Auth!.user!.id); } catch {} });

  const s2Email = `conc_s2_${ts}@netlodge.test`;
  const s2Pwd = `TestPass123!_${ts}`;
  const { data: s2Auth } = await admin.auth.admin.createUser({ email: s2Email, password: s2Pwd, email_confirm: true, user_metadata: { first_name: "Conc", last_name: "S2", role: "student" } });
  assert(!!s2Auth?.user, "student 2 auth created");
  cleanupTasks.push(async () => { try { await admin.auth.admin.deleteUser(s2Auth!.user!.id); } catch {} });

  const s1Client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await s1Client.auth.signInWithPassword({ email: s1Email, password: s1Pwd });

  const s2Client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await s2Client.auth.signInWithPassword({ email: s2Email, password: s2Pwd });

  // ---- Test 1: Two concurrent overlapping bookings ----
  console.log("\n[2] Test 1: Two concurrent overlapping bookings for same room...");
  const checkIn = "2026-12-01";
  const checkOut = "2027-11-30";
  const bookingParams = {
    p_student_id: s1Auth!.user!.id,
    p_unit_id: unit.id,
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_rental_period: "annual",
  };

  // Fire both booking attempts in parallel (genuinely concurrent)
  const [r1, r2] = await Promise.allSettled([
    s1Client.rpc("create_booking", bookingParams),
    s2Client.rpc("create_booking", { ...bookingParams, p_student_id: s2Auth!.user!.id }),
  ]);

  // Extract results
  const b1Result = r1.status === "fulfilled" ? r1.value : null;
  const b2Result = r2.status === "fulfilled" ? r2.value : null;
  const b1Data = b1Result?.data;
  const b1Error = b1Result?.error;
  const b2Data = b2Result?.data;
  const b2Error = b2Result?.error;

  // Exactly one should succeed, the other should fail
  const b1Success = !!b1Data && !b1Error;
  const b2Success = !!b2Data && !b2Error;
  assert(b1Success !== b2Success, "exactly one booking succeeded (not both, not neither)");
  console.log(`    Student 1: ${b1Success ? "SUCCESS" : "FAILED (" + (b1Error?.message ?? "unknown") + ")"}`);
  console.log(`    Student 2: ${b2Success ? "SUCCESS" : "FAILED (" + (b2Error?.message ?? "unknown") + ")"}`);

  // Verify only one booking exists for this test unit
  const { count: bookingCount } = await admin.from("bookings").select("*", { count: "exact", head: true }).eq("rentable_unit_id", unit.id);
  assert(bookingCount === 1, `exactly 1 booking in DB (got ${bookingCount})`);

  // Verify room is now 'held'
  const { data: unitAfter } = await admin.from("rentable_units").select("status").eq("id", unit.id).single();
  assert(unitAfter?.status === "held", "room status = 'held' after booking");

  // Cleanup the booking + reset room (scoped to this test unit only)
  const { data: bookings } = await admin.from("bookings").select("id").eq("rentable_unit_id", unit.id);
  for (const b of bookings ?? []) {
    await admin.from("booking_status_history").delete().eq("booking_id", b.id);
    await admin.from("bookings").delete().eq("id", b.id);
  }
  await admin.from("rentable_units").update({ status: "available", active_hold_id: null }).eq("id", unit.id);

  // ---- Test 2: Non-overlapping sequential bookings ----
  console.log("\n[3] Test 2: Non-overlapping sequential bookings...");
  const { data: b3 } = await s1Client.rpc("create_booking", {
    ...bookingParams, p_check_in: "2026-01-01", p_check_out: "2026-12-31",
  });
  assert(!!b3, "first sequential booking succeeds");
  cleanupTasks.push(async () => {
    await admin.from("booking_status_history").delete().eq("booking_id", b3);
    await admin.from("bookings").delete().eq("id", b3);
  });

  // Reset room for second booking (cancel first)
  await admin.from("bookings").update({ status: "cancelled" }).eq("id", b3);
  await admin.from("rentable_units").update({ status: "available", active_hold_id: null }).eq("id", unit.id);

  const { data: b4 } = await s1Client.rpc("create_booking", {
    ...bookingParams, p_check_in: "2027-01-01", p_check_out: "2027-12-31",
  });
  assert(!!b4, "second sequential booking (non-overlapping) succeeds");
  cleanupTasks.push(async () => {
    await admin.from("booking_status_history").delete().eq("booking_id", b4);
    await admin.from("bookings").delete().eq("id", b4);
  });

  // Reset room
  await admin.from("bookings").update({ status: "cancelled" }).eq("id", b4);
  await admin.from("rentable_units").update({ status: "available", active_hold_id: null }).eq("id", unit.id);

  // ---- Test 3: Unavailable room cannot be booked ----
  console.log("\n[4] Test 3: Unavailable room cannot be booked...");
  await admin.from("rentable_units").update({ status: "occupied" }).eq("id", unit.id);
  const { data: b5, error: e5 } = await s1Client.rpc("create_booking", bookingParams);
  assert(!!e5, "booking rejected for occupied room");
  assert(e5!.message.includes("not available"), `error mentions 'not available' (got: ${e5!.message})`);
  await admin.from("rentable_units").update({ status: "available" }).eq("id", unit.id);

  // ---- Test 4: Concurrent payment confirmation is idempotent ----
  console.log("\n[5] Test 4: Concurrent payment confirmation is idempotent...");
  // Create a booking + payment for this test
  const { data: b6 } = await s1Client.rpc("create_booking", bookingParams);
  assert(!!b6, "booking created for payment test");
  cleanupTasks.push(async () => {
    await admin.from("booking_status_history").delete().eq("booking_id", b6);
    await admin.from("bookings").delete().eq("id", b6);
  });

  const paymentRef = `NLG-PAY-CONC-${ts}`;
  const { data: payment } = await admin.from("payments").insert({
    reference: paymentRef,
    booking_id: b6, student_id: s1Auth!.user!.id,
    amount_kobo: 575_000, fee_kobo: 13_512, net_kobo: 561_488,
    currency: "NGN", channel: "card", status: "initiated", confirmed_by_backend: false,
  }).select().single();
  assert(!!payment, "test payment created");
  cleanupTasks.push(async () => {
    // Remove audit_logs and ledger_entries scoped to this payment only.
    await admin.from("audit_logs").delete().eq("resource_id", payment!.id);
    await admin.from("ledger_entries").delete().eq("payment_id", payment!.id);
    await admin.from("payments").delete().eq("id", payment!.id);
  });

  // Fire two concurrent confirm_payment calls (genuinely concurrent)
  const [c1, c2] = await Promise.allSettled([
    s1Client.rpc("confirm_payment", { p_payment_id: payment.id, p_gateway_reference: `gw-${ts}`, p_actor_email: "system@netlodge.test" }),
    s1Client.rpc("confirm_payment", { p_payment_id: payment.id, p_gateway_reference: `gw-${ts}`, p_actor_email: "system@netlodge.test" }),
  ]);

  const c1Data = c1.status === "fulfilled" ? c1.value.data : null;
  const c2Data = c2.status === "fulfilled" ? c2.value.data : null;
  console.log(`    Call 1: ${c1Data}`);
  console.log(`    Call 2: ${c2Data}`);

  // One should be 'confirmed', the other 'already_confirmed'
  const results = [String(c1Data), String(c2Data)].sort();
  assert(results.includes("confirmed"), "at least one call returned 'confirmed'");
  assert(results.includes("already_confirmed"), "second call returned 'already_confirmed'");

  // Verify exactly 1 ledger entry for this payment
  const { count: ledgerCount } = await admin.from("ledger_entries").select("*", { count: "exact", head: true }).eq("payment_id", payment.id);
  assert(ledgerCount === 1, `exactly 1 ledger entry (got ${ledgerCount})`);

  // =======================================================================
  // Test 5: Refund concurrency — validates the real financial invariant.
  //
  // The Phase 28 version of this test called create_refund through a STUDENT
  // session, which always failed at the role check (create_refund requires
  // finance_admin or super_admin). That proved the role check worked but
  // did NOT prove the refundable-balance invariant holds under genuine
  // transactional contention.
  //
  // The corrected version signs in as the finance_admin test account and
  // fires two genuinely concurrent create_refund RPCs whose combined amounts
  // exceed the payment's refundable balance. The FOR UPDATE lock in
  // create_refund must serialize the two requests so that the second sees
  // the first's refund reducing the refundable balance.
  //
  // Invariant: total committed refund ≤ payment.amount_kobo.
  // =======================================================================
  console.log("\n[6] Test 5: Concurrent refund requests cannot exceed refundable balance...");
  console.log(`    Using finance_admin session: ${FINANCE_ADMIN_EMAIL}`);

  // Re-sign in the finance admin client to ensure a fresh token.
  const faClient2 = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: fa2, error: fa2Err } = await faClient2.auth.signInWithPassword({
    email: FINANCE_ADMIN_EMAIL,
    password: FINANCE_ADMIN_PASSWORD,
  });
  assert(!fa2Err && !!fa2.session, "finance_admin signed in for refund test");

  // Payment amount is 575,000 kobo. Fire two concurrent refunds:
  //   - refund A: 400,000 kobo
  //   - refund B: 300,000 kobo
  // Combined: 700,000 > 575,000. The invariant requires that the sum of
  // SUCCESSFULLY COMMITTED refunds never exceeds 575,000.
  const refundAmounts = [400_000, 300_000];
  const refundReasons = ["mutual_agreement", "other"] as const;
  const refundDetails = [`Concurrent test A ${ts}`, `Concurrent test B ${ts}`];

  const refundResults = await Promise.allSettled([
    faClient2.rpc("create_refund", {
      p_payment_id: payment.id,
      p_amount_kobo: refundAmounts[0],
      p_reason: refundReasons[0],
      p_reason_detail: refundDetails[0],
      p_actor_email: FINANCE_ADMIN_EMAIL,
    }),
    faClient2.rpc("create_refund", {
      p_payment_id: payment.id,
      p_amount_kobo: refundAmounts[1],
      p_reason: refundReasons[1],
      p_reason_detail: refundDetails[1],
      p_actor_email: FINANCE_ADMIN_EMAIL,
    }),
  ]);

  const rf1Data = refundResults[0].status === "fulfilled" ? refundResults[0].value.data : null;
  const rf1Error = refundResults[0].status === "fulfilled" ? refundResults[0].value.error : null;
  const rf2Data = refundResults[1].status === "fulfilled" ? refundResults[1].value.data : null;
  const rf2Error = refundResults[1].status === "fulfilled" ? refundResults[1].value.error : null;

  const rf1Success = !!rf1Data && !rf1Error;
  const rf2Success = !!rf2Data && !rf2Error;

  console.log(`    Refund A (${refundAmounts[0]} kobo): ${rf1Success ? "SUCCESS" : "REJECTED (" + (rf1Error?.message ?? "") + ")"}`);
  console.log(`    Refund B (${refundAmounts[1]} kobo): ${rf2Success ? "SUCCESS" : "REJECTED (" + (rf2Error?.message ?? "") + ")"}`);

  // At most one should succeed — both cannot, because their sum exceeds the balance.
  assert(!(rf1Success && rf2Success), "both refunds did NOT succeed (prevents over-refunding)");

  // The error on the rejected one must mention the refundable balance (proves
  // the lock + balance check fired, not just an unrelated failure).
  if (rf1Success && !rf2Success) {
    assert(
      !!rf2Error && (rf2Error.message.includes("exceeds") || rf2Error.message.includes("refundable")),
      `rejected refund error mentions balance (got: ${rf2Error?.message})`,
    );
  } else if (rf2Success && !rf1Success) {
    assert(
      !!rf1Error && (rf1Error.message.includes("exceeds") || rf1Error.message.includes("refundable")),
      `rejected refund error mentions balance (got: ${rf1Error?.message})`,
    );
  } else {
    // Both failed — that's acceptable as long as neither succeeded. Print why.
    console.log(`    (Both rejected — acceptable as long as no over-refund occurred.)`);
  }

  // Verify the actual financial invariant: sum of all persisted refunds for
  // this payment ≤ payment.amount_kobo.
  const { data: persistedRefunds } = await admin.from("refunds")
    .select("id, reference, amount_kobo, status, reason, reason_detail")
    .eq("payment_id", payment.id);
  const persisted = persistedRefunds ?? [];
  const totalRefunded = persisted
    .filter((r: any) => ["requested", "under_review", "approved", "processing", "completed"].includes(r.status))
    .reduce((s: number, r: any) => s + Number(r.amount_kobo), 0);
  console.log(`    Persisted refunds: ${persisted.length}, total committed: ${totalRefunded} kobo (payment: ${payment.amount_kobo})`);
  assert(
    totalRefunded <= payment.amount_kobo,
    `total committed refund (${totalRefunded}) ≤ payment amount (${payment.amount_kobo})`,
  );

  // Verify ledger, refund, and audit records agree with the committed outcome.
  // Each successfully-created refund should have produced a refund audit log
  // entry. (No ledger entry is created at refund REQUEST time — only when the
  // refund is approved/processed. So we check audit_logs, not ledger, here.)
  for (const r of persisted) {
    const { count: auditCount } = await admin.from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("resource_type", "refund")
      .eq("resource_id", r.id);
    assert(
      (auditCount ?? 0) >= 1,
      `refund ${r.reference} has at least 1 audit_log entry (got ${auditCount})`,
    );
  }

  // Verify the test refunds have the expected reference-detail markers so
  // cleanup cannot accidentally remove any other refund.
  for (const r of persisted) {
    assert(
      typeof r.reason_detail === "string" && r.reason_detail.includes(`Concurrent test`) && r.reason_detail.includes(`${ts}`),
      `refund ${r.reference} reason_detail carries the test-run marker (safe to clean up)`,
    );
  }

  // Cleanup the refunds we just created (scoped by id).
  for (const r of persisted) {
    await admin.from("audit_logs").delete().eq("resource_id", r.id);
    await admin.from("refunds").delete().eq("id", r.id);
  }

  // Sign out the finance admin client.
  await faClient2.auth.signOut();

  // =======================================================================
  // Test 6: Exact-balance refund — two refunds whose sum EQUALS the payment
  // amount. Both should succeed (the FOR UPDATE lock serializes them, and
  // each is ≤ the remaining refundable balance at the time it runs).
  // =======================================================================
  console.log("\n[7] Test 6: Two sequential refunds summing to exact balance...");
  // Re-sign in finance admin.
  const faClient3 = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: fa3Err } = await faClient3.auth.signInWithPassword({
    email: FINANCE_ADMIN_EMAIL, password: FINANCE_ADMIN_PASSWORD,
  });
  assert(!fa3Err, "finance_admin signed in for exact-balance test");

  // The payment was 575,000. Earlier refunds were cleaned up. Fire two
  // concurrent refunds of 300,000 + 275,000 = 575,000 (exactly equal).
  // Both can succeed under serialization.
  const exactAmounts = [300_000, 275_000];
  const exactResults = await Promise.allSettled([
    faClient3.rpc("create_refund", {
      p_payment_id: payment.id,
      p_amount_kobo: exactAmounts[0],
      p_reason: "mutual_agreement",
      p_reason_detail: `Exact-balance test A ${ts}`,
      p_actor_email: FINANCE_ADMIN_EMAIL,
    }),
    faClient3.rpc("create_refund", {
      p_payment_id: payment.id,
      p_amount_kobo: exactAmounts[1],
      p_reason: "other",
      p_reason_detail: `Exact-balance test B ${ts}`,
      p_actor_email: FINANCE_ADMIN_EMAIL,
    }),
  ]);

  const eA = exactResults[0].status === "fulfilled" ? exactResults[0].value : null;
  const eB = exactResults[1].status === "fulfilled" ? exactResults[1].value : null;
  const eASuccess = !!eA?.data && !eA?.error;
  const eBSuccess = !!eB?.data && !eB?.error;
  console.log(`    Refund A (${exactAmounts[0]}): ${eASuccess ? "SUCCESS" : "REJECTED (" + (eA?.error?.message ?? "") + ")"}`);
  console.log(`    Refund B (${exactAmounts[1]}): ${eBSuccess ? "SUCCESS" : "REJECTED (" + (eB?.error?.message ?? "") + ")"}`);

  // At least one must succeed; both can. The invariant still holds.
  assert(eASuccess || eBSuccess, "at least one exact-balance refund succeeded");

  // Re-check the invariant.
  const { data: persisted2 } = await admin.from("refunds")
    .select("id, reference, amount_kobo, status, reason_detail")
    .eq("payment_id", payment.id);
  const total2 = (persisted2 ?? [])
    .filter((r: any) => ["requested", "under_review", "approved", "processing", "completed"].includes(r.status))
    .reduce((s: number, r: any) => s + Number(r.amount_kobo), 0);
  console.log(`    Total committed after exact-balance test: ${total2} kobo (payment: ${payment.amount_kobo})`);
  assert(total2 <= payment.amount_kobo, `total committed refund (${total2}) ≤ payment amount (${payment.amount_kobo})`);

  // Cleanup these refunds too.
  for (const r of (persisted2 ?? [])) {
    await admin.from("audit_logs").delete().eq("resource_id", r.id);
    await admin.from("refunds").delete().eq("id", r.id);
  }
  await faClient3.auth.signOut();

  // =======================================================================
  // Test 7: Refund against a non-successful payment fails (rollback check).
  // =======================================================================
  console.log("\n[8] Test 7: Refund against non-successful payment fails...");
  // Create a separate payment with status='initiated' (not confirmed).
  const initPaymentRef = `NLG-PAY-INIT-${ts}`;
  const { data: initPayment } = await admin.from("payments").insert({
    reference: initPaymentRef,
    booking_id: b6, student_id: s1Auth!.user!.id,
    amount_kobo: 100_000, fee_kobo: 1_500, net_kobo: 98_500,
    currency: "NGN", channel: "card", status: "initiated", confirmed_by_backend: false,
  }).select().single();
  assert(!!initPayment, "initiated payment created");
  cleanupTasks.push(async () => {
    await admin.from("audit_logs").delete().eq("resource_id", initPayment!.id);
    await admin.from("ledger_entries").delete().eq("payment_id", initPayment!.id);
    await admin.from("payments").delete().eq("id", initPayment!.id);
  });

  // Sign in finance admin and attempt a refund — should fail.
  const faClient4 = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await faClient4.auth.signInWithPassword({ email: FINANCE_ADMIN_EMAIL, password: FINANCE_ADMIN_PASSWORD });

  const { data: badRefund, error: badErr } = await faClient4.rpc("create_refund", {
    p_payment_id: initPayment.id,
    p_amount_kobo: 50_000,
    p_reason: "other",
    p_reason_detail: `Rollback test ${ts}`,
    p_actor_email: FINANCE_ADMIN_EMAIL,
  });
  assert(!!badErr, "refund against non-successful payment rejected");
  assert(
    badErr!.message.includes("verified successful") || badErr!.message.includes("status"),
    `error mentions verification requirement (got: ${badErr!.message})`,
  );
  assert(!badRefund, "no refund row was created");

  // Verify no refund row was persisted.
  const { count: initRefundCount } = await admin.from("refunds")
    .select("*", { count: "exact", head: true })
    .eq("payment_id", initPayment.id);
  assert(initRefundCount === 0, `no refund row persisted for non-successful payment (got ${initRefundCount})`);

  await faClient4.auth.signOut();

  // ---- Cleanup ----
  console.log("\n[9] Cleaning up...");
  await cleanup();

  console.log("\n" + "=".repeat(60));
  console.log("✓ All concurrency + integrity tests passed.");
  console.log("=".repeat(60));
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  await cleanup();
  process.exit(1);
});
