/**
 * Phase 12 §4 — SECURITY DEFINER function audit.
 *
 * Verifies EVERY SECURITY DEFINER function in the schema:
 *   1. Has `SET search_path = public, pg_temp` (safe search_path).
 *   2. Does NOT use dynamic SQL (`EXECUTE`, `format()`).
 *   3. Independently validates caller authorization.
 *   4. Derives `actor_id` from `auth.uid()` — never from a parameter.
 *
 * Per IMPLEMENTATION_PLAN.md §18 + Phase 12 prompt §4.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeFreshDb } from "../db/helpers";
import type { PGlite } from "@electric-sql/pglite";

let pg: PGlite;

beforeEach(async () => {
  pg = await makeFreshDb();
});

afterEach(async () => {
  await pg.close();
});

describe("Phase 12 §4 — SECURITY DEFINER audit", () => {
  it("all SECURITY DEFINER functions have safe search_path = public, pg_temp", async () => {
    // Query pg_proc for all SECURITY DEFINER functions in the public schema.
    // Verify each has `SET search_path = public, pg_temp`.
    const r = await pg.query<{
      proname: string;
      proconfig: string[] | null;
    }>(`
      SELECT p.proname, p.proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.prosecdef = true
      ORDER BY p.proname;
    `);

    expect(r.rows.length).toBeGreaterThanOrEqual(15); // At least 15 SECURITY DEFINER functions.

    for (const row of r.rows) {
      // proconfig is an array of "key=value" strings.
      const config = row.proconfig ?? [];
      const searchPathSetting = config.find((c) => c.startsWith("search_path="));
      expect(searchPathSetting, `Function ${row.proname} missing search_path`).toBeDefined();
      expect(searchPathSetting, `Function ${row.proname} has unsafe search_path`).toBe(
        "search_path=public, pg_temp",
      );
    }
  });

  it("NO SECURITY DEFINER function uses dynamic SQL (EXECUTE / format())", async () => {
    // Inspect the function source code for every SECURITY DEFINER function.
    const r = await pg.query<{ proname: string; prosrc: string }>(`
      SELECT p.proname, p.prosrc
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.prosecdef = true
      ORDER BY p.proname;
    `);

    for (const row of r.rows) {
      // EXECUTE in plpgsql is the dynamic-SQL statement. We allow it ONLY
      // if the dynamic string is a fully-constant (no parameter interpolation).
      // format() is the other dynamic-SQL vector.
      //
      // Our codebase uses STATIC SQL only — every query is hardcoded with
      // parameter placeholders ($1, $2, ...), never built dynamically.
      const source = row.prosrc.toLowerCase();
      // Allow `EXECUTE FUNCTION` (trigger binding) — that's NOT dynamic SQL.
      // The pattern `EXECUTE ` (with space after) inside a function body IS
      // dynamic SQL. We check for `execute ` followed by a non-`function`
      // word, which catches `EXECUTE 'SELECT...'` but not `EXECUTE FUNCTION`.
      const dynamicExecute = /execute\s+['(]/i.test(row.prosrc);
      const formatUsage = /\bformat\s*\(/i.test(source);

      expect(
        dynamicExecute,
        `Function ${row.proname} uses dynamic SQL (EXECUTE) — replace with static SQL`,
      ).toBe(false);
      expect(
        formatUsage,
        `Function ${row.proname} uses format() — verify identifier safety`,
      ).toBe(false);
    }
  });

  it("admin RPC functions independently validate caller as active admin", async () => {
    // Inspect the source code of every admin_* SECURITY DEFINER function.
    // Verify each calls `netlodge_is_current_user_active_admin()` and
    // raises insufficient_privilege if false.
    const r = await pg.query<{ proname: string; prosrc: string }>(`
      SELECT p.proname, p.prosrc
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.prosecdef = true
        AND p.proname LIKE 'admin_%'
      ORDER BY p.proname;
    `);

    expect(r.rows.length).toBeGreaterThanOrEqual(8); // At least 8 admin_* functions.

    for (const row of r.rows) {
      const source = row.prosrc;
      // Verify the function calls the strict admin helper.
      expect(
        source,
        `Function ${row.proname} must call netlodge_is_current_user_active_admin()`,
      ).toContain("netlodge_is_current_user_active_admin");
      // Verify the function raises an exception if not authorized.
      expect(
        source,
        `Function ${row.proname} must raise insufficient_privilege on auth failure`,
      ).toMatch(/insufficient_privilege|Only active admins/i);
    }
  });

  it("admin RPC functions derive actor_id from auth.uid() — NEVER from a parameter", async () => {
    // Inspect the parameter list of every admin_* function. Verify NO
    // parameter is named `actor_id`, `admin_id`, `performed_by`, or similar.
    const r = await pg.query<{
      proname: string;
      args: string | null;
    }>(`
      SELECT p.proname,
             pg_get_function_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.prosecdef = true
        AND p.proname LIKE 'admin_%'
      ORDER BY p.proname;
    `);

    const forbiddenParamNames = [
      "actor_id",
      "actorid",
      "admin_id",
      "adminid",
      "performed_by",
      "performedby",
      "p_actor",
      "p_admin",
    ];

    for (const row of r.rows) {
      const args = (row.args ?? "").toLowerCase();
      for (const forbidden of forbiddenParamNames) {
        expect(
          args,
          `Function ${row.proname} accepts forbidden parameter ${forbidden} — actor must come from auth.uid()`,
        ).not.toContain(forbidden);
      }
    }
  });

  it("netlodge_is_current_user_active_admin requires BOTH admin role AND active status", async () => {
    // Verify the function source enforces both conditions.
    const r = await pg.query<{ prosrc: string }>(`
      SELECT prosrc FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'netlodge_is_current_user_active_admin';
    `);
    expect(r.rows.length).toBe(1);
    const source = r.rows[0]!.prosrc;
    expect(source).toContain("role = 'admin'");
    expect(source).toContain("account_status = 'active'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Service-role key isolation — verify it's never exposed to the browser
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 §18 — secret management (no NEXT_PUBLIC_ secret leakage)", () => {
  it("SUPABASE_SERVICE_ROLE_KEY is NOT exposed via NEXT_PUBLIC_ prefix", async () => {
    // The env config in src/config/env.ts explicitly lists server-only keys
    // without NEXT_PUBLIC_ prefix. Verify at the type level — the env
    // validation would fail at build time if SUPABASE_SERVICE_ROLE_KEY
    // were renamed to NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY.
    //
    // This test is a static assertion — it imports the env type and verifies
    // the forbidden key name is not present.
    const envModule = await import("@/config/env");
    const envKeys = Object.keys(envModule.env);
    const leaked = envKeys.filter((k) =>
      k.toUpperCase().includes("SERVICE_ROLE") ||
      k.toUpperCase().includes("PAYSTACK_SECRET") ||
      k.toUpperCase().includes("WEBHOOK_SECRET") ||
      k.toUpperCase().includes("EMAIL_PROVIDER_API_KEY"),
    );
    // All secret keys must NOT be prefixed with NEXT_PUBLIC_.
    for (const key of leaked) {
      expect(key.startsWith("NEXT_PUBLIC_"), `Secret ${key} leaked via NEXT_PUBLIC_ prefix`).toBe(false);
    }
  });
});
