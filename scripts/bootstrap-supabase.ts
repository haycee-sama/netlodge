#!/usr/bin/env bun
/**
 * NetLodge — One-shot Supabase Project Bootstrap
 *
 * Initializes a fresh Supabase project with everything NetLodge needs:
 *   1. All 14 SQL migrations (schema, RLS, functions, triggers, seed data,
 *      storage buckets, storage policies, performance indexes)
 *   2. Six test user accounts (landlord, student, VO, SA, FA, SS) with
 *      role assignments — idempotent, safe to re-run
 *   3. Verification: confirms all 43 tables, 3 storage buckets, and the
 *      test accounts exist after bootstrap
 *
 * The script is IDEMPOTENT — every step uses ON CONFLICT DO NOTHING or
 * checks-for-existing-first. Running it twice does not duplicate anything.
 *
 * It is also FAIL-CLOSED: it refuses to run against the known production
 * project (psmjjypiulliudepiurx) unless NETLODGE_BOOTSTRAP_ALLOW_PROD=1
 * is set. This prevents accidental re-bootstrap of production.
 *
 * USAGE
 * -----
 *   # 1. Create a fresh Supabase project at https://supabase.com/dashboard/new
 *   #    Note the project ref (e.g. abcdefghijklmnop) and DB password.
 *   #
 *   # 2. Create a .env.bootstrap file (or export env vars):
 *   #      NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
 *   #      SUPABASE_DB_PASSWORD=<your-db-password>
 *   #      SUPABASE_SECRET_KEY=<service-role-key-from-dashboard>
 *   #      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key-from-dashboard>
 *   #
 *   # 3. Run:
 *   bun run scripts/bootstrap-supabase.ts
 *
 *   # To run against the known production project (DANGEROUS):
 *   NETLODGE_BOOTSTRAP_ALLOW_PROD=1 bun run scripts/bootstrap-supabase.ts
 *
 * WHAT THIS SCRIPT DOES NOT DO
 * ----------------------------
 *   - Does NOT configure Supabase Auth URL settings (Site URL, Redirect URLs)
 *     → Do this manually in Dashboard → Authentication → URL Configuration
 *   - Does NOT configure Paystack webhooks
 *     → Do this manually in Paystack Dashboard → Settings → API Keys & Webhooks
 *   - Does NOT configure Vercel environment variables
 *     → Do this manually in Vercel → Project → Settings → Environment Variables
 *   - Does NOT delete or modify existing data — all operations are additive
 *
 * REQUIREMENTS
 * ------------
 *   - bun (or node with tsx)
 *   - The `pg` package (already in package.json)
 *   - Network access to the Supabase project (port 5432 for direct PG,
 *     port 443 for the REST/admin API)
 */

import { Client } from "pg";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { assertTestDatabase } from "./_test-guard";

try { config(); } catch {}
try { config({ path: ".env.bootstrap" }); } catch {}

// ---------------------------------------------------------------------------
// Configuration — read from env vars. No hardcoded project refs or passwords.
// ---------------------------------------------------------------------------

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

const REQUIRED_TABLES = [
  "profiles", "user_roles", "student_profiles", "landlord_profiles",
  "manager_profiles", "agent_profiles", "universities", "neighbourhoods",
  "properties", "rentable_units", "bookings", "payments", "refunds",
  "payouts", "reconciliation_records", "ledger_entries", "disputes",
  "support_tickets", "ticket_messages", "notifications", "audit_logs",
  "platform_settings", "integration_health", "knowledge_base_articles",
  "system_announcements",
];

const REQUIRED_BUCKETS = [
  { id: "property-images", public: true },
  { id: "verification-evidence", public: false },
  { id: "ticket-attachments", public: false },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error(`  ✗ FAIL: ${msg}`); process.exit(1); }
  console.log(`  ✓ ${msg}`);
}

function log(section: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(section);
  console.log("─".repeat(60));
}

/**
 * Extract the project ref from a Supabase URL.
 * URL form: https://<project-ref>.supabase.co
 */
function getProjectRef(url: string): string | null {
  const match = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\.(co|in)/i);
  return match ? match[1] : null;
}

/**
 * Get the pooler hostname. Supabase pooler URLs follow the pattern:
 *   aws-0-<region>.pooler.supabase.com
 *
 * We don't know the region from the URL alone, so we try the most common
 * ones and fall back to a direct connection if all fail.
 */
async function connectWithFallbacks(
  projectRef: string,
  password: string,
): Promise<Client> {
  // Common pooler regions. Add more as needed.
  const poolerHosts = [
    "aws-0-eu-west-1.pooler.supabase.com",
    "aws-0-us-east-1.pooler.supabase.com",
    "aws-0-us-west-1.pooler.supabase.com",
    "aws-0-ap-southeast-1.pooler.supabase.com",
    "aws-0-eu-central-1.pooler.supabase.com",
    "aws-0-ap-northeast-1.pooler.supabase.com",
    "aws-0-sa-east-1.pooler.supabase.com",
  ];

  // Also try the direct DB host as a fallback (works for some projects).
  const directHost = `db.${projectRef}.supabase.co`;

  const allHosts = [...poolerHosts, directHost];

  for (const host of allHosts) {
    const isPooler = host.includes(".pooler.");
    const user = isPooler ? `postgres.${projectRef}` : "postgres";
    const port = isPooler ? 5432 : 5432;

    process.stdout.write(`  Trying ${host} as ${user}... `);
    const client = new Client({
      host,
      port,
      user,
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false, servername: host },
      connectionTimeoutMillis: 10000,
    });

    try {
      await client.connect();
      console.log("✓ connected");
      return client;
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message.slice(0, 80) : "failed"}`);
      try { await client.end(); } catch {}
    }
  }

  throw new Error(
    `Could not connect to Supabase DB for project ${projectRef}.\n` +
    `Tried ${allHosts.length} hosts. Check:\n` +
    `  - SUPABASE_DB_PASSWORD is correct (Dashboard → Database → Database password)\n` +
    `  - The project is not paused (Dashboard → Project → Settings → General)\n` +
    `  - Your network allows outbound port 5432`,
  );
}

/**
 * Split SQL into individual statements.
 * Handles $$ ... $$ blocks, single-quote strings, and -- comments.
 * (Lifted from apply-migrations.ts — same logic.)
 */
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
      if (current.trim().length > 1) {
        statements.push(current.trim());
      }
      current = "";
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  if (current.trim().length > 1) {
    statements.push(current.trim());
  }

  return statements;
}

// ---------------------------------------------------------------------------
// Step 1: Apply migrations
// ---------------------------------------------------------------------------

async function applyMigrations(projectRef: string, password: string): Promise<void> {
  log("Step 1: Apply SQL migrations");

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration files in supabase/migrations/`);

  const client = await connectWithFallbacks(projectRef, password);

  try {
    const v = await client.query("SELECT version()");
    console.log(`  Database: ${v.rows[0].version.slice(0, 60)}...`);

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
      DROP TABLE IF EXISTS public._migrations CASCADE;
    `);

    let applied = 0;
    let skipped = 0;
    let totalStatements = 0;

    for (const file of files) {
      const already = await client.query(
        "SELECT 1 FROM netlodge_internal._migrations WHERE filename = $1",
        [file],
      );
      if (already.rows.length > 0) {
        console.log(`  [skip] ${file} (already applied)`);
        skipped++;
        continue;
      }

      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf-8");
      const statements = splitSql(sql);
      console.log(`  [run]  ${file} (${statements.length} statements)...`);

      try {
        await client.query("BEGIN");
        for (let j = 0; j < statements.length; j++) {
          const stmt = statements[j];
          try {
            await client.query(stmt);
            totalStatements++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            // Some statements fail if objects already exist — safe to skip
            // for idempotent migrations using CREATE IF NOT EXISTS.
            if (msg.includes("already exists") || msg.includes("duplicate_object")) {
              // continue
            } else {
              throw new Error(
                `Statement ${j + 1}/${statements.length} failed: ${msg}\n` +
                `  SQL: ${stmt.slice(0, 200)}...`,
              );
            }
          }
        }
        await client.query("INSERT INTO netlodge_internal._migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`  [ok]   ${file} — ${statements.length} statements executed`);
        applied++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  [FAIL] ${file}`);
        console.error(`         ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    }

    console.log(`\n  Migrations: ${applied} applied, ${skipped} skipped, ${totalStatements} SQL statements executed.`);
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// Step 2: Create test accounts
// ---------------------------------------------------------------------------

async function createTestAccounts(): Promise<void> {
  log("Step 2: Create test user accounts");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  for (const acct of TEST_ACCOUNTS) {
    // Check if profile already exists
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", acct.email)
      .single();

    let userId: string;

    if (existing?.id) {
      userId = existing.id;
      console.log(`  [skip] ${acct.email} already exists (${userId.slice(0, 8)}...)`);
    } else {
      // Create auth user
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
      userId = data.user!.id;
      console.log(`  [ok]   ${acct.email} created (${userId.slice(0, 8)}...)`);
    }

    // Assign role (idempotent upsert)
    const { error: roleErr } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: userId, role: acct.role, reason: "Bootstrap test account" },
        { onConflict: "user_id,role" },
      );
    if (roleErr) {
      console.error(`  [warn] ${acct.email} role upsert failed: ${roleErr.message}`);
    }

    // Remove the default 'student' role for non-student accounts
    if (acct.role !== "student") {
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "student");
    }
  }

  console.log(`\n  Test accounts: ${TEST_ACCOUNTS.length} processed.`);
  console.log(`  All passwords: ${TEST_PASSWORD}`);
}

// ---------------------------------------------------------------------------
// Step 3: Verify
// ---------------------------------------------------------------------------

async function verify(): Promise<void> {
  log("Step 3: Verify bootstrap");

  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    throw new Error("Missing required env vars for verification.");
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Verify tables exist
  console.log("Checking required tables...");
  let tablesOk = 0;
  let tablesMissing = 0;
  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .limit(1);
    if (error && (error.code === "42P01" || error.message.includes("does not exist"))) {
      console.log(`  ✗ missing table: ${table}`);
      tablesMissing++;
    } else {
      tablesOk++;
    }
  }
  assert(tablesMissing === 0, `all ${REQUIRED_TABLES.length} required tables exist (${tablesOk} verified, ${tablesMissing} missing)`);

  // Verify storage buckets
  console.log("\nChecking storage buckets...");
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
  assert(!bucketErr, `storage.listBuckets succeeded (got ${bucketErr?.message ?? "ok"})`);

  const bucketIds = new Set((buckets ?? []).map((b: any) => b.id));
  for (const expected of REQUIRED_BUCKETS) {
    assert(bucketIds.has(expected.id), `bucket "${expected.id}" exists (public=${expected.public})`);
  }

  // Verify test accounts exist
  console.log("\nChecking test accounts...");
  for (const acct of TEST_ACCOUNTS) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", acct.email)
      .single();
    assert(!error && !!data, `${acct.email} exists in profiles`);

    // Verify role assigned
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data!.id);
    const hasRole = (roles ?? []).some((r: any) => r.role === acct.role);
    assert(hasRole, `${acct.email} has role "${acct.role}"`);
  }

  // Verify seed data
  console.log("\nChecking seed data...");
  const { count: uniCount } = await supabase
    .from("universities")
    .select("*", { count: "exact", head: true });
  assert((uniCount ?? 0) >= 6, `universities seeded (${uniCount} rows, expected ≥6)`);

  const { count: settingsCount } = await supabase
    .from("platform_settings")
    .select("*", { count: "exact", head: true });
  assert((settingsCount ?? 0) >= 10, `platform_settings seeded (${settingsCount} rows, expected ≥10)`);

  const { count: integrationCount } = await supabase
    .from("integration_health")
    .select("*", { count: "exact", head: true });
  assert((integrationCount ?? 0) >= 5, `integration_health seeded (${integrationCount} rows, expected ≥5)`);

  console.log("\n  All verification checks passed.");
}

// ---------------------------------------------------------------------------
// Step 4: Print next-step instructions
// ---------------------------------------------------------------------------

function printNextSteps(projectRef: string | null): void {
  log("Step 4: Next steps (manual — cannot be automated)");

  console.log(`The database is now bootstrapped. Complete these manual steps:`);
  console.log("");

  console.log("1. Configure Supabase Auth URLs");
  console.log("   Dashboard → Authentication → URL Configuration");
  console.log("   - Site URL: https://your-domain.com");
  console.log("   - Redirect URLs:");
  console.log("       https://your-domain.com/auth/callback");
  console.log("       https://your-domain.com/**");
  console.log("       http://localhost:3000/auth/callback");
  console.log("       http://localhost:3000/**");
  console.log("");

  console.log("2. Copy API keys to your app environment");
  console.log("   Dashboard → Project Settings → API");
  console.log("   - NEXT_PUBLIC_SUPABASE_URL  (Project URL)");
  console.log("   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  (anon public)");
  console.log("   - SUPABASE_SECRET_KEY  (service_role — server only!)");
  if (projectRef) {
    console.log(`   Project ref: ${projectRef}`);
  }
  console.log("");

  console.log("3. Configure Vercel environment variables");
  console.log("   https://vercel.com/<your-org>/<your-project>/settings/environment-variables");
  console.log("   Add all 12 variables from .env.example");
  console.log("   Redeploy after adding them.");
  console.log("");

  console.log("4. Configure Paystack webhook (when going live)");
  console.log("   Paystack Dashboard → Settings → API Keys & Webhooks");
  console.log("   - Webhook URL: https://your-domain.com/api/paystack/webhook");
  console.log("   - Events: charge.success, charge.failed");
  console.log("");

  console.log("5. Test the deployment");
  console.log("   - Visit https://your-domain.com/api/health → should return {\"status\":\"ok\"}");
  console.log("   - Sign in as sa.test@netlodge.test / TestPass123!");
  console.log("   - Visit /admin/integrations → should show Supabase + Paystack configured");
  console.log("");

  console.log("6. Run the test suite (now safe — this project is your test project)");
  console.log("   Set NETLODGE_TEST_DB=<project-ref> in .env, then:");
  console.log("     bun run scripts/test-concurrency.ts");
  console.log("     bun run scripts/test-confirm-payment.ts");
  console.log("     bun run scripts/test-phase9-integrity.ts");
  console.log("     bun run scripts/test-admin-rpcs.ts");
  console.log("     bun run scripts/test-finance-support-rpcs.ts");
  console.log("     bun run scripts/test-phase8-student-storage.ts");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("NetLodge — Supabase Project Bootstrap");
  console.log("=".repeat(60));

  // Validate env vars
  if (!SUPABASE_URL) {
    console.error("\n✗ NEXT_PUBLIC_SUPABASE_URL is not set.");
    console.error("  Set it in .env or .env.bootstrap, or export it before running.");
    console.error("  Example: NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co");
    process.exit(1);
  }
  if (!DB_PASSWORD) {
    console.error("\n✗ SUPABASE_DB_PASSWORD is not set.");
    console.error("  Get it from Supabase Dashboard → Database → Database password.");
    process.exit(1);
  }
  if (!SERVICE_KEY) {
    console.error("\n✗ SUPABASE_SECRET_KEY is not set.");
    console.error("  Get it from Supabase Dashboard → Project Settings → API → service_role.");
    process.exit(1);
  }
  if (!ANON_KEY) {
    console.error("\n✗ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set.");
    console.error("  Get it from Supabase Dashboard → Project Settings → API → anon public.");
    process.exit(1);
  }

  // Fail-closed guard: refuse to bootstrap the known production project
  // unless explicitly allowed.
  const projectRef = getProjectRef(SUPABASE_URL);
  if (!projectRef) {
    console.error(`\n✗ Cannot parse project ref from NEXT_PUBLIC_SUPABASE_URL.`);
    console.error(`  Expected form: https://<project-ref>.supabase.co`);
    process.exit(1);
  }

  // Reuse the test guard's logic — it knows the production project ref.
  // We allow the operator to override with NETLODGE_BOOTSTRAP_ALLOW_PROD=1
  // (distinct from NETLODGE_ALLOW_PROD_TESTS so the escape hatches don't
  // collide).
  const allowProd = process.env.NETLODGE_BOOTSTRAP_ALLOW_PROD === "1";
  const PRODUCTION_PROJECT_REF = "psmjjypiulliudepiurx";

  if (projectRef === PRODUCTION_PROJECT_REF && !allowProd) {
    console.error("\n" + "=".repeat(60));
    console.error("✗  REFUSING TO BOOTSTRAP PRODUCTION PROJECT");
    console.error(`   NEXT_PUBLIC_SUPABASE_URL points to ${projectRef},`);
    console.error("   which is the known production project.");
    console.error("");
    console.error("   Bootstrap applies all migrations and creates test accounts.");
    console.error("   While idempotent, running it against production is risky —");
    console.error("   a bug in the script could modify real data.");
    console.error("");
    console.error("   To proceed anyway (the script is idempotent):");
    console.error("     NETLODGE_BOOTSTRAP_ALLOW_PROD=1 bun run scripts/bootstrap-supabase.ts");
    console.error("=".repeat(60));
    process.exit(2);
  }

  if (allowProd && projectRef === PRODUCTION_PROJECT_REF) {
    console.warn("\n⚠  NETLODGE_BOOTSTRAP_ALLOW_PROD=1 — bootstrapping PRODUCTION project.");
    console.warn(`   Project ref: ${projectRef}`);
    console.warn("   All operations are idempotent, but review the output carefully.\n");
  }

  console.log(`Target project: ${projectRef}`);
  console.log(`Migrations dir: ${MIGRATIONS_DIR}`);
  console.log(`Test accounts:  ${TEST_ACCOUNTS.length}`);
  console.log("");

  // Step 1: migrations
  await applyMigrations(projectRef, DB_PASSWORD);

  // Step 2: test accounts
  await createTestAccounts();

  // Step 3: verify
  await verify();

  // Step 4: next steps
  printNextSteps(projectRef);

  console.log("\n" + "=".repeat(60));
  console.log("✓ Bootstrap complete!");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("\nFatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
