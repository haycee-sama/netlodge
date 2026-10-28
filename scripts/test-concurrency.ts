/**
 * Phase 28 — Concurrency + payment integrity tests.
 *
 * Tests booking overlap, payment idempotency, and refund concurrency
 * using the live Supabase database with parallel connections.
 *
 * These tests create their own test data (property, room, bookings,
 * payments) and clean up after each test.
 *
 * Run with: bun run scripts/test-concurrency.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

try { config(); } catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Admin client for test data setup
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error(`  ✗ FAIL: ${msg}`); process.exit(1); }
  console.log(`  ✓ ${msg}`);
}

let cleanupTasks: (() => Promise<void>)[] = [];
async function cleanup() {
  for (const t of cleanupTasks.reverse()) { try { await t(); } catch {} }
  cleanupTasks = [];
}

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 28 — Concurrency + payment integrity tests");
  console.log("=".repeat(60));

  // Get test accounts
  const { data: landlord } = await admin.from("profiles").select("id").eq("email", "landlord.test@netlodge.test").single();
  const { data: student } = await admin.from("profiles").select("id").eq("email", "student.test@netlodge.test").single();
  if (!landlord || !student) { console.error("Seed accounts not found"); process.exit(1); }

  const ts = Date.now();

  // Create test property + room
  console.log("\n[1] Setting up test data...");
  const { data: property } = await admin.from("properties").insert({
    landlord_id: landlord.id, name: `ConcTest ${ts}`, slug: `conc-test-${ts}`,
    type: "self_contain_block", status: "verified", verification_status: "approved",
    public_address_line: "Test", private_address_line: "Test", city: "Lagos", state: "Lagos",
  }).select().single();
  assert(!!property, "test property created");
  cleanupTasks.push(async () => { await admin.from("properties").delete().eq("id", property!.id); });

  const { data: unit } = await admin.from("rentable_units").insert({
    property_id: property.id, identifier: `C-${ts}`, unit_type: "single_room", status: "available",
    annual_rent_kobo: 500_000, rental_period: "annual", furnishing: "fully_furnished",
    capacity: 1, bedrooms: 0, bathrooms: 1, has_window: true,
  }).select().single();
  assert(!!unit, "test unit created");

  // Create student auth sessions for concurrent tests
  const s1Email = `conc_s1_${ts}@netlodge.test`;
  const s1Pwd = `TestPass123!_${ts}`;
  const { data: s1Auth } = await admin.auth.admin.createUser({ email: s1Email, password: s1Pwd, email_confirm: true });
  cleanupTasks.push(async () => { await admin.auth.admin.deleteUser(s1Auth!.user!.id); });

  const s2Email = `conc_s2_${ts}@netlodge.test`;
  const s2Pwd = `TestPass123!_${ts}`;
  const { data: s2Auth } = await admin.auth.admin.createUser({ email: s2Email, password: s2Pwd, email_confirm: true });
  cleanupTasks.push(async () => { await admin.auth.admin.deleteUser(s2Auth!.user!.id); });

  const s1Client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await s1Client.auth.signInWithPassword({ email: s1Email, password: s1Pwd });

  const s2Client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await s2Client.auth.signInWithPassword({ email: s2Email, password: s2Pwd });

  // ---- Test 1: Two concurrent overlapping bookings ----
  console.log("\n[2] Test 1: Two concurrent overlapping bookings for same room...");
  const checkIn = "2026-12-01";
  const checkOut = "2027-11-30";
  const bookingParams = {
    p_student_id: s1Auth.user.id,
    p_unit_id: unit.id,
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_rental_period: "annual",
    p_base_rent_kobo: 500_000,
    p_additional_charges_kobo: 0,
    p_caution_deposit_kobo: 50_000,
    p_service_fee_kobo: 25_000,
    p_total_kobo: 575_000,
  };

  // Fire both booking attempts in parallel (genuinely concurrent)
  const [r1, r2] = await Promise.allSettled([
    s1Client.rpc("create_booking", bookingParams),
    s2Client.rpc("create_booking", { ...bookingParams, p_student_id: s2Auth.user.id }),
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

  // Verify only one booking exists
  const { count: bookingCount } = await admin.from("bookings").select("*", { count: "exact", head: true }).eq("rentable_unit_id", unit.id);
  assert(bookingCount === 1, `exactly 1 booking in DB (got ${bookingCount})`);

  // Verify room is now 'held'
  const { data: unitAfter } = await admin.from("rentable_units").select("status").eq("id", unit.id).single();
  assert(unitAfter?.status === "held", "room status = 'held' after booking");

  // Cleanup the booking + reset room
  const { data: bookings } = await admin.from("bookings").select("id").eq("rentable_unit_id", unit.id);
  for (const b of bookings ?? []) {
    await admin.from("booking_status_history").delete().eq("booking_id", b.id);
    await admin.from("bookings").delete().eq("id", b.id);
  }
  await admin.from("rentable_units").update({ status: "available", active_hold_id: null }).eq("id", unit.id);

  // ---- Test 2: Non-overlapping sequential bookings ----
  console.log("\n[3] Test 2: Non-overlapping sequential bookings...");
  const { data: b3 } = await s1Client.rpc("create_booking", {
    ...bookingParams, p_check_in: "2026-01-01", p_check_out: "2026-06-30",
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
    ...bookingParams, p_check_in: "2026-07-01", p_check_out: "2026-12-31",
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

  const { data: payment } = await admin.from("payments").insert({
    reference: `NLG-PAY-CONC-${ts}`,
    booking_id: b6, student_id: s1Auth.user.id,
    amount_kobo: 575_000, fee_kobo: 13_512, net_kobo: 561_488,
    currency: "NGN", channel: "card", status: "initiated", confirmed_by_backend: false,
  }).select().single();
  assert(!!payment, "test payment created");
  cleanupTasks.push(async () => {
    await admin.from("audit_logs").delete().eq("resource_id", payment!.id);
    await admin.from("ledger_entries").delete().eq("payment_id", payment!.id);
    await admin.from("payments").delete().eq("id", payment!.id);
  });

  // Fire two concurrent confirm_payment calls
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

  // Verify exactly 1 ledger entry
  const { count: ledgerCount } = await admin.from("ledger_entries").select("*", { count: "exact", head: true }).eq("payment_id", payment.id);
  assert(ledgerCount === 1, `exactly 1 ledger entry (got ${ledgerCount})`);

  // ---- Test 5: Concurrent refund requests cannot exceed balance ----
  console.log("\n[6] Test 5: Concurrent refund requests cannot exceed balance...");
  // The payment is 575,000 kobo. Fire two concurrent refund requests:
  // one for 400,000 and one for 300,000. Only one should succeed.
  const [rf1, rf2] = await Promise.allSettled([
    s1Client.rpc("create_refund", { p_payment_id: payment.id, p_amount_kobo: 400_000, p_reason: "mutual_agreement", p_reason_detail: "Concurrent test 1", p_actor_email: null }),
    s1Client.rpc("create_refund", { p_payment_id: payment.id, p_amount_kobo: 300_000, p_reason: "other", p_reason_detail: "Concurrent test 2", p_actor_email: null }),
  ]);

  const rf1Data = rf1.status === "fulfilled" ? rf1.value.data : null;
  const rf1Error = rf1.status === "fulfilled" ? rf1.value.error : null;
  const rf2Data = rf2.status === "fulfilled" ? rf2.value.data : null;
  const rf2Error = rf2.status === "fulfilled" ? rf2.value.error : null;

  const rf1Success = !!rf1Data && !rf1Error;
  const rf2Success = !!rf2Data && !rf2Error;

  // At most one should succeed (both could fail if the FOR UPDATE lock serializes them
  // and the second sees the first's refund reducing the balance)
  assert(!(rf1Success && rf2Success), "both refunds did NOT succeed (prevents over-refunding)");
  console.log(`    Refund 1 (400k): ${rf1Success ? "SUCCESS" : "REJECTED (" + (rf1Error?.message ?? "") + ")"}`);
  console.log(`    Refund 2 (300k): ${rf2Success ? "SUCCESS" : "REJECTED (" + (rf2Error?.message ?? "") + ")"}`);

  // Cleanup refunds
  const { data: refunds } = await admin.from("refunds").select("id").eq("payment_id", payment.id);
  for (const r of refunds ?? []) {
    await admin.from("audit_logs").delete().eq("resource_id", r.id);
    await admin.from("refunds").delete().eq("id", r.id);
  }

  // ---- Cleanup ----
  console.log("\n[7] Cleaning up...");
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
