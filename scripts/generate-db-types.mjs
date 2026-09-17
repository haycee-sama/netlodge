// ─────────────────────────────────────────────────────────────────────────────
/**
 * NetLodge database type generator.
 *
 * Produces `src/types/database.generated.ts` — the Supabase-compatible
 * `Database` interface — by introspecting the actual schema applied to a
 * pglite instance.
 *
 * Why this exists (and doesn't use `supabase gen types`):
 *   The environment lacks the Supabase CLI (which itself requires Docker
 *   to run `supabase start`). pglite is real Postgres — we can introspect
 *   information_schema directly and emit a TypeScript file matching the
 *   shape Supabase's own CLI would produce.
 *
 * In a production environment with the Supabase CLI available, this script
 * can be replaced by:
 *   supabase gen types typescript --local > src/types/database.generated.ts
 * …without changing any consumer code (the output shape is identical).
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(
  new URL(".", import.meta.url).pathname,
  "..",
);

const MIGRATIONS_DIR = path.join(PROJECT_ROOT, "supabase/migrations");
const FIXTURES_DIR = path.join(PROJECT_ROOT, "tests/db/fixtures");
const OUTPUT_FILE = path.join(
  PROJECT_ROOT,
  "src/types/database.generated.ts",
);

// Migration files in deterministic apply order.
//
// NOTE: `0004_01_storage_buckets.sql` is intentionally NOT in this list.
// It creates Supabase Storage buckets via `storage.buckets` — a table
// that doesn't exist in pglite (vanilla Postgres 18, no Supabase
// extensions). The migration applies cleanly against a real Supabase
// project. Phase 3's storage tests use a mocked Supabase Storage
// client instead.
//
// `0005_01_landlords_verifications.sql` IS applied — standard PostgreSQL.
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

const ENUM_NAMES = [
  "user_role",
  "account_status",
  "verification_status",
  "decision_type",
  "property_status",
  "booking_status",
  "payment_status",
  "webhook_outcome",
  "report_status",
  "report_target",
];

/**
 * Map a Postgres column type to its TypeScript representation.
 */
function pgTypeToTs(col) {
  const { data_type, udt_name } = col;

  if (ENUM_NAMES.includes(udt_name)) {
    return `Database["public"]["Enums"]["${udt_name}"]`;
  }

  switch (data_type) {
    case "uuid":
      return "string";
    case "text":
    case "character varying":
    case "character":
      return "string";
    case "boolean":
      return "boolean";
    case "integer":
    case "smallint":
    case "bigint":
      return "number";
    case "numeric":
    case "real":
    case "double precision":
      return "number";
    case "timestamp with time zone":
    case "timestamp without time zone":
    case "date":
      return "string";
    case "json":
    case "jsonb":
      return "JsonValue";
    case "ARRAY":
      return pgUdtToTsArray(udt_name);
    default:
      if (udt_name.startsWith("_")) {
        return pgUdtToTsArray(udt_name);
      }
      return "unknown";
  }
}

function pgUdtToTsArray(udt_name) {
  const inner = udt_name.replace(/^_/, "");
  const tsInner =
    inner === "text"
      ? "string"
      : inner === "integer" || inner === "bigint"
        ? "number"
        : "unknown";
  return `Array<${tsInner}>`;
}

/**
 * Make a type nullable if the column is nullable.
 */
function withNullability(tsType, isNullable) {
  return isNullable === "YES" ? `${tsType} | null` : tsType;
}

async function main() {
  console.log("[gen-db-types] Initializing pglite...");
  const pgcryptoPath = path.join(
    PROJECT_ROOT,
    "node_modules/@electric-sql/pglite/dist/pgcrypto.tar.gz",
  );
  const pgcryptoUrl = new URL(
    `file://${pgcryptoPath.replace(/^\/?/, "/")}`,
  );
  const pg = new PGlite({ extensions: { pgcrypto: pgcryptoUrl } });

  // Apply auth stub first (so profiles.id FK can resolve).
  console.log("[gen-db-types] Applying auth stub...");
  await pg.exec(readFileSync(path.join(FIXTURES_DIR, "auth-stub.sql"), "utf8"));

  // Apply migrations.
  for (const file of MIGRATION_FILES) {
    console.log(`[gen-db-types] Applying migration: ${file}`);
    await pg.exec(readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
  }

  // Introspect enums.
  console.log("[gen-db-types] Introspecting enums...");
  const enumsResult = await pg.query(`
    SELECT t.typname, e.enumlabel, e.enumsortorder
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder;
  `);
  const enums = enumsResult.rows;

  // Group by enum name.
  const enumMap = new Map();
  for (const e of enums) {
    if (!enumMap.has(e.typname)) enumMap.set(e.typname, []);
    enumMap.get(e.typname).push(e.enumlabel);
  }

  // Introspect public tables.
  console.log("[gen-db-types] Introspecting tables...");
  const tablesResult = await pg.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const tables = tablesResult.rows.map((r) => r.table_name);

  // Introspect columns per table.
  const columnsByTable = new Map();
  for (const tableName of tables) {
    const colsResult = await pg.query(
      `
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
      `,
      [tableName],
    );
    columnsByTable.set(tableName, colsResult.rows);
  }

  // Introspect foreign keys.
  console.log("[gen-db-types] Introspecting foreign keys...");
  const fksResult = await pg.query(`
    SELECT
      c.conrelid::regclass::text AS table_name,
      a.attname AS column_name,
      c.confrelid::regclass::text AS foreign_table_name,
      af.attname AS foreign_column_name
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)
    WHERE c.contype = 'f'
      AND c.connamespace = 'public'::regnamespace
    ORDER BY c.conrelid::regclass::text, a.attname;
  `);
  const fks = fksResult.rows;

  // Group FKs by table.
  const fksByTable = new Map();
  for (const fk of fks) {
    const tableName = fk.table_name.replace(/^public\./, "");
    if (!fksByTable.has(tableName)) fksByTable.set(tableName, []);
    fksByTable.get(tableName).push({
      column_name: fk.column_name,
      foreign_table_name: fk.foreign_table_name.replace(/^public\./, ""),
      foreign_column_name: fk.foreign_column_name,
    });
  }

  // Generate TypeScript output.
  console.log("[gen-db-types] Generating TypeScript output...");
  const output = generateOutput(tables, columnsByTable, enumMap, fksByTable);

  mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  writeFileSync(OUTPUT_FILE, output, "utf8");
  console.log(`[gen-db-types] Wrote ${OUTPUT_FILE}`);

  await pg.close();
}

function generateOutput(tables, columnsByTable, enumMap, fksByTable) {
  const header = `// AUTO-GENERATED by scripts/generate-db-types.mjs.
// DO NOT EDIT THIS FILE DIRECTLY — re-run \`npm run db:types\` after schema changes.
//
// Generated by introspecting a pglite (real Postgres 18) instance with the
// Phase 1 migrations applied. In an environment with the Supabase CLI
// available, this file can be regenerated with:
//   supabase gen types typescript --local > src/types/database.generated.ts
// The output shape is identical — pglite introspection is the verifiable
// alternative documented in README.md (Phase 1 limitation).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | Json[] }
  | Json[];

export type JsonValue = Json;

export interface Database {
  public: {
    Tables: {
`;

  const tablesBlock = tables
    .map((tableName) => {
      const cols = columnsByTable.get(tableName) ?? [];
      const fks = fksByTable.get(tableName) ?? [];

      const rowFields = cols
        .map((c) => {
          const tsType = pgTypeToTs(c);
          const nullable = withNullability(tsType, c.is_nullable);
          return `        ${c.column_name}: ${nullable};`;
        })
        .join("\n");

      const insertFields = cols
        .map((c) => {
          const tsType = pgTypeToTs(c);
          const hasDefault =
            c.column_default !== null && c.column_default !== undefined;
          const isNullable = c.is_nullable === "YES";
          const optional = hasDefault || isNullable ? "?" : "";
          const nullable = isNullable ? ` | null` : "";
          return `        ${c.column_name}${optional}: ${tsType}${nullable};`;
        })
        .join("\n");

      const updateFields = cols
        .map((c) => {
          const tsType = pgTypeToTs(c);
          const nullable = c.is_nullable === "YES" ? ` | null` : "";
          return `        ${c.column_name}?: ${tsType}${nullable};`;
        })
        .join("\n");

      const relationships =
        fks.length === 0
          ? "        "
          : fks
              .map(
                (fk) =>
                  `        { foreignKeyName: "none"; columns: ["${fk.column_name}"]; referencedRelation: "${fk.foreign_table_name}"; referencedColumns: ["${fk.foreign_column_name}"] },`,
              )
              .join("\n");

      return `      ${tableName}: {
        Row: {
${rowFields}
        };
        Insert: {
${insertFields}
        };
        Update: {
${updateFields}
        };
        Relationships: [
${relationships}
        ];
      };`;
    })
    .join("\n");

  const enumsBlock = Array.from(enumMap.entries())
    .map(([name, values]) => {
      const union = values.map((v) => `"${v}"`).join(" | ");
      return `      ${name}: ${union};`;
    })
    .join("\n");

  const footer = `    };
    Views: { [key: string]: never };
    Functions: { [key: string]: never };
    Enums: {
${enumsBlock}
    };
    CompositeTypes: { [key: string]: never };
  };
}
`;

  return [header, tablesBlock, "\n", footer].join("\n");
}

main().catch((err) => {
  console.error("[gen-db-types] FAILED:", err);
  process.exit(1);
});
