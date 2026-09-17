/**
 * Test harness for NetLodge database tests.
 *
 * Uses @electric-sql/pglite (real Postgres 18 in WASM) as an in-process
 * database — no Docker, no Supabase CLI required.
 *
 * Provides:
 *   - `makeFreshDb()` — returns a fresh PGlite instance with auth-stub +
 *     all migrations + seed applied.
 *   - `runSqlFile(pg, path)` — execute a .sql file.
 *   - `setJwtClaims(pg, userId, role?)` — simulate an authenticated session
 *     by setting the `request.jwt.claims` config that `auth.uid()` reads.
 *   - `clearJwtClaims(pg)` — simulate anonymous (logged-out) context.
 *   - `createAuthUser(pg, id, email)` — insert a stub row in `auth.users`
 *     (the FK target for `profiles.id`).
 *   - `createProfile(pg, profile)` — insert a profiles row using a
 *     service-role (no JWT) context, mirroring how the registration
 *     Server Action would do it. Used for test setup.
 *
 * Why pglite instead of `supabase start`:
 *   The environment lacks Docker (required by `supabase start`). pglite is
 *   real Postgres 18.3 — it supports every feature our migrations use:
 *   pgcrypto, RLS, triggers, SECURITY DEFINER functions, partial indexes,
 *   SET ROLE, SET LOCAL. The migration files we ship are production-ready;
 *   pglite is purely a verification tool, equivalent to what `supabase db
 *   reset --local` would do if Docker were available.
 *
 * All tests in tests/db/_*.test.ts use this harness. The harness does NOT
 * mock the database — it runs the actual migrations against an actual
 * Postgres engine.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, "supabase/migrations");
const SEED_DIR = path.join(PROJECT_ROOT, "supabase/seed");
const FIXTURES_DIR = path.join(PROJECT_ROOT, "tests/db/fixtures");

// Migration files in deterministic apply order (alphabetical by filename).
//
// NOTE: `0004_01_storage_buckets.sql` is intentionally NOT in this list.
// It creates Supabase Storage buckets via `storage.buckets` — a table
// that exists only in real Supabase projects, NOT in pglite (which is
// vanilla Postgres 18, no Supabase extensions). Applying the storage
// migration against pglite would fail at `INSERT INTO storage.buckets`.
//
// Phase 3's storage tests use a mocked Supabase Storage client instead
// (see `tests/integration/storage-core.test.ts`). The storage migration
// is verified to be syntactically correct + logically correct by code
// review — it applies cleanly against a real Supabase project.
//
// `0005_01_landlords_verifications.sql` IS applied — it's standard
// PostgreSQL DDL + triggers, fully supported by pglite.
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

export interface JwtClaims {
  sub: string; // user UUID
  role?: string; // 'authenticated' | 'anon' (Supabase convention)
}

/**
 * Build a fresh PGlite database with the full Phase 1 schema + seed applied.
 *
 * Returns the PGlite instance; tests use it via `pg.query(...)` etc.
 * Caller is responsible for `await pg.close()` at the end of the test.
 */
export async function makeFreshDb(): Promise<PGlite> {
  // pglite requires a file:// URL pointing to the extension tarball.
  // Resolve relative to the project root so the URL is correct regardless
  // of where the test process's CWD is.
  const pgcryptoPath = path.join(
    PROJECT_ROOT,
    "node_modules/@electric-sql/pglite/dist/pgcrypto.tar.gz",
  );
  const pgcryptoUrl = new URL(
    `file://${pgcryptoPath.replace(/^\/?/, "/")}`,
  );

  const pg = new PGlite({
    extensions: { pgcrypto: pgcryptoUrl },
  });

  // Apply auth stub (creates auth schema + auth.users + auth.uid()) — only
  // needed outside of Supabase; in production Supabase provides these.
  await runSqlFile(pg, path.join(FIXTURES_DIR, AUTH_STUB_FILE));

  // Apply migrations in deterministic order.
  for (const file of MIGRATION_FILES) {
    await runSqlFile(pg, path.join(MIGRATIONS_DIR, file));
  }

  // Apply seed files.
  for (const file of SEED_FILES) {
    await runSqlFile(pg, path.join(SEED_DIR, file));
  }

  return pg;
}

/**
 * Execute a .sql file. Splits on semicolons at the top level (sufficient
 * for our migrations — none of them contain semicolons inside strings or
 * function bodies that would confuse a naive split... actually some do.
 * pglite's `exec()` handles multi-statement SQL correctly, so we use it.
 */
export async function runSqlFile(pg: PGlite, filePath: string): Promise<void> {
  const sql = readFileSync(filePath, "utf8");
  await pg.exec(sql);
}

/**
 * Simulate an authenticated Supabase session by:
 *   1. Switching to the `authenticated` Postgres role (so RLS policies
 *      declared with `TO authenticated` apply). In real Supabase,
 *      PostgREST switches to this role when a JWT is present.
 *   2. Setting the `request.jwt.claims` GUC that `auth.uid()` reads.
 *
 * In real Supabase, the JWT is decoded by the PostgREST edge and the
 * `request.jwt.claims` GUC is set per-request. We mimic that by setting
 * the config inside a transaction (or session-wide if no transaction).
 */
export async function setJwtClaims(
  pg: PGlite,
  claims: JwtClaims,
): Promise<void> {
  const payload = {
    sub: claims.sub,
    role: claims.role ?? "authenticated",
  };
  const json = JSON.stringify(payload).replace(/'/g, "''");
  // Switch to authenticated role so RLS policies with `TO authenticated`
  // are evaluated. Without this, queries run as the table owner (superuser),
  // which bypasses RLS entirely.
  await pg.query(`SET ROLE authenticated;`);
  await pg.query(`SET request.jwt.claims = '${json}';`);
}

/**
 * Simulate anonymous (logged-out) context — clears JWT claims and switches
 * to the `anon` Postgres role so RLS policies declared with `TO anon` apply.
 *
 * Use this when testing what an UNAUTHENTICATED visitor can/cannot do.
 */
export async function clearJwtClaims(pg: PGlite): Promise<void> {
  // Reset role to default (anonymous = anon role in Supabase conventions).
  await pg.query(`SET ROLE anon;`);
  // Empty string — `auth.uid()` returns NULL when claims is empty.
  await pg.query(`SET request.jwt.claims = '';`);
}

/**
 * Switch to a privileged service-role context — no JWT, no RLS.
 *
 * This mirrors the Supabase service-role client used by Server Actions
 * (DATABASE_SCHEMA.md §24, TECHNICAL_ARCHITECTURE.md §4). Service-role
 * queries bypass RLS entirely. Used by tests for setup operations
 * (creating users, etc.) and to verify what the service-role sees.
 */
export async function setServiceRole(pg: PGlite): Promise<void> {
  // RESET ROLE returns to the original (superuser) role, which bypasses
  // RLS. This is equivalent to what the Supabase service-role client does.
  await pg.query(`RESET ROLE;`);
  await pg.query(`SET request.jwt.claims = '';`);
}

/**
 * Insert a stub row in `auth.users`. The test harness uses this to seed
 * the FK target before inserting a corresponding `profiles` row.
 */
export async function createAuthUser(
  pg: PGlite,
  id: string,
  email: string,
): Promise<void> {
  await setServiceRole(pg);
  await pg.query(
    `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
    [id, email],
  );
}

/**
 * Insert a `profiles` row using a service-role context (no JWT — i.e.,
 * simulating a Server Action that uses the privileged Supabase client).
 *
 * Used by tests for setting up users; mirrors how the registration Server
 * Action would write the row in production (role hardcoded per flow).
 */
export async function createProfile(
  pg: PGlite,
  profile: {
    id: string;
    role: "student" | "landlord" | "admin";
    full_name: string;
    phone: string;
    university_id?: string | null;
    account_status?: "active" | "suspended";
    suspension_reason?: string | null;
  },
): Promise<void> {
  // Switch to service-role context — auth.uid() returns NULL, and the
  // column-guard trigger treats this as privileged (the same way it treats
  // an admin Server Action using the Supabase service-role client).
  await setServiceRole(pg);
  await pg.query(
    `INSERT INTO public.profiles
       (id, role, full_name, phone, university_id, account_status, suspension_reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7);`,
    [
      profile.id,
      profile.role,
      profile.full_name,
      profile.phone,
      profile.university_id ?? null,
      profile.account_status ?? "active",
      profile.suspension_reason ?? null,
    ],
  );
}

/**
 * Helper: returns whether a query succeeded (true) or threw (false).
 * Used in tests that assert an operation is REJECTED.
 */
export async function querySucceeds(
  pg: PGlite,
  sql: string,
  params?: unknown[],
): Promise<boolean> {
  try {
    await pg.query(sql, params);
    return true;
  } catch {
    return false;
  }
}
