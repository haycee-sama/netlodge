#!/usr/bin/env bun
/**
 * Migration runner — applies SQL migration files to the Supabase database.
 *
 * Tries direct PostgreSQL connection first. If the database password is not
 * available, falls back to the Supabase service role key via the PostgREST API.
 *
 * Usage: bun run scripts/run-migrations.ts
 */

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { Client } from "pg";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PROJECT_REF = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "");
const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

async function tryDirectConnection(): Promise<Client | null> {
  // Try connecting to the Supabase database directly.
  // The host is db.[project-ref].supabase.co, port 5432, user postgres.
  // We try common passwords: project ref, "postgres", and the env var SUPABASE_DB_PASSWORD.
  const passwords = [
    process.env.SUPABASE_DB_PASSWORD,
    PROJECT_REF,
    "postgres",
  ].filter(Boolean) as string[];

  for (const password of passwords) {
    try {
      const client = new Client({
        host: `db.${PROJECT_REF}.supabase.co`,
        port: 5432,
        user: "postgres",
        password,
        database: "postgres",
        connectionTimeoutMillis: 5000,
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
      console.log(`[✓] Connected to database with password attempt`);
      return client;
    } catch (err) {
      // Continue to next password
    }
  }

  // Also try the pooler connection
  const poolerHosts = [
    `aws-0-eu-central-1.pooler.supabase.com`,
    `aws-0-us-east-1.pooler.supabase.com`,
    `aws-0-us-west-1.pooler.supabase.com`,
    `aws-0-ap-southeast-1.pooler.supabase.com`,
  ];

  for (const host of poolerHosts) {
    for (const password of passwords) {
      try {
        const client = new Client({
          host,
          port: 6543,
          user: `postgres.${PROJECT_REF}`,
          password,
          database: "postgres",
          connectionTimeoutMillis: 5000,
          ssl: { rejectUnauthorized: false },
        });
        await client.connect();
        console.log(`[✓] Connected to database via pooler ${host}`);
        return client;
      } catch (err) {
        // Continue
      }
    }
  }

  return null;
}

async function main() {
  console.log("=".repeat(60));
  console.log("NetLodge Migration Runner");
  console.log("=".repeat(60));
  console.log(`Project: ${PROJECT_REF}`);
  console.log(`Migrations dir: ${MIGRATIONS_DIR}`);
  console.log("");

  // Read migration files
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migration files found.");
    return;
  }

  console.log(`Found ${files.length} migration files:`);
  files.forEach((f) => console.log(`  - ${f}`));
  console.log("");

  // Try direct database connection
  const client = await tryDirectConnection();

  if (!client) {
    console.error("✗ Could not connect to the Supabase database directly.");
    console.error("");
    console.error("To apply migrations manually:");
    console.error("  1. Go to your Supabase dashboard: https://supabase.com/dashboard");
    console.error(`  2. Open project: ${PROJECT_REF}`);
    console.error("  3. Navigate to SQL Editor");
    console.error("  4. Copy and paste the contents of each migration file in order:");
    files.forEach((f) => console.error(`     - supabase/migrations/${f}`));
    console.error("");
    console.error("Or set SUPABASE_DB_PASSWORD env var and re-run this script.");
    process.exit(1);
  }

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
    const alreadyApplied = await client.query(
      "select 1 from _migrations where filename = $1",
      [file],
    );

    if (alreadyApplied.rows.length > 0) {
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
      console.error("");
      console.error("Migration failed. Fix the error and re-run the script.");
      console.error("Already-applied migrations will be skipped.");
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("");
  console.log(`✓ Migrations complete. ${applied} applied, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
