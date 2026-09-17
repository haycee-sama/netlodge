# NetLodge — Supabase Migrations

Phase 0 shipped **zero** migrations. Phase 1 added migrations 0001–0003
(foundational types, profiles, universities). Phase 3 added migration
0004 (storage buckets). See `IMPLEMENTATION_PLAN.md` §22 for the
phase-by-phase breakdown.

## Naming convention

```
<sort-prefix>_<group>-<short-slug>.sql
```

- `sort-prefix` is `MMDD` or a sequential `0001`, `0002`, ... — chosen so
  alphabetical order matches the intended apply order.
- `group` matches the migration group number from `IMPLEMENTATION_PLAN.md` §5.
- `short-slug` is kebab-case.

Examples:

```
0001_01-foundational-types.sql       (group 1: enums, extensions)
0002_01-profiles.sql                  (group 2: identity)
0003_01-universities.sql              (group 3: universities)
0004_01-storage-buckets.sql            (Phase 3: storage buckets + policies)
0005_01-landlords.sql                  (group 4: landlords + verifications — Phase 4)
0006_01-properties-rooms-images.sql    (group 5: properties, rooms, images — Phase 5)
0007_01-bookings.sql                   (group 6: bookings + partial unique index — Phase 7)
0007_01-payments.sql                  (group 7: payment_transactions + webhook events)
0008_01-audit-logs.sql                (group 8: audit_logs)
0009_01-reviews-reports.sql           (group 9: optional MVP features)
```

## Apply order

Apply order is alphabetical. Each group genuinely depends on the previous
(foreign keys cannot reference tables that don't exist yet). RLS policies
for a given table are applied **in the same migration** that creates the
table — never a later "security pass" migration.

## Local workflow

```bash
# Start local Supabase (Docker required)
supabase start

# Reset local database to latest migrations
supabase db reset --local

# Generate TypeScript types from local schema
supabase gen types typescript --local > src/types/database.generated.ts

# Stop local Supabase
supabase stop
```

## Seed strategy

Seed data lives in `supabase/seed/`. Per `IMPLEMENTATION_PLAN.md` §24, seed
data is for development/testing only — **never** real personal data, real
government IDs, or real payment credentials. Production starts with only
the real launch university and zero fake accounts.

## Migration safety

See `IMPLEMENTATION_PLAN.md` §27 for the full migration safety rules:

1. Strict group ordering — never apply out of order.
2. Additive migrations preferred over destructive ones.
3. Destructive changes use expand-migrate-contract.
4. Staging verification before production, no exceptions.
5. A code-only rollback must not strand the DB in an incompatible state.
