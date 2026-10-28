#!/usr/bin/env bun
/**
 * NetLodge — Database Migration Runner
 *
 * Connects to Supabase via the session-mode pooler (IPv4) and applies migrations.
 * Splits SQL files into individual statements to handle $$ blocks correctly.
 *
 * Reads target project + credentials from environment variables. No hardcoded
 * project refs or passwords. Use scripts/bootstrap-supabase.ts for a complete
 * one-shot setup (migrations + test accounts + verification).
 *
 * Usage: bun run scripts/apply-migrations.ts
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL  — e.g. https://<project-ref>.supabase.co
 *   SUPABASE_DB_PASSWORD      — Database password (Dashboard → Database)
 *
 * Optional env var to specify a pooler region:
 *   SUPABASE_POOLER_HOST      — e.g. aws-0-eu-west-1.pooler.supabase.com
 *                               (if not set, common regions are tried in order)
 */

import { Client } from "pg";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { config } from "dotenv";

try { config(); } catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

/**
 * Extract the project ref from a Supabase URL.
 * URL form: https://<project-ref>.supabase.co
 */
function getProjectRef(url: string): string {
  const match = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\.(co|in)/i);
  if (!match) {
    throw new Error(
      `Cannot parse project ref from NEXT_PUBLIC_SUPABASE_URL (got: ${url}). ` +
      `Expected form: https://<project-ref>.supabase.co`,
    );
  }
  return match[1];
}

/**
 * Connect to the Supabase DB via pooler (preferred) or direct host.
 * Tries common pooler regions in order if SUPABASE_POOLER_HOST is not set.
 */
async function connect(projectRef: string, password: string): Promise<Client> {
  const explicitHost = process.env.SUPABASE_POOLER_HOST;
  const poolerHosts = explicitHost
    ? [explicitHost]
    : [
        "aws-0-eu-west-1.pooler.supabase.com",
        "aws-0-us-east-1.pooler.supabase.com",
        "aws-0-us-west-1.pooler.supabase.com",
        "aws-0-ap-southeast-1.pooler.supabase.com",
        "aws-0-eu-central-1.pooler.supabase.com",
        "aws-0-ap-northeast-1.pooler.supabase.com",
        "aws-0-sa-east-1.pooler.supabase.com",
      ];

  // Also try the direct DB host as a fallback.
  const allHosts = [...poolerHosts, `db.${projectRef}.supabase.co`];

  for (const host of allHosts) {
    const isPooler = host.includes(".pooler.");
    const user = isPooler ? `postgres.${projectRef}` : "postgres";
    process.stdout.write(`  Trying ${host} as ${user}... `);

    const client = new Client({
      host,
      port: 5432,
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
    `Check SUPABASE_DB_PASSWORD and that the project is not paused.`,
  );
}

/**
 * Split SQL into individual statements.
 * Handles $$ ... $$ blocks, single-quote strings, and -- comments.
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

    // Handle line comments (-- to end of line)
    if (!inSingleQuote && !inDollarQuote && ch === "-" && next === "-") {
      const eol = sql.indexOf("\n", i);
      current += sql.slice(i, eol === -1 ? sql.length : eol + 1);
      i = eol === -1 ? sql.length : eol + 1;
      continue;
    }

    // Handle single quotes
    if (ch === "'" && !inDollarQuote) {
      inSingleQuote = !inSingleQuote;
      current += ch;
      i++;
      continue;
    }

    // Handle dollar-quoted strings ($$ ... $$ or $tag$ ... $tag$)
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

    // Handle statement separator (semicolon at top level)
    if (ch === ";" && !inSingleQuote && !inDollarQuote) {
      current += ch;
      // Check if this statement is non-whitespace
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

  // Last statement (no trailing semicolon)
  if (current.trim().length > 1) {
    statements.push(current.trim());
  }

  return statements;
}

async function main() {
  console.log("=".repeat(60));
  console.log("NetLodge — Database Migration Runner");
  console.log("=".repeat(60));

  // Validate env vars
  if (!SUPABASE_URL) {
    console.error("\n✗ NEXT_PUBLIC_SUPABASE_URL is not set.");
    console.error("  Set it in .env or export it before running.");
    console.error("  Example: NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co");
    process.exit(1);
  }
  if (!DB_PASSWORD) {
    console.error("\n✗ SUPABASE_DB_PASSWORD is not set.");
    console.error("  Get it from Supabase Dashboard → Database → Database password.");
    process.exit(1);
  }

  const projectRef = getProjectRef(SUPABASE_URL);
  console.log(`Target project: ${projectRef}`);
  console.log(`Migrations dir: ${MIGRATIONS_DIR}`);

  // Read migration files
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migration files found.");
    return;
  }

  console.log(`\nFound ${files.length} migration files:`);
  files.forEach((f) => console.log(`  - ${f}`));
  console.log("");

  // Connect (tries common pooler regions + direct host)
  const client = await connect(projectRef, DB_PASSWORD);

  // Verify connection
  const v = await client.query("SELECT version()");
  console.log(`Database: ${v.rows[0].version.slice(0, 60)}...\n`);

  // Create migrations tracking table
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id serial primary key,
      filename text not null unique,
      applied_at timestamptz not null default now()
    );
  `);

  // Apply each migration
  let applied = 0;
  let skipped = 0;
  let totalStatements = 0;

  for (const file of files) {
    const already = await client.query("SELECT 1 FROM _migrations WHERE filename = $1", [file]);
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
          // Some statements may fail if objects already exist (CREATE IF NOT EXISTS handles most,
          // but DO $$ blocks for enums can conflict). Log and continue for idempotent statements.
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("already exists") || msg.includes("duplicate_object")) {
            // Safe to skip — already created
          } else {
            // Real error — abort
            throw new Error(`Statement ${j + 1}/${statements.length} failed: ${msg}\n  SQL: ${stmt.slice(0, 200)}...`);
          }
        }
      }
      await client.query("INSERT INTO _migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`  [ok]   ${file} — ${statements.length} statements executed`);
      applied++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`  [FAIL] ${file}`);
      console.error(`         ${err instanceof Error ? err.message : String(err)}`);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("");
  console.log(`✓ Migrations complete! ${applied} applied, ${skipped} skipped, ${totalStatements} total SQL statements executed.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
