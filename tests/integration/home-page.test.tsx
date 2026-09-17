/**
 * Phase 2 integration smoke test — React component renders.
 *
 * Uses jsdom (per-file override — see vitest.config.ts default env: "node")
 * to prove the React/Next.js foundation compiles. This is the closest a
 * Phase 2 test can get to exercising the actual app surface without
 * booting the dev server or hitting Supabase.
 *
 * The home page is a Server Component that imports `getCurrentSession`
 * from `@/server/auth`. To test rendering without a real Supabase session,
 * we mock the auth module to return `null` (no session).
 *
 * Because `HomePage` is an async Server Component, full HTML rendering
 * requires the React 19 `renderToPipeableStream` API which doesn't fit
 * the synchronous `renderToStaticMarkup` pattern. We instead verify:
 *   1. The page module imports without error.
 *   2. The default export is a valid React component (callable).
 *   3. The mock for `getCurrentSession` is in place.
 *
 * Full HTML rendering of auth-aware pages is verified by the Playwright
 * E2E smoke test (`tests/e2e/smoke.spec.ts`) against the running dev server.
 */
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

// `vi.hoisted` runs the factory BEFORE `vi.mock` is hoisted, so the mock
// factory can safely reference the mock function.
const { getCurrentSessionMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/auth", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

import HomePage from "@/app/page";

describe("home page (Phase 2 — unauthenticated view)", () => {
  it("imports without error", () => {
    expect(HomePage).toBeDefined();
    expect(typeof HomePage).toBe("function");
  });

  it("calls getCurrentSession when rendered (auth boundary is wired up)", async () => {
    // HomePage is an async Server Component — call it directly to verify
    // it awaits getCurrentSession.
    getCurrentSessionMock.mockClear();
    await HomePage();
    expect(getCurrentSessionMock).toHaveBeenCalledTimes(1);
  });

  it("the auth module is mockable (no hard binding to env / Supabase)", () => {
    expect(getCurrentSessionMock).toBeDefined();
  });
});
