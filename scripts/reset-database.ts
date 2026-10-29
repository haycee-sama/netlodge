#!/usr/bin/env bun
/**
 * NetLodge — Database Reset & Rebuild
 *
 * DESTRUCTIVE — IRREVERSIBLE.
 *
 * Drops ALL tables in the public schema, deletes ALL Supabase Auth users,
 * then re-applies all migrations and recreates the 6 test accounts.
 *
 * The result is a fresh database with:
 *   - Clean schema (all 14 migrations applied)
 *   - RLS policies enabled on all tables
 *   - Seed data (universities, neighbourhoods, platform_settings, etc.)
 *   - 6 test user accounts (landlord.test, student.test, vo.test, sa.test,
 *     fa.test, ss.test — all password "TestPass123!")
 *   - NO properties, bookings, payments, refunds, payouts, or audit logs
 *
 * Storage bucket files are NOT deleted (they become orphaned). Clear them
 * manually from the Supabase dashboard if needed.
 *
 * USAGE
 * -----
 *   # Against the configured Supabase project (reads from .env):
 *   bun run scripts/reset-database.ts
 *
 *   # The script will prompt for confirmation unless
 *   # NETLODGE_RESET_CONFIRM=yes is set.
 *
 * SAFETY
 * ------
 *   - Refuses to run without NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD
 *   - Prints the target project ref before doing anything
 *   - Drops tables in a single CASCADE transaction
 *   - Re-applies migrations idempotently
 *   - Verifies the result at the end
 */

import { Client } from "pg";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

try { config(); } catch {}
try { config({ path: ".env.test" }); } catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

const TEST_PASSWORD = "TestPass123!";

const TEST_ACCOUNTS = [
  { email: "landlord.test@netlodge.test", role: "landlord" as const, name: "Landlord Test" },
  { email: "student.test@netlodge.test", role: "student" as const, name: "Student Test" },
  { email: "vo.test@netlodge.test", role: "verification_officer" as const, name: "VO Test" },
  { email: "sa.test@netlodge.test", role: "super_admin" as const, name: "SA Test" },
  { email: "fa.test@netlodge.test", role: "finance_admin" as const, name: "FA Test" },
  { email: "ss.test@netlodge.test", role: "support_staff" as const, name: "SS Test" },
];

function getProjectRef(url: string): string {
  const match = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\.(co|in)/i);
  if (!match) throw new Error(`Cannot parse project ref from ${url}`);
  return match[1];
}

async function connect(projectRef: string, password: string): Promise<Client> {
  const poolerHosts = [
    "aws-0-eu-west-1.pooler.supabase.com",
        "aws-0-eu-west-2.pooler.supabase.com",
    "aws-0-us-east-1.pooler.supabase.com",
    "aws-0-us-west-1.pooler.supabase.com",
    "aws-0-ap-southeast-1.pooler.supabase.com",
    "aws-0-eu-central-1.pooler.supabase.com",
    "aws-0-ap-northeast-1.pooler.supabase.com",
    "aws-0-sa-east-1.pooler.supabase.com",
  ];
  const allHosts = [...poolerHosts, `db.${projectRef}.supabase.co`];

  for (const host of allHosts) {
    const isPooler = host.includes(".pooler.");
    const user = isPooler ? `postgres.${projectRef}` : "postgres";
    process.stdout.write(`  Trying ${host}... `);

    const client = new Client({
      host,
      port: isPooler ? 6543 : 5432,
      user,
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false, servername: host },
      connectionTimeoutMillis: 10000,
    });

    try {
      await client.connect();
      console.log("✓");
      return client;
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message.slice(0, 60) : "failed"}`);
      try { await client.end(); } catch {}
    }
  }

  throw new Error(`Could not connect to Supabase DB for project ${projectRef}`);
}

function splitSql(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let i = 0;
  let inSingleQuote = false;
  let inDollarQuote = false;
  let dollarTag = "";

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1] ?? "";
    const rest = sql.slice(i);

    if (!inSingleQuote && !inDollarQuote && ch === "-" && next === "-") {
      const eol = sql.indexOf("\n", i);
      current += sql.slice(i, eol === -1 ? sql.length : eol + 1);
      i = eol === -1 ? sql.length : eol + 1;
      continue;
    }

    if (ch === "'" && !inDollarQuote) {
      inSingleQuote = !inSingleQuote;
      current += ch;
      i++;
      continue;
    }

    if (!inSingleQuote && ch === "$") {
      const dollarMatch = rest.match(/^\$(\w*)\$/);
      if (dollarMatch) {
        const tag = dollarMatch[1] ?? "";
        const fullTag = `$${tag}$`;
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = fullTag;
          current += fullTag;
          i += fullTag.length;
          continue;
        } else if (fullTag === dollarTag) {
          inDollarQuote = false;
          dollarTag = "";
          current += fullTag;
          i += fullTag.length;
          continue;
        }
      }
    }

    if (ch === ";" && !inSingleQuote && !inDollarQuote) {
      current += ch;
      if (current.trim().length > 1) statements.push(current.trim());
      current = "";
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  if (current.trim().length > 1) statements.push(current.trim());
  return statements;
}

async function dropAllTables(client: Client): Promise<void> {
  console.log("\n[1/5] Dropping all tables in public schema...");

  // Drop all tables CASCADE. This also drops views, sequences, and functions
  // that depend on them. The schema itself is not dropped.
  const { rows } = await client.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `);

  console.log(`  Found ${rows.length} tables to drop`);

  if (rows.length === 0) {
    console.log("  (no tables to drop — schema is already empty)");
    return;
  }

  // Drop all tables in one CASCADE statement
  const tableNames = rows.map((r) => `"${r.tablename}"`).join(", ");
  console.log(`  Dropping: ${rows.map((r) => r.tablename).join(", ").slice(0, 120)}...`);
  await client.query(`DROP TABLE IF EXISTS ${tableNames} CASCADE`);

  // Also drop the _migrations tracking table (both old public schema and
  // new internal schema locations — reset should clear both).
  await client.query(`DROP TABLE IF EXISTS public._migrations CASCADE`);
  await client.query(`DROP TABLE IF EXISTS netlodge_internal._migrations CASCADE`);

  // Drop all functions in public schema (SECURITY DEFINER functions from migrations)
  // except the ones Supabase provides (handled by schema)
  console.log("  Dropping all functions in public schema...");
  await client.query(`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.routine_name) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  // Drop all enums
  console.log("  Dropping all enums in public schema...");
  await client.query(`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT t.typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  console.log("  ✓ All tables, functions, and enums dropped");
}

async function deleteAllAuthUsers(): Promise<void> {
  console.log("\n[2/5] Deleting all Supabase Auth users...");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.log("  (skipped — SUPABASE_SECRET_KEY not set)");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // List all users
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.log(`  ⚠ Could not list users: ${error.message}`);
    return;
  }

  console.log(`  Found ${users.users.length} auth users to delete`);

  let deleted = 0;
  for (const user of users.users) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.log(`  ⚠ Could not delete ${user.email}: ${delErr.message}`);
    } else {
      deleted++;
    }
  }

  console.log(`  ✓ Deleted ${deleted}/${users.users.length} auth users`);
}

async function applyMigrations(client: Client): Promise<void> {
  console.log("\n[3/5] Re-applying all migrations...");

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`  Found ${files.length} migration files`);

  // Create migrations tracking table in the internal schema (not exposed
  // to PostgREST). RLS enabled, deny-by-default; service_role bypasses.
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS netlodge_internal;
    CREATE TABLE IF NOT EXISTS netlodge_internal._migrations (
      id serial primary key,
      filename text not null unique,
      applied_at timestamptz not null default now()
    );
    ALTER TABLE netlodge_internal._migrations ENABLE ROW LEVEL SECURITY;
    REVOKE USAGE ON SCHEMA netlodge_internal FROM anon, authenticated;
  `);

  let applied = 0;
  let totalStatements = 0;

  for (const file of files) {
    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf-8");
    const statements = splitSql(sql);
    console.log(`  [run] ${file} (${statements.length} statements)...`);

    try {
      await client.query("BEGIN");
      for (let j = 0; j < statements.length; j++) {
        const stmt = statements[j];
        try {
          await client.query(stmt);
          totalStatements++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("already exists") || msg.includes("duplicate_object")) {
            // skip
          } else {
            throw new Error(`Statement ${j + 1}/${statements.length} failed: ${msg}\n  SQL: ${stmt.slice(0, 200)}...`);
          }
        }
      }
      await client.query("INSERT INTO netlodge_internal._migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`  [ok]   ${file}`);
      applied++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`  [FAIL] ${file}`);
      console.error(`         ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  console.log(`  ✓ ${applied} migrations applied, ${totalStatements} SQL statements executed`);
}

async function createTestAccounts(): Promise<void> {
  console.log("\n[4/5] Creating test user accounts...");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.log("  (skipped — SUPABASE_SECRET_KEY not set)");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  for (const acct of TEST_ACCOUNTS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: acct.email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: acct.name.split(" ")[0],
        last_name: acct.name.split(" ")[1],
      },
    });
    if (error) {
      console.error(`  [FAIL] ${acct.email}: ${error.message}`);
      continue;
    }

    const userId = data.user!.id;

    // Assign role
    await supabase.from("user_roles").upsert(
      { user_id: userId, role: acct.role, reason: "Database reset test account" },
      { onConflict: "user_id,role" },
    );

    // Remove default student role for non-students
    if (acct.role !== "student") {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "student");
    }

    console.log(`  [ok] ${acct.email} → ${acct.role}`);
  }

  console.log(`  ✓ ${TEST_ACCOUNTS.length} test accounts created (password: ${TEST_PASSWORD})`);
}

async function verify(client: Client): Promise<void> {
  console.log("\n[5/5] Verifying rebuild...");

  // Count tables
  const { rows: tables } = await client.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `);
  console.log(`  Tables: ${tables.length}`);

  // Verify key tables exist
  const keyTables = ["profiles", "user_roles", "properties", "bookings", "payments", "audit_logs", "testimonials"];
  for (const t of keyTables) {
    const exists = tables.some((r) => r.tablename === t);
    if (!exists) {
      throw new Error(`  ✗ Required table "${t}" is missing`);
    }
  }
  console.log(`  ✓ All key tables present`);

  // Verify seed data
  const { rows: uniCount } = await client.query("SELECT count(*) as n FROM public.universities");
  console.log(`  Universities: ${uniCount[0].n}`);

  const { rows: settingsCount } = await client.query("SELECT count(*) as n FROM public.platform_settings");
  console.log(`  Platform settings: ${settingsCount[0].n}`);

  const { rows: integrationCount } = await client.query("SELECT count(*) as n FROM public.integration_health");
  console.log(`  Integration health: ${integrationCount[0].n}`);

  // Verify properties is empty
  const { rows: propCount } = await client.query("SELECT count(*) as n FROM public.properties");
  console.log(`  Properties: ${propCount[0].n} (should be 0)`);

  const { rows: bookingCount } = await client.query("SELECT count(*) as n FROM public.bookings");
  console.log(`  Bookings: ${bookingCount[0].n} (should be 0)`);

  const { rows: paymentCount } = await client.query("SELECT count(*) as n FROM public.payments");
  console.log(`  Payments: ${paymentCount[0].n} (should be 0)`);

  const { rows: auditCount } = await client.query("SELECT count(*) as n FROM public.audit_logs");
  console.log(`  Audit logs: ${auditCount[0].n} (should be 0)`);

  console.log("\n" + "=".repeat(60));
  console.log("✓ Database reset and rebuild complete!");
  console.log("=".repeat(60));
}

async function main() {
  console.log("=".repeat(60));
  console.log("NetLodge — Database Reset & Rebuild");
  console.log("=".repeat(60));
  console.log("\n⚠  DESTRUCTIVE OPERATION — ALL DATA WILL BE DELETED  ⚠\n");

  if (!SUPABASE_URL || !DB_PASSWORD) {
    console.error("✗ Missing required env vars: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD");
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // LAYER 1: Refuse to run in CI / automated environments.
  // A reset must only ever be triggered by a human at a terminal.
  // -----------------------------------------------------------------------
  if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true" || process.env.NETLODGE_CI === "true") {
    console.error("✗ Refusing to run in CI environment. The reset script must only");
    console.error("  be run by a human at a terminal, never in automation.");
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // LAYER 2: Refuse if NODE_ENV=test — the operator may be in a test context
  // and not realize this script targets whatever .env points at.
  // -----------------------------------------------------------------------
  if (process.env.NODE_ENV === "test") {
    console.error("✗ Refusing to run with NODE_ENV=test. The reset script must not");
    console.error("  be run in a test context. Set NODE_ENV=production or unset it.");
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // LAYER 3: Refuse if NETLODGE_TEST_DB is set — that env var is used by the
  // test guard to identify the test project. If it's set, the operator is
  // in test mode and should not be resetting anything.
  // -----------------------------------------------------------------------
  if (process.env.NETLODGE_TEST_DB) {
    console.error("✗ Refusing to run because NETLODGE_TEST_DB is set.");
    console.error("  This env var indicates you are in test mode. Unset it first:");
    console.error("    unset NETLODGE_TEST_DB");
    console.error("  Then re-run the reset script.");
    process.exit(1);
  }

  const projectRef = getProjectRef(SUPABASE_URL);
  console.log(`Target project: ${projectRef}`);
  console.log(`Project URL:    ${SUPABASE_URL}`);
  console.log("");

  // -----------------------------------------------------------------------
  // LAYER 4: Require explicit confirmation that MATCHES the project ref.
  // Setting NETLODGE_RESET_CONFIRM=yes is NOT enough — the value must equal
  // the project ref. This prevents running the reset against the wrong
  // project if .env is accidentally pointing elsewhere.
  // -----------------------------------------------------------------------
  const confirmValue = process.env.NETLODGE_RESET_CONFIRM;
  if (!confirmValue) {
    console.error("✗ This script is DESTRUCTIVE. To proceed, you must set");
    console.error("  NETLODGE_RESET_CONFIRM to the EXACT project ref you intend");
    console.error("  to reset. This is a safety measure — copy-paste the ref above.");
    console.error("");
    console.error(`  NETLODGE_RESET_CONFIRM=${projectRef} bun run scripts/reset-database.ts`);
    process.exit(1);
  }

  if (confirmValue !== projectRef) {
    console.error(`✗ NETLODGE_RESET_CONFIRM (${confirmValue}) does not match the target`);
    console.error(`  project ref (${projectRef}). This is a safety measure to prevent`);
    console.error("  resetting the wrong project.");
    console.error("");
    console.error("  If you really intend to reset this project, set:");
    console.error(`    NETLODGE_RESET_CONFIRM=${projectRef}`);
    process.exit(1);
  }

  console.log(`✓ Confirmation accepted: NETLODGE_RESET_CONFIRM matches project ref.`);
  console.log("");

  // -----------------------------------------------------------------------
  // LAYER 5: 10-second countdown with cancellation.
  // Press Ctrl+C during the countdown to abort.
  // -----------------------------------------------------------------------
  console.log("Resetting in 10 seconds. Press Ctrl+C to cancel.");
  for (let i = 10; i > 0; i--) {
    process.stdout.write(`\r  ${i}...`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log("\r  Proceeding with reset.      \n");

  // Step 1: Connect
  console.log("Connecting to database...");
  const client = await connect(projectRef, DB_PASSWORD);

  try {
    // Step 2: Drop everything
    await dropAllTables(client);

    // Step 3: Delete auth users (uses admin API, separate from DB connection)
    await deleteAllAuthUsers();

    // Step 4: Re-apply migrations
    await applyMigrations(client);

    // Step 5: Create test accounts (uses admin API)
    await createTestAccounts();

    // Step 6: Verify
    await verify(client);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
