/**
 * Phase 5 — confirm_payment RPC integration test
 *
 * Verifies the atomic confirmation logic against the live Supabase project.
 * Creates test property/booking/payment data using the existing seed test
 * accounts (landlord.test + student.test), exercises the confirm_payment RPC,
 * and asserts idempotency + state transitions.
 *
 * Run with: bun run scripts/test-confirm-payment.ts
 *
 * NOTE: Creates and then cleans up its own test data. Uses mocked Paystack
 * references — no real payment is initiated.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { assertTestDatabase } from "./_test-guard";

try { config(); } catch {}

assertTestDatabase("scripts/test-confirm-payment.ts");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  ✗ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 5 — confirm_payment RPC integration test");
  console.log("=".repeat(60));

  // Look up existing seed test accounts
  const { data: landlord } = await supabase
    .from("profiles").select("id").eq("email", "landlord.test@netlodge.test").single();
  const { data: student } = await supabase
    .from("profiles").select("id").eq("email", "student.test@netlodge.test").single();

  if (!landlord || !student) {
    console.error("Test accounts (landlord.test / student.test) not found. Register them first via /register.");
    process.exit(1);
  }
  console.log(`  landlord: ${landlord.id}`);
  console.log(`  student:  ${student.id}`);

  const ts = Date.now();

  console.log("\n[1] Creating test property + rentable unit...");
  const { data: property, error: propErr } = await supabase.from("properties")
    .insert({
      landlord_id: landlord.id,
      name: `Phase5 Test Property ${ts}`,
      slug: `phase5-test-${ts}`,
      type: "self_contain_block",
      status: "verified",
      verification_status: "approved",
      public_address_line: "Test Address",
      private_address_line: "Test Private Address",
      city: "Lagos",
      state: "Lagos",
    })
    .select().single();
  if (propErr) console.error("  propErr:", propErr.message);
  assert(!!property && !propErr, "property created");

  const { data: unit, error: unitErr } = await supabase.from("rentable_units")
    .insert({
      property_id: property.id,
      identifier: `T-${ts}`,
      unit_type: "single_room",
      status: "held",
      annual_rent_kobo: 500_000,
      rental_period: "annual",
      furnishing: "fully_furnished",
      capacity: 1,
      bedrooms: 0,
      bathrooms: 1,
      has_window: true,
    })
    .select().single();
  if (unitErr) console.error("  unitErr:", unitErr.message);
  assert(!!unit && !unitErr, "rentable unit created");

  console.log("\n[2] Creating test booking + payment...");
  const holdExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: booking, error: bookingErr } = await supabase.from("bookings")
    .insert({
      reference: `NLG-BKG-${ts}`,
      student_id: student.id,
      property_id: property.id,
      rentable_unit_id: unit.id,
      check_in: "2026-01-01",
      check_out: "2026-12-31",
      rental_period: "annual",
      base_rent_kobo: 500_000,
      additional_charges_kobo: 0,
      caution_deposit_kobo: 50_000,
      service_fee_kobo: 10_000,
      total_kobo: 560_000,
      paid_kobo: 0,
      outstanding_kobo: 560_000,
      status: "pending_payment",
      current_step: "booking_creation",
      hold_expires_at: holdExpires,
    })
    .select().single();
  if (bookingErr) console.error("  bookingErr:", bookingErr.message);
  assert(!!booking && !bookingErr, "booking created");

  // Mark unit as held for this booking (the schema has no separate holds table;
  // rentable_units.active_hold_id is set to the booking id)
  await supabase.from("rentable_units").update({ active_hold_id: booking.id }).eq("id", unit.id);

  const { data: payment, error: paymentErr } = await supabase.from("payments")
    .insert({
      reference: `NLG-PAY-TEST-${ts}`,
      booking_id: booking.id,
      student_id: student.id,
      amount_kobo: 560_000,
      fee_kobo: 13_160,
      net_kobo: 546_840,
      currency: "NGN",
      channel: "card",
      status: "initiated",
      confirmed_by_backend: false,
    })
    .select().single();
  if (paymentErr) console.error("  paymentErr:", paymentErr.message);
  assert(!!payment && !paymentErr, "payment created");

  // ---- Test 1: First confirmation call should return 'confirmed' ----
  console.log("\n[3] Test 1: First confirm_payment call...");
  const { data: r1, error: e1 } = await supabase.rpc("confirm_payment", {
    p_payment_id: payment.id,
    p_gateway_reference: `paystack-${ts}`,
    p_actor_email: "system@netlodge.test",
  });
  if (e1) console.error("  rpcErr:", e1.message);
  assert(!e1, `first call succeeds (no error)${e1 ? ` — ${e1.message}` : ""}`);
  assert(String(r1) === "confirmed", `returns 'confirmed' (got: ${r1})`);

  // Verify booking was flipped
  const { data: booking1 } = await supabase.from("bookings").select("status, paid_kobo, outstanding_kobo").eq("id", booking.id).single();
  assert(booking1?.status === "confirmed", "booking status = 'confirmed'");
  assert(booking1?.paid_kobo === 560_000, `booking paid_kobo = 560000 (got ${booking1?.paid_kobo})`);
  assert(booking1?.outstanding_kobo === 0, `booking outstanding_kobo = 0 (got ${booking1?.outstanding_kobo})`);

  // Verify unit was flipped
  const { data: unit1 } = await supabase.from("rentable_units").select("status, active_booking_id, active_hold_id").eq("id", unit.id).single();
  assert(unit1?.status === "occupied", "rentable_unit status = 'occupied'");
  assert(unit1?.active_booking_id === booking.id, "rentable_unit.active_booking_id = booking.id");
  assert(unit1?.active_hold_id === null, "rentable_unit.active_hold_id = null");

  // Verify payment was flipped
  const { data: payment1 } = await supabase.from("payments").select("status, confirmed_by_backend, gateway_reference").eq("id", payment.id).single();
  assert(payment1?.status === "successful", "payment status = 'successful'");
  assert(payment1?.confirmed_by_backend === true, "payment confirmed_by_backend = true");
  assert(payment1?.gateway_reference === `paystack-${ts}`, "payment gateway_reference set");

  // Verify ledger entry was created
  const { data: ledger, error: ledgerErr } = await supabase.from("ledger_entries")
    .select("id, credit_kobo").eq("entry_type", "payment").eq("reference", payment.reference);
  assert(!ledgerErr && ledger && ledger.length === 1, "exactly one ledger entry created");
  assert(ledger![0].credit_kobo === 560_000, `ledger credit_kobo = 560000 (got ${ledger![0].credit_kobo})`);

  // Verify audit log was created
  const { data: audit, error: auditErr } = await supabase.from("audit_logs")
    .select("id, action, severity").eq("resource_id", payment.id).eq("action", "payment.confirmed");
  assert(!auditErr && audit && audit.length >= 1, "audit log entry created");

  // ---- Test 2: Second call (idempotency) should return 'already_confirmed' ----
  console.log("\n[4] Test 2: Second confirm_payment call (idempotency)...");
  const { data: r2, error: e2 } = await supabase.rpc("confirm_payment", {
    p_payment_id: payment.id,
    p_gateway_reference: `paystack-${ts}`,
    p_actor_email: "system@netlodge.test",
  });
  assert(!e2, `second call succeeds (no error)${e2 ? ` — ${e2.message}` : ""}`);
  assert(String(r2) === "already_confirmed", `returns 'already_confirmed' (got: ${r2})`);

  // Verify NO duplicate ledger entry was created
  const { data: ledger2 } = await supabase.from("ledger_entries")
    .select("id").eq("entry_type", "payment").eq("reference", payment.reference);
  assert(!!ledger2 && ledger2.length === 1, `no duplicate ledger entry (count: ${ledger2?.length})`);

  // Verify booking paid_kobo was NOT double-incremented
  const { data: booking2 } = await supabase.from("bookings").select("paid_kobo").eq("id", booking.id).single();
  assert(booking2?.paid_kobo === 560_000, `paid_kobo still 560000 after second call (got ${booking2?.paid_kobo})`);

  // ---- Test 3: Cancelled-booking reconciliation path ----
  console.log("\n[5] Test 3: Cancelled-booking reconciliation...");
  // Make a second unit since the first is now occupied
  const { data: unit3, error: u3err } = await supabase.from("rentable_units")
    .insert({
      property_id: property.id,
      identifier: `T3-${ts}`,
      unit_type: "single_room",
      status: "available",
      annual_rent_kobo: 500_000,
      rental_period: "annual",
      furnishing: "fully_furnished",
      capacity: 1, bedrooms: 0, bathrooms: 1, has_window: true,
    }).select().single();
  assert(!!unit3 && !u3err, "second rentable unit created");

  const { data: booking3, error: b3err } = await supabase.from("bookings")
    .insert({
      reference: `NLG-BKG-C-${ts}`,
      student_id: student.id,
      property_id: property.id,
      rentable_unit_id: unit3.id,
      check_in: "2026-01-01",
      check_out: "2026-12-31",
      rental_period: "annual",
      base_rent_kobo: 500_000,
      total_kobo: 500_000,
      paid_kobo: 0,
      outstanding_kobo: 500_000,
      status: "cancelled",
      current_step: "availability_check",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: "test cancelled",
    }).select().single();
  if (b3err) console.error("  b3err:", b3err.message);
  assert(!!booking3 && !b3err, "cancelled booking created");

  const { data: payment3, error: p3err } = await supabase.from("payments")
    .insert({
      reference: `NLG-PAY-C-${ts}`,
      booking_id: booking3.id,
      student_id: student.id,
      amount_kobo: 500_000,
      fee_kobo: 11_750,
      net_kobo: 488_250,
      currency: "NGN",
      channel: "card",
      status: "initiated",
      confirmed_by_backend: false,
    }).select().single();
  assert(!!payment3 && !p3err, "payment for cancelled booking created");

  const { data: r3, error: e3 } = await supabase.rpc("confirm_payment", {
    p_payment_id: payment3.id,
    p_gateway_reference: `paystack-cancelled-${ts}`,
    p_actor_email: "system@netlodge.test",
  });
  if (e3) console.error("  rpcErr:", e3.message);
  assert(!e3, `cancelled-booking call succeeds (no error)${e3 ? ` — ${e3.message}` : ""}`);
  assert(String(r3) === "needs_reconciliation", `returns 'needs_reconciliation' (got: ${r3})`);

  // Payment should still be marked successful (the money was received)
  const { data: payment3after } = await supabase.from("payments").select("status, confirmed_by_backend").eq("id", payment3.id).single();
  assert(payment3after?.status === "successful", "payment3 status = 'successful'");
  assert(payment3after?.confirmed_by_backend === true, "payment3 confirmed_by_backend = true");

  // Booking should NOT be confirmed
  const { data: booking3after } = await supabase.from("bookings").select("status").eq("id", booking3.id).single();
  assert(booking3after?.status === "cancelled", "booking3 status remains 'cancelled'");

  // ---- Cleanup ----
  console.log("\n[6] Cleaning up test data...");
  await supabase.from("audit_logs").delete().eq("resource_id", payment.id);
  await supabase.from("audit_logs").delete().eq("resource_id", payment3.id);
  await supabase.from("ledger_entries").delete().eq("payment_id", payment.id);
  await supabase.from("ledger_entries").delete().eq("payment_id", payment3.id);
  await supabase.from("booking_status_history").delete().eq("booking_id", booking.id);
  await supabase.from("payments").delete().in("id", [payment.id, payment3.id]);
  await supabase.from("bookings").delete().in("id", [booking.id, booking3.id]);
  await supabase.from("rentable_units").delete().in("id", [unit.id, unit3.id]);
  await supabase.from("properties").delete().eq("id", property.id);

  console.log("\n" + "=".repeat(60));
  console.log("✓ All Phase 5 confirm_payment tests passed.");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
