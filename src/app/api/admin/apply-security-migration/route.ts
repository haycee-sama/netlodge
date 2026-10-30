import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * ONE-TIME admin endpoint to apply security migrations (0028 + 0029) to the
 * production database using the Vercel environment variables.
 *
 * Protected by CRON_SECRET. Delete this route after successful application.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD!;
  if (!supabaseUrl || !dbPassword) {
    return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 });
  }

  const ref = supabaseUrl.match(/\/\/([a-z0-9]+)\./)?.[1] ?? "";

  // Try pooler hosts (production may be in any region)
  const hosts = [
    process.env.SUPABASE_POOLER_HOST,
    "aws-0-eu-west-1.pooler.supabase.com",
    "aws-0-eu-west-2.pooler.supabase.com",
    "aws-0-us-east-1.pooler.supabase.com",
    "aws-0-eu-central-1.pooler.supabase.com",
    "aws-0-ap-southeast-1.pooler.supabase.com",
    "aws-0-us-west-1.pooler.supabase.com",
    "aws-0-ap-northeast-1.pooler.supabase.com",
    "aws-0-sa-east-1.pooler.supabase.com",
  ].filter(Boolean) as string[];

  let client: Client | null = null;
  let connectedHost = "";

  for (const host of hosts) {
    const isPooler = host.includes(".pooler.");
    const user = isPooler ? `postgres.${ref}` : "postgres";
    process.stdout.write(`  Trying ${host}... `);
    const c = new Client({
      host,
      port: isPooler ? 6543 : 5432,
      user,
      password: dbPassword,
      database: "postgres",
      ssl: { rejectUnauthorized: false, servername: host },
      connectionTimeoutMillis: 8000,
    });
    try {
      await c.connect();
      console.log("✓ connected");
      client = c;
      connectedHost = host;
      break;
    } catch (e) {
      console.log(`✗ ${(e instanceof Error ? e.message : "failed").slice(0, 60)}`);
      try { await c.end(); } catch {}
    }
  }

  if (!client) {
    return NextResponse.json({ error: "Could not connect to any pooler host", tried: hosts }, { status: 500 });
  }

  try {
    // Read the migration files
    const migrationsDir = join(process.cwd(), "supabase", "migrations");
    const migrationFiles = ["0028_security_hardening.sql", "0029_fix_trigger_service_role.sql"];
    const results: { file: string; applied: boolean; error?: string }[] = [];

    // Check which are already applied
    for (const file of migrationFiles) {
      const already = await client.query(
        "SELECT 1 FROM netlodge_internal._migrations WHERE filename = $1",
        [file]
      );
      if (already.rows.length > 0) {
        results.push({ file, applied: false, error: "already applied" });
        continue;
      }

      const sql = readFileSync(join(migrationsDir, file), "utf-8");
      // Split into statements (simple split on semicolons — the migrations
      // use $$ blocks which need careful handling)
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO netlodge_internal._migrations (filename) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        results.push({ file, applied: true });
      } catch (e) {
        await client.query("ROLLBACK");
        results.push({ file, applied: false, error: e instanceof Error ? e.message.slice(0, 200) : String(e) });
      }
    }

    // Verify the fixes
    const trigCheck = await client.query(
      "SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'properties_guard_sensitive_columns')"
    );
    const viewCheck = await client.query(
      "SELECT EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'audit_logs_safe')"
    );

    await client.end();

    return NextResponse.json({
      connectedHost,
      projectRef: ref,
      results,
      triggerExists: trigCheck.rows[0].exists,
      viewExists: viewCheck.rows[0].exists,
    });
  } catch (e) {
    try { await client.end(); } catch {}
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
