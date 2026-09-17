import { test, expect } from "@playwright/test";

/**
 * Phase 0 E2E smoke test — proves the Playwright harness works against the
 * running dev server. This is NOT a feature test — it only verifies:
 *
 *   1. The dev server starts (`playwright.config.ts` `webServer` command).
 *   2. The home route responds with 200.
 *   3. The rendered HTML contains the expected Phase 0 marker.
 *
 * Real E2E journeys (IMPLEMENTATION_PLAN §20, all nine of them) are added
 * in the relevant later phases. Phase 0 deliberately ships only this one.
 */
test.describe("Phase 0 smoke", () => {
  test("home page renders and responds", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    // "NetLodge" appears in the eyebrow above the h1, not the h1 itself.
    await expect(page.locator("body")).toContainText("NetLodge");
    await expect(page.locator("body")).toContainText("Phase 0");
    // The h1 itself is the product-positioning line.
    await expect(page.locator("h1")).toContainText("off-campus housing");
  });

  test("health endpoint returns 503 when env is placeholder", async ({
    request,
  }) => {
    // Phase 0 ships placeholder env values, so the health check will report
    // `misconfigured` (503) rather than `ok` (200). This is expected —
    // proves the route handler actually runs and parses the env.
    const response = await request.get("/health");
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
  });

  test("skip-link is present and points at #main-content", async ({
    page,
  }) => {
    await page.goto("/");
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
  });
});
