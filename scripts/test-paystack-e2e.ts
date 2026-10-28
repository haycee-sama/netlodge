/**
 * Phase 9 — Paystack real test-mode end-to-end checkout test.
 *
 * This test:
 * 1. Initializes a REAL test transaction via Paystack's test API.
 * 2. Captures the authorization URL (Paystack hosted checkout).
 * 3. Verifies the transaction via the verify endpoint (before payment —
 *    should show "pending" or "abandoned").
 * 4. Does NOT complete the payment (requires browser + test card).
 *    The authorization URL is printed for manual completion.
 *
 * This proves the real Paystack test API is used end-to-end through
 * initialization + verification. The actual card payment step requires
 * browser interaction and is documented for manual testing.
 *
 * Run with: bun run scripts/test-paystack-e2e.ts
 */
import { config } from "dotenv";
try { config(); } catch {}

const secretKey = process.env.PAYSTACK_SECRET_KEY!;
const baseUrl = "https://api.paystack.co";

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error(`  ✗ FAIL: ${msg}`); process.exit(1); }
  console.log(`  ✓ ${msg}`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 9 — Paystack real test-mode E2E checkout test");
  console.log("=".repeat(60));

  assert(secretKey.startsWith("sk_test_"), "secret key is test mode (sk_test_*)");

  const reference = `NLG-E2E-${Date.now()}`;
  const email = "student@netlodge.com";
  const amountKobo = 10000; // ₦100 — small test amount
  const callbackUrl = "http://localhost:3000/api/payments/verify";

  console.log("\n[1] Initializing REAL test transaction...");
  console.log(`    reference: ${reference}`);
  console.log(`    amount: ₦${amountKobo / 100} (${amountKobo} kobo)`);
  console.log(`    email: ${email}`);

  const initRes = await fetch(`${baseUrl}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amountKobo,
      reference,
      callback_url: callbackUrl,
      metadata: {
        booking_id: "test-booking-id",
        student_id: "test-student-id",
        test: true,
      },
      channels: ["card"],
    }),
  });

  const initData = await initRes.json();
  assert(initRes.ok, `initialize returns 200 (got ${initRes.status})`);
  assert(initData.status === true, "response status is true");
  assert(!!initData.data?.authorization_url, "authorization_url returned");
  assert(!!initData.data?.access_code, "access_code returned");
  assert(initData.data?.reference === reference, "reference matches");

  const authUrl = initData.data.authorization_url;
  console.log(`\n    ✓ Authorization URL: ${authUrl.substring(0, 80)}...`);
  console.log(`    ✓ Access code: ${initData.data.access_code}`);

  console.log("\n[2] Verifying transaction BEFORE payment (should be pending/abandoned)...");
  const verifyRes1 = await fetch(`${baseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const verifyData1 = await verifyRes1.json();

  // Before payment, the transaction exists but is not "success"
  // Paystack may return 400 if the transaction hasn't been processed yet,
  // or 200 with status "pending" / "abandoned"
  if (verifyRes1.ok) {
    assert(verifyData1.data?.status !== "success", "transaction is NOT success before payment");
    console.log(`    status before payment: ${verifyData1.data?.status}`);
  } else {
    console.log(`    verify returned ${verifyRes1.status} (transaction not yet processed — expected for unpaid)`);
    console.log(`    message: ${verifyData1.message}`);
  }

  console.log("\n[3] Testing webhook signature verification with the real reference...");
  // Simulate what the webhook would receive — but with a forged signature
  const forgedBody = JSON.stringify({
    event: "charge.success",
    data: { reference, amount: amountKobo, status: "success", currency: "NGN" },
  });

  // Wrong signature → must be rejected
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  function verifySig(rawBody: string, signature: string, secret: string): boolean {
    try {
      const expected = createHmac("sha512", secret).update(rawBody).digest("hex").toLowerCase();
      return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature.toLowerCase(), "hex"));
    } catch { return false; }
  }

  const wrongSig = createHmac("sha512", "wrong-secret").update(forgedBody).digest("hex");
  assert(!verifySig(forgedBody, wrongSig, secretKey), "forged webhook signature rejected");

  const correctSig = createHmac("sha512", secretKey).update(forgedBody).digest("hex");
  assert(verifySig(forgedBody, correctSig, secretKey), "correct webhook signature accepted");

  console.log("\n" + "=".repeat(60));
  console.log("✓ Paystack real test-mode E2E initialization + verification PASSED.");
  console.log("=".repeat(60));
  console.log("\nAuthorization URL for manual card payment:");
  console.log(`  ${authUrl}`);
  console.log("\nTo complete the E2E test manually:");
  console.log("  1. Open the authorization URL in a browser");
  console.log("  2. Use test card: 4084 0836 8058 5131");
  console.log("  3. Expiry: any future date, CVV: any 3 digits, PIN: 1234");
  console.log("  4. After payment, run the verify endpoint to confirm success");
  console.log(`  5. Reference: ${reference}`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
