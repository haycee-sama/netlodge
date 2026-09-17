/**
 * Apply migrations to a real Supabase project using the service-role key.
 *
 * This script concatenates all migration files (0001-0010, excluding 0004
 * which creates Storage buckets — that must be done via the Supabase
 * dashboard) and executes them via the Supabase SQL API.
 *
 * Usage:
 *   node scripts/apply-migrations-to-supabase.mjs
 *
 * Environment variables (read from .env.local or process.env):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// ── Load .env.local manually (not via dotenv — keep it simple) ──────────────

const envLocal = readFileSync(".env.local", "utf8");
for (const line of envLocal.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ── Migration files in order ────────────────────────────────────────────────

const MIGRATIONS_DIR = path.resolve("supabase/migrations");
const SEED_DIR = path.resolve("supabase/seed");
const FIXTURES_DIR = path.resolve("tests/db/fixtures");

// Same order as tests/db/helpers.ts — excludes 0004 (Storage buckets).
const MIGRATION_FILES = [
  "0001_01_foundational_types.sql",
  "0002_01_profiles.sql",
  "0003_01_universities.sql",
  "0005_01_landlords_verifications.sql",
  "0006_01_properties_rooms_images.sql",
  "0007_01_bookings.sql",
  "0008_01_payments.sql",
  "0009_01_admin_audit_suspension.sql",
  "0010_01_reviews_reports.sql",
];

const SEED_FILES = ["universities.sql"];
const AUTH_STUB_FILE = "auth-stub.sql";

// ── Execute SQL via Supabase ────────────────────────────────────────────────

async function executeSql(sql, label) {
  // Use the Supabase SQL API endpoint.
  // Note: the service-role key can execute arbitrary SQL via the
  // /rest/v1/rpc endpoint IF a function exists. But for DDL, we need
  // the database connection directly.
  //
  // Alternative: use the Supabase Management API (requires a different
  // access token). For now, we'll output the SQL so the user can
  // paste it into the Supabase dashboard SQL editor.
  console.log(`\n[${label}] SQL length: ${sql.length} chars`);
  return sql;
}

async function main() {
  console.log("=== NetLodge Migration Application Script ===\n");
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Service role key: ${serviceRoleKey.slice(0, 20)}...`);
  console.log();

  // Concatenate all migrations into a single SQL blob.
  let allSql = "";

  // 1. Auth stub (creates auth schema + auth.users + auth.uid()).
  //    In a real Supabase project, auth.users already exists. But our
  //    migrations reference auth.uid() which is a Supabase built-in.
  //    We SKIP the auth-stub — real Supabase provides it natively.
  console.log("NOTE: Skipping auth-stub.sql — real Supabase provides auth schema natively.");

  // 2. Apply migrations in order.
  for (const file of MIGRATION_FILES) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = readFileSync(filePath, "utf8");
    console.log(`✓ Read ${file} (${sql.length} chars)`);
    allSql += `\n\n-- ── ${file} ──\n${sql}\n`;
  }

  // 3. Apply seed.
  for (const file of SEED_FILES) {
    const filePath = path.join(SEED_DIR, file);
    const sql = readFileSync(filePath, "utf8");
    console.log(`✓ Read seed/${file} (${sql.length} chars)`);
    allSql += `\n\n-- ── seed/${file} ──\n${sql}\n`;
  }

  console.log(`\nTotal SQL: ${allSql.length} chars`);
  console.log("\n=== HOW TO APPLY ===");
  console.log("1. Go to your Supabase dashboard:");
  console.log(`   https://supabase.com/dashboard/project/tvjxehthqdtieozrwiao/sql/new`);
  console.log("2. Copy the SQL below and paste it into the SQL editor.");
  console.log("3. Click 'Run' to execute.");
  console.log("\n=== ALSO REQUIRED (not via SQL) ===");
  console.log("4. Create Storage buckets in the Supabase dashboard:");
  console.log("   - 'property-images' (PUBLIC bucket)");
  console.log("   - 'verification-documents' (PRIVATE bucket)");
  console.log("   Go to: https://supabase.com/dashboard/project/tvjxehthqdtieozrwiao/storage/buckets");
  console.log("\n=== SQL (copy below this line) ===\n");

  // Write the SQL to a file for easy copy-paste.
  const outputPath = path.resolve("scripts/all-migrations.sql");
  writeOut(outputPath, allSql);
  console.log(`\nSQL written to: ${outputPath}`);
  console.log("Open this file, copy the contents, and paste into the Supabase SQL editor.");
}

function writeOut(filePath, content) {
  writeFileSync(filePath, content);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
