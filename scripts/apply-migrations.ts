#!/usr/bin/env bun
/**
 * NetLodge — Standalone Migration Runner
 *
 * This script connects to your Supabase database and applies all SQL migrations.
 *
 * Usage (from the project root):
 *   SUPABASE_DB_PASSWORD=your_password bun run scripts/apply-migrations.ts
 *
 * Or set SUPABASE_DB_PASSWORD in your .env file and run:
 *   bun run scripts/apply-migrations.ts
 *
 * The script tries multiple connection methods:
 *   1. Direct connection (db.{ref}.supabase.co:5432) — works if IPv6 is available
 *   2. Session-mode pooler (aws-0-{region}.pooler.supabase.com:5432)
 *   3. Transaction-mode pooler (aws-0-{region}.pooler.supabase.com:6543)
 *
 * If all connections fail, the script prints the SQL for manual execution
 * in the Supabase Dashboard SQL Editor.
 */

import { Client } from "pg";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { config } from "dotenv";

// Load .env
try { config(); } catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PROJECT_REF = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "");
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD ?? "";
const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

const REGIONS = [
  "eu-central-1", "us-east-1", "us-west-1", "ap-southeast-1",
  "ap-northeast-1", "eu-west-1", "eu-west-2", "sa-east-1",
];

async function tryConnect(
  host: string,
  port: number,
  user: string,
  password: string,
  sslHostname: string,
): Promise<Client | null> {
  const client = new Client({
    host,
    port,
    user,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false, servername: sslHostname },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    return client;
  } catch {
    try { await client.end(); } catch {}
    return null;
  }
}

async function findConnection(): Promise<{ client: Client; label: string } | null> {
  if (!DB_PASSWORD) {
    console.error("✗ SUPABASE_DB_PASSWORD is not set.");
    console.error("  Set it in .env or pass as environment variable:");
    console.error("  SUPABASE_DB_PASSWORD=your_password bun run scripts/apply-migrations.ts");
    return null;
  }

  console.log(`Project: ${PROJECT_REF}`);
  console.log(`Password: ${"*".repeat(DB_PASSWORD.length)}`);
  console.log("");

  // 1. Try direct connection
  console.log("Trying direct connection (db.{ref}.supabase.co:5432)...");
  const direct = await tryConnect(
    `db.${PROJECT_REF}.supabase.co`,
    5432,
    "postgres",
    DB_PASSWORD,
    `db.${PROJECT_REF}.supabase.co`,
  );
  if (direct) {
    console.log("✓ Connected via direct connection!");
    return { client: direct, label: "direct" };
  }

  // 2. Try pooler connections across regions
  for (const region of REGIONS) {
    const poolerHost = `aws-0-${region}.pooler.supabase.com`;
    
    // Session mode (port 5432)
    console.log(`Trying pooler ${region}:5432 (session mode)...`);
    const session = await tryConnect(poolerHost, 5432, `postgres.${PROJECT_REF}`, DB_PASSWORD, poolerHost);
    if (session) {
      console.log(`✓ Connected via pooler ${region}:5432 (session mode)!`);
      return { client: session, label: `pooler-${region}-session` };
    }

    // Transaction mode (port 6543)
    console.log(`Trying pooler ${region}:6543 (transaction mode)...`);
    const txn = await tryConnect(poolerHost, 6543, `postgres.${PROJECT_REF}`, DB_PASSWORD, poolerHost);
    if (txn) {
      console.log(`✓ Connected via pooler ${region}:6543 (transaction mode)!`);
      return { client: txn, label: `pooler-${region}-txn` };
    }
  }

  return null;
}

async function main() {
  console.log("=".repeat(60));
  console.log("NetLodge — Database Migration Runner");
  console.log("=".repeat(60));
  console.log("");

  // Read migration files
  let files: string[];
  try {
    files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    console.error(`✗ No migrations directory found at ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log("No migration files found.");
    return;
  }

  console.log(`Found ${files.length} migration files:`);
  files.forEach((f) => console.log(`  - ${f}`));
  console.log("");

  // Find a working connection
  const conn = await findConnection();

  if (!conn) {
    console.error("");
    console.error("✗ Could not connect to the database from this environment.");
    console.error("");
    console.error("This is usually caused by:");
    console.error("  1. The pooler hasn't been provisioned yet (new projects take up to 30 min)");
    console.error("  2. Your IP is not allowed in Supabase Network Restrictions");
    console.error("  3. IPv6 is not available in your network");
    console.error("");
    console.error("To apply migrations manually:");
    console.error("  1. Go to https://supabase.com/dashboard");
    console.error(`  2. Open project: ${PROJECT_REF}`);
    console.error("  3. Navigate to SQL Editor → New query");
    console.error("  4. Copy the contents of supabase/combined_migration.sql");
    console.error("  5. Paste and click Run");
    console.error("");
    console.error("Or try running this script again in a few minutes if the project is new.");
    process.exit(1);
  }

  const { client } = conn;

  // Create migrations tracking table
  await client.query(`
    create table if not exists _migrations (
      id serial primary key,
      filename text not null unique,
      applied_at timestamptz not null default now()
    );
  `);

  // Apply each migration
  let applied = 0;
  let skipped = 0;

  for (const file of files) {
    const already = await client.query("select 1 from _migrations where filename = $1", [file]);
    if (already.rows.length > 0) {
      console.log(`  [skip] ${file} (already applied)`);
      skipped++;
      continue;
    }

    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf-8");
    console.log(`  [run]  ${file}...`);

    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into _migrations (filename) values ($1)", [file]);
      await client.query("commit");
      console.log(`  [ok]   ${file}`);
      applied++;
    } catch (err) {
      await client.query("rollback");
      console.error(`  [FAIL] ${file}: ${err instanceof Error ? err.message : String(err)}`);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("");
  console.log(`✓ Migrations complete! ${applied} applied, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
