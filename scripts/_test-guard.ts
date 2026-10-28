/**
 * Fail-closed environment guard for database-writing test scripts.
 *
 * PROBLEM
 * -------
 * The test scripts in this directory (test-concurrency, test-confirm-payment,
 * test-phase9-integrity, test-admin-rpcs, test-finance-support-rpcs,
 * test-phase8-student-storage) create real database records — properties,
 * bookings, payments, refunds, payouts, ledger entries, audit logs, auth
 * users — using the same Supabase project that the production app uses.
 *
 * There is no separate test database in the current deployment. Running
 * these scripts against the production Supabase project pollutes production
 * with test records and risks corrupting real financial history.
 *
 * SOLUTION
 * --------
 * Every database-writing test script MUST call `assertTestDatabase()` before
 * it does anything else. The guard refuses to run unless one of the
 * following is true:
 *
 *   1. The environment variable `NETLODGE_TEST_DB` is set to the EXACT
 *      project ref of a separate, non-production Supabase project, AND
 *      `NEXT_PUBLIC_SUPABASE_URL` points to that same project.
 *
 *   2. The environment variable `NETLODGE_ALLOW_PROD_TESTS=1` is set, AND
 *      the script is being run interactively by a human who has reviewed
 *      the cleanup logic. This escape hatch is logged prominently.
 *
 * `NODE_ENV=test` is NOT sufficient — it does not prove the database is
 * isolated. A separate project ref is required.
 *
 * USAGE
 * -----
 *   import { assertTestDatabase } from "./_test-guard";
 *   assertTestDatabase();
 *   // ... rest of test
 *
 * This module is imported only by test scripts. It must not be imported
 * from production code.
 */

const PRODUCTION_PROJECT_REF = "psmjjypiulliudepiurx";

/**
 * Refuse to run a database-writing test unless the target database is
 * provably isolated from production.
 *
 * @param scriptPath  Path of the calling script, for clearer error messages.
 */
export function assertTestDatabase(scriptPath?: string): void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const allowProd = process.env.NETLODGE_ALLOW_PROD_TESTS === "1";
  const testDbRef = process.env.NETLODGE_TEST_DB ?? "";

  // Extract the project ref from the Supabase URL.
  // URL form: https://<project-ref>.supabase.co
  const match = supabaseUrl.match(/^https?:\/\/([a-z0-9]+)\.supabase\.(co|in)/i);
  const projectRef = match ? match[1] : "";

  const label = scriptPath ? ` (${scriptPath})` : "";

  // Case 1: explicitly allowed production tests.
  if (allowProd) {
    if (projectRef === PRODUCTION_PROJECT_REF) {
      console.warn("");
      console.warn("=".repeat(72));
      console.warn("⚠  NETLODGE_ALLOW_PROD_TESTS=1 — running against PRODUCTION Supabase.");
      console.warn(`   Project ref: ${projectRef}${label}`);
      console.warn("   Test records WILL be created in the production database.");
      console.warn("   Cleanup is scoped to records created by this run, but a bug in");
      console.warn("   cleanup logic could affect real data. Proceed with caution.");
      console.warn("=".repeat(72));
      console.warn("");
      return;
    }
    // allowProd set but URL points elsewhere — that's fine, fall through.
  }

  // Case 2: separate test database declared and matched.
  if (testDbRef && projectRef === testDbRef && projectRef !== PRODUCTION_PROJECT_REF) {
    console.log(`  ✓ Test database isolated: ${projectRef} (matches NETLODGE_TEST_DB)`);
    return;
  }

  // Case 3: the URL points to a project that is NOT the known production
  // project, and the operator has not explicitly allowed prod tests. This
  // is the happy path for isolated staging/test projects — but we still
  // require the operator to declare the test ref via NETLODGE_TEST_DB so
  // the isolation is explicit, not accidental.
  if (projectRef && projectRef !== PRODUCTION_PROJECT_REF && !testDbRef) {
    console.error("");
    console.error("=".repeat(72));
    console.error("✗  Refusing to run: database isolation not declared.");
    console.error(`   NEXT_PUBLIC_SUPABASE_URL points to project ${projectRef},`);
    console.error("   which is not the known production project. But you have not");
    console.error("   declared it as a test database via NETLODGE_TEST_DB.");
    console.error("");
    console.error("   To proceed, EITHER:");
    console.error("     1. Set NETLODGE_TEST_DB=" + projectRef + "  (confirms this is your test project)");
    console.error("     2. Set NETLODGE_ALLOW_PROD_TESTS=1  (escapes the guard — DANGEROUS)");
    console.error("=".repeat(72) + label);
    console.error("");
    process.exit(2);
  }

  // Case 4: URL points to production and no escape hatch set — refuse.
  if (projectRef === PRODUCTION_PROJECT_REF) {
    console.error("");
    console.error("=".repeat(72));
    console.error("✗  Refusing to run database-writing test against PRODUCTION.");
    console.error(`   NEXT_PUBLIC_SUPABASE_URL points to the production project (${projectRef}).${label}`);
    console.error("");
    console.error("   Test scripts create real records (properties, payments, refunds,");
    console.error("   payouts, audit logs). Running them against production pollutes real");
    console.error("   data and risks corrupting financial history.");
    console.error("");
    console.error("   To proceed, EITHER:");
    console.error("     1. Create a separate Supabase project for testing, set");
    console.error("        NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY to point at it,");
    console.error("        and set NETLODGE_TEST_DB=<that-project-ref>.");
    console.error("     2. Set NETLODGE_ALLOW_PROD_TESTS=1 to acknowledge the risk and");
    console.error("        proceed against production. ONLY do this on a fresh dev");
    console.error("        database that contains no real customer data.");
    console.error("=".repeat(72));
    process.exit(2);
  }

  // Case 5: URL doesn't even match a Supabase pattern — refuse.
  console.error("");
  console.error("✗  Cannot parse a Supabase project ref from NEXT_PUBLIC_SUPABASE_URL.");
  console.error("   Set it to https://<project-ref>.supabase.co and try again.");
  console.error("");
  process.exit(2);
}
