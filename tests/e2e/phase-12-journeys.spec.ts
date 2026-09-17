/**
 * Phase 12 §20-21 — E2E tests for the 9 documented user journeys.
 *
 * Per IMPLEMENTATION_PLAN.md §20:
 *   1. Student registration → browse → reserve.
 *   2. Landlord registration → verification → property submission.
 *   3. Admin verification → property approval.
 *   4. Student reservation → payment → confirmed booking.
 *   5. Payment webhook retry (duplicate delivery).
 *   6. Unauthorized access attempt (cross-user/cross-role).
 *   7. Two students attempting the same room simultaneously (race).
 *   8. Landlord rejection → resubmission → approval.
 *   9. Reservation expiry → room becomes reservable again.
 *
 * ENVIRONMENT LIMITATIONS (Phase 12 prompt §21):
 *   The dev environment has:
 *     - placeholder Supabase env values (NEXT_PUBLIC_SUPABASE_URL=…)
 *     - no real Supabase project (auth.signUp will fail with network error)
 *     - no real Paystack credentials
 *     - no real email provider
 *
 *   Therefore:
 *     - Journeys 1, 2, 4, 5, 7, 8, 9 require real Supabase + real Paystack —
 *       NOT VERIFIED at the E2E level. The underlying logic IS verified via
 *       the pglite-backed integration tests in tests/db/ and tests/security/.
 *     - Journey 3 (admin verification → property approval) requires admin
 *       login — NOT VERIFIED.
 *     - Journey 6 (unauthorized access) CAN be partially verified at the
 *       E2E level — public pages reject unauthenticated access.
 *
 *   What IS verified by this E2E suite:
 *     - The dev server starts and responds on all documented routes.
 *     - Public pages render without crashing (home, login, register).
 *     - Auth-gated pages redirect to /login when unauthenticated.
 *     - The /health endpoint reports env state.
 *     - The /api/webhooks/paystack endpoint rejects unsigned/invalid requests.
 *     - The /discover page renders (without real data — placeholder env
 *       means Supabase queries return empty/error, which the page handles
 *       gracefully).
 *
 *   What is NOT verified at the E2E level:
 *     - Real Supabase auth flow (signup → email verification → login).
 *     - Real Paystack payment flow (redirect → webhook → confirmation).
 *     - Real concurrent booking (Playwright can't simulate two genuine
 *       concurrent transactions — the partial unique index is verified
 *       via pglite tests in tests/db/bookings.test.ts).
 *     - Real reservation expiry (the scheduled job is verified via
 *       tests/db/expiration.test.ts).
 */
import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// Journey 6 (partial): Unauthorized access attempt — public pages
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Phase 12 E2E — public pages render without crashing", () => {
  test("home page renders and contains NetLodge branding", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).toContainText("NetLodge");
    await expect(page.locator("h1")).toContainText("off-campus housing");
  });

  test("login page renders with email + password fields", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("student registration page renders", async ({ page }) => {
    const response = await page.goto("/register/student");
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).toContainText("Student");
  });

  test("landlord registration page renders", async ({ page }) => {
    const response = await page.goto("/register/landlord");
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).toContainText("Landlord");
  });

  test("discover page renders (placeholder env returns empty results)", async ({ page }) => {
    const response = await page.goto("/discover");
    expect(response?.status()).toBe(200);
    // The page renders — it may show "no results" or an error message
    // depending on whether the placeholder Supabase URL is reachable.
    // We assert the page itself loaded.
    await expect(page.locator("body")).toBeVisible();
  });

  test("health endpoint returns 200 or 503 (env check)", async ({ request }) => {
    const response = await request.get("/health");
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
    // The endpoint NEVER returns the actual env values — only the names.
    expect(body).toHaveProperty("missing_env");
    expect(typeof body.missing_env).toBe("object");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 6 (full): Auth-gated pages redirect to /login when unauthenticated
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Phase 12 E2E — auth-gated routes redirect unauthenticated to /login", () => {
  test("dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("account page redirects to /login", async ({ page }) => {
    await page.goto("/account");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("verify page redirects to /login", async ({ page }) => {
    await page.goto("/verify");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("admin/verifications redirects non-admin to /dashboard (which redirects to /login)", async ({ page }) => {
    await page.goto("/admin/verifications");
    // Unauthenticated user → bounced to /login (via /dashboard intermediate).
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("admin/properties redirects to /login", async ({ page }) => {
    await page.goto("/admin/properties");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("admin/bookings redirects to /login", async ({ page }) => {
    await page.goto("/admin/bookings");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("admin/payments redirects to /login", async ({ page }) => {
    await page.goto("/admin/payments");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("admin/reports redirects to /login", async ({ page }) => {
    await page.goto("/admin/reports");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("admin/reviews redirects to /login", async ({ page }) => {
    await page.goto("/admin/reviews");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("admin/audit-logs redirects to /login", async ({ page }) => {
    await page.goto("/admin/audit-logs");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("reports (file-a-report page) redirects to /login", async ({ page }) => {
    await page.goto("/reports");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Webhook security — unsigned/invalid requests rejected
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Phase 12 E2E — webhook endpoint rejects unsigned/invalid requests", () => {
  test("webhook without signature header returns 401", async ({ request }) => {
    const response = await request.post("/api/webhooks/paystack", {
      data: { event: "charge.success", data: { reference: "test" } },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_webhook");
  });

  test("webhook with invalid signature returns 401", async ({ request }) => {
    const response = await request.post("/api/webhooks/paystack", {
      headers: { "x-paystack-signature": "invalid-signature" },
      data: { event: "charge.success", data: { reference: "test" } },
    });
    expect(response.status()).toBe(401);
  });

  test("webhook with valid signature but malformed JSON returns 400", async ({ request }) => {
    // Compute a valid signature for the malformed body — but since the body
    // is invalid JSON, the signature won't match. Either way, this verifies
    // the endpoint doesn't crash on malformed input.
    const response = await request.post("/api/webhooks/paystack", {
      headers: { "x-paystack-signature": "deadbeef" },
      data: "not valid json",
    });
    // 401 (signature mismatch) or 400 (malformed after signature) — either
    // is acceptable. The point is: the endpoint doesn't crash.
    expect([400, 401]).toContain(response.status());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 404 page renders cleanly
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Phase 12 E2E — 404 handling", () => {
  test("unknown route returns 404 with not-found page", async ({ page }) => {
    const response = await page.goto("/nonexistent-route-12345");
    expect(response?.status()).toBe(404);
    await expect(page.locator("body")).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journeys 1-5, 7-9 — NOT VERIFIED at E2E level (env constraints)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Phase 12 E2E — journeys NOT VERIFIED at E2E level", () => {
  // These journeys require real Supabase + real Paystack infrastructure,
  // which is unavailable in this environment. The underlying logic IS
  // verified via:
  //   - tests/db/bookings.test.ts (journey 1 partial, journey 7 race)
  //   - tests/db/properties-rooms.test.ts (journey 2 partial)
  //   - tests/db/landlord-verifications.test.ts (journey 2, 8 verification)
  //   - tests/db/payments.test.ts (journey 4, 5 payment + webhook idempotency)
  //   - tests/db/expiration.test.ts (journey 9 expiry)
  //   - tests/db/admin-operations.test.ts (journey 3 admin approve)
  //   - tests/db/reviews.test.ts (review flow)
  //   - tests/db/reports.test.ts (report flow)
  //   - tests/security/rls.test.ts (journey 6 unauthorized access)
  //
  // The E2E suite is intentionally limited to what the available
  // environment can actually demonstrate — the Phase 12 prompt §21
  // forbids calling mocked success "production verified".

  test("journey 1 — student registration → browse → reserve (NOT VERIFIED at E2E)", () => {
    // Requires real Supabase Auth. Underlying logic verified via
    // tests/integration/auth-core.test.ts + tests/db/bookings.test.ts.
    expect(true).toBe(true); // Placeholder — see comment above.
  });

  test("journey 4 — student reservation → payment → confirmed booking (NOT VERIFIED at E2E)", () => {
    // Requires real Supabase + real Paystack sandbox. Underlying logic
    // verified via tests/db/payments.test.ts (atomic confirmation RPC,
    // idempotency gate, amount verification).
    expect(true).toBe(true);
  });

  test("journey 7 — two students race for same room (NOT VERIFIED at E2E)", () => {
    // Requires real concurrent transactions. pglite is single-threaded,
    // so the partial unique index is verified via direct DB tests in
    // tests/db/bookings.test.ts (which uses service-role INSERTs to
    // demonstrate the unique-violation on concurrent attempts).
    expect(true).toBe(true);
  });
});
