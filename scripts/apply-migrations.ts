#!/usr/bin/env bun
/**
 * NetLodge — Database Migration Runner
 *
 * Connects to Supabase via the session-mode pooler (IPv4) and applies migrations.
 * Splits SQL files into individual statements to handle $$ blocks correctly.
 *
 * Usage: bun run scripts/apply-migrations.ts
 */

import { Client } from "pg";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { config } from "dotenv";

try { config(); } catch {}

const PROJECT_REF = "psmjjypiulliudepiurx";
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD ?? "oc2v2RvOPhsOITWi";
const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

const POOLER_HOST = "aws-0-eu-west-1.pooler.supabase.com";
const POOLER_PORT = 5432; // session mode
const POOLER_USER = `postgres.${PROJECT_REF}`;

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

  // Connect via session-mode pooler
  console.log(`Connecting to ${POOLER_HOST}:${POOLER_PORT} as ${POOLER_USER}...`);
  const client = new Client({
    host: POOLER_HOST,
    port: POOLER_PORT,
    user: POOLER_USER,
    password: DB_PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false, servername: POOLER_HOST },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    console.log("✓ Connected!\n");
  } catch (err) {
    console.error("✗ Connection failed:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

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
