/**
 * Phase 29 — Cache invalidation authorization review.
 *
 * The /api/admin/cache-invalidate endpoint uses cookie-based auth (via
 * `createClient()` from @/lib/supabase/server), NOT Bearer tokens. This is
 * correct security design for a mutation endpoint — it ensures the CSRF
 * origin check fires for browser-originated requests.
 *
 * Testing the authenticated behavior therefore requires a real browser
 * session (cookies). This script focuses on what can be verified without
 * a browser session:
 *
 *   1. Unauthenticated POST requests are rejected (401 or 403).
 *   2. The role allowlist in the source code matches least privilege.
 *   3. The tag allowlist in the source code filters arbitrary client tags.
 *   4. GET requests are rejected (POST-only endpoint).
 *
 * The full end-to-end test (landlord can invalidate, finance_admin cannot,
 * cache actually refreshes) requires a browser session and a running Next.js
 * server with a mutated database record. See the manual test plan in the
 * final report.
 *
 * Run with: bun run scripts/test-cache-invalidate.ts
 */

import { config } from "dotenv";
import { readFileSync } from "fs";

try { config(); } catch {}
try { config({ path: ".env.test" }); } catch {}

const APP_URL = process.env.TEST_APP_URL ?? "http://localhost:3000";

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error(`  ✗ FAIL: ${msg}`); process.exit(1); }
  console.log(`  ✓ ${msg}`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 29 — Cache invalidation authorization review");
  console.log("=".repeat(60));

  // ---- 1. Unauthenticated POST rejected ----
  console.log("\n[1] Unauthenticated POST rejected...");
  try {
    const res = await fetch(`${APP_URL}/api/admin/cache-invalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: ["properties"] }),
    });
    assert(res.status !== 200, `unauthenticated POST not 200 (got ${res.status})`);
  } catch (e) {
    console.error(`  ✗ App server at ${APP_URL} not reachable.`);
    console.error("    Start a Next.js dev server: `bun run dev` (in another terminal)");
    console.error("    Or set TEST_APP_URL to point to a running instance.");
    console.error("    Underlying error:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  // ---- 2. GET method rejected ----
  console.log("\n[2] GET method rejected (POST-only endpoint)...");
  const getRes = await fetch(`${APP_URL}/api/admin/cache-invalidate`);
  // GET on a POST-only route returns 405 (Method Not Allowed) in Next.js.
  assert(getRes.status === 405, `GET returns 405 (got ${getRes.status})`);

  // ---- 3. Code inspection: role allowlist ----
  console.log("\n[3] Verifying role allowlist (code inspection)...");
  const routeSrc = readFileSync("src/app/api/admin/cache-invalidate/route.ts", "utf8");

  // The allowlist must include landlord, property_manager, super_admin,
  // verification_officer. It must NOT include finance_admin or support_staff.
  const allowedMatch = routeSrc.match(/\["landlord",\s*"property_manager",\s*"super_admin",\s*"verification_officer"\]/);
  assert(!!allowedMatch, "role allowlist contains landlord, property_manager, super_admin, verification_officer");

  assert(
    !routeSrc.includes("'finance_admin'") && !/\bfinance_admin\b/.test(routeSrc.split("allowed")[1] ?? ""),
    "finance_admin is NOT in the role allowlist",
  );
  assert(
    !routeSrc.includes("'support_staff'") && !/\bsupport_staff\b/.test(routeSrc.split("allowed")[1] ?? ""),
    "support_staff is NOT in the role allowlist",
  );

  // ---- 4. Code inspection: tag allowlist ----
  console.log("\n[4] Verifying tag allowlist (code inspection)...");
  const tagsMatch = routeSrc.match(/ALLOWED_TAGS\s*=\s*\[([^\]]+)\]/);
  assert(!!tagsMatch, "ALLOWED_TAGS array is defined");
  if (tagsMatch) {
    const tags = tagsMatch[1];
    assert(tags.includes('"properties"'), "ALLOWED_TAGS includes 'properties'");
    assert(tags.includes('"universities"'), "ALLOWED_TAGS includes 'universities'");
    assert(tags.includes('"neighbourhoods"'), "ALLOWED_TAGS includes 'neighbourhoods'");
    assert(tags.includes('"units"'), "ALLOWED_TAGS includes 'units'");
    // Ensure arbitrary tag names are not present.
    assert(!tags.includes('"users"'), "ALLOWED_TAGS does NOT include 'users'");
    assert(!tags.includes('"sessions"'), "ALLOWED_TAGS does NOT include 'sessions'");
    assert(!tags.includes('"audit"'), "ALLOWED_TAGS does NOT include 'audit'");
  }

  // ---- 5. Code inspection: filter step ----
  console.log("\n[5] Verifying tag filtering (code inspection)...");
  assert(
    routeSrc.includes("filter((t) => ALLOWED_TAGS.includes(t))"),
    "client-supplied tags are filtered against ALLOWED_TAGS",
  );
  assert(
    routeSrc.includes("No valid tags to invalidate"),
    "request with no valid tags is rejected with 400",
  );

  // ---- 6. End-to-end observation ----
  console.log("\n[6] End-to-end cache refresh observation...");
  console.log("    A full e2e test requires a browser session (cookie auth) and a database");
  console.log("    mutation. The mutation would modify production state, so it is out of");
  console.log("    scope for this automated script.");
  console.log("");
  console.log("    Manual test plan (run on a staging/dev environment):");
  console.log("      1. Sign in as a landlord at http://localhost:3000/login");
  console.log("      2. Open /landlord/properties and edit a property name.");
  console.log("      3. Visit /properties and confirm the new name appears (cache invalidated).");
  console.log("      4. Sign in as finance_admin, attempt to call the invalidation endpoint");
  console.log("         via browser console — should receive 403.");
  console.log("      5. Inspect audit_logs for the invalidation event.");

  console.log("\n" + "=".repeat(60));
  console.log("✓ Cache invalidation authorization review passed.");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
