# NetLodge

> The verified way for Nigerian students to find and reserve off-campus housing.

**Phase 0 — Repository Audit & Foundation Scaffold.** This is the foundational
codebase. No application features are implemented yet — Phase 1 (Database
Foundation) starts the actual product build. See `IMPLEMENTATION_PLAN.md` §22
for the phase-by-phase breakdown.

The planning documents in `../planning-docs/` (or at the repo root, depending
on workspace layout) remain the single source of truth for product,
architecture, schema, contracts, and implementation order. This README is a
developer quick-start, not a re-statement of the planning docs.

---

## 1. What NetLodge is

A student-accommodation marketplace for Nigerian universities. Students
discover, compare, verify, and reserve off-campus housing; landlords reach
students without informal agent networks. Launch scope is deliberately one
university — proven supply and demand come before expansion. See
`PRODUCT_BRIEF.md` for the full thesis.

What NetLodge **is not** (at MVP): a rent-payment platform, an escrow service,
a property-management SaaS, an automated verification system, a nationwide
launch. Each exclusion is a deliberate scoping decision documented in
`MVP_SCOPE.md` §15.

---

## 2. Technology stack

Approved by `TECHNICAL_ARCHITECTURE.md` §1. This is the full MVP stack —
nothing else is introduced without an explicit, evidence-based justification.

| Layer              | Choice                                      |
| ------------------ | ------------------------------------------- |
| Framework          | Next.js (App Router, React 19)              |
| Language           | TypeScript (strict)                        |
| Auth               | Supabase Auth                               |
| Database           | PostgreSQL (via Supabase)                   |
| Storage            | Supabase Storage (public + private buckets)|
| Authorization      | Supabase RLS + server-side checks           |
| Payments           | Paystack (init + webhook + verify)          |
| Validation         | Zod                                         |
| Lint               | ESLint (`next/core-web-vitals`, `next/typescript`) |
| Format             | Prettier                                    |
| Unit / Integration | Vitest                                      |
| E2E                | Playwright                                  |
| Styling            | Tailwind CSS v4 (PostCSS plugin)            |

**Explicitly excluded:** microservices, message queues, Redis, Kubernetes,
Elasticsearch, additional databases, separate backend servers. Adding any of
these requires a documented contradiction in the planning docs — silence is
not consent.

---

## 3. Prerequisites

- **Node.js** ≥ 20.0.0 (project boots on Node 18+ technically, but Phase 0
  was verified against Node 24).
- **npm** (other package managers work in principle but `package.json`
  scripts are npm-flavored).
- **Git**.
- **Docker** (optional) — only needed once you run `supabase start` to bring
  up a local Supabase stack. Phase 0 does not require this.

---

## 4. Local setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment template and populate
cp .env.example .env.local
# Edit .env.local — at minimum, replace placeholder values with real
# Supabase + Paystack test-mode credentials.

# 3. Run the full pre-PR verification gate
npm run verify

# 4. Start the dev server
npm run dev
# Open http://localhost:3000
```

The dev server should boot. The `/` route renders a Phase 0 placeholder
home page; `/health` returns the env-validation status as JSON.

---

## 5. Environment variables

See `.env.example` for the canonical list with documentation. Summary:

| Variable                              | Browser-safe? | Required?     | Purpose                                 |
| ------------------------------------- | ------------- | ------------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`            | Yes           | Required      | Supabase project URL.                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Yes           | Required      | RLS-scoped client key.                  |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`     | Yes           | Required      | Paystack checkout widget.               |
| `NEXT_PUBLIC_SITE_URL`                | Yes           | Required (Phase 2+) | Site URL for email-verification + password-reset redirects. |
| `SUPABASE_SERVICE_ROLE_KEY`           | **Never**     | Required      | Server-only — bypasses RLS.             |
| `PAYSTACK_SECRET_KEY`                 | **Never**     | Required      | Server-only — Paystack API calls.       |
| `PAYSTACK_WEBHOOK_SECRET`             | **Never**     | Required      | Server-only — webhook HMAC verification.|
| `EMAIL_PROVIDER_API_KEY`              | **Never**     | Phase 11+     | Server-only — transactional email.      |

### Security warning — read this

- **Never** prefix a server-only variable with `NEXT_PUBLIC_`. Anything with
  that prefix is bundled into the browser and is visible to every user.
- **Never** commit `.env.local` or any file containing real secrets. The
  `.gitignore` excludes `.env*` (except `.env.example`).
- **Never** hard-code credentials in source. The `src/config/env.ts` loader
  reads `process.env` exclusively.
- The `server-only` package (`src/server/supabase/privileged.ts`,
  `src/server/paystack/*`, etc.) is the build-time guarantee that privileged
  modules never reach a client bundle.
- Supabase service-role key writes to `bookings.status = 'confirmed'` or
  `payment_transactions.status = 'success'` happen ONLY inside the atomic
  webhook-confirmation transaction (Phase 9). No other code path may do
  this — see `TECHNICAL_ARCHITECTURE.md` §17.

---

## 6. Development commands

```bash
npm run dev               # Next.js dev server (http://localhost:3000)
npm run build             # Production build
npm run start             # Serve the production build (post-build)
npm run typecheck         # tsc --noEmit (strict)
npm run lint              # eslint . (flat config)
npm run lint:fix          # autofix what's autofixable
npm run format            # Prettier write
npm run format:check      # Prettier check (CI mode)
npm run test:db           # Database tests (pglite + Phase 1 migrations)
npm run db:types          # Regenerate src/types/database.generated.ts
npm run verify            # typecheck && lint && test && build (pre-PR gate)
```

---

## 7. Testing commands

```bash
npm run test              # Vitest run (unit + integration)
npm run test:watch        # Vitest watch mode
npm run test:ui           # Vitest interactive UI
npm run test:e2e          # Playwright run (boots dev server automatically)
npm run test:e2e:install  # One-time Chromium install for Playwright
```

Phase 0 ships:

- `tests/unit/errors.test.ts` — standardized error model.
- `tests/unit/validation.test.ts` — Zod helpers + kobo/money invariant.
- `tests/integration/home-page.test.tsx` — React rendering.
- `tests/e2e/smoke.spec.ts` — Playwright proves the dev server boots.

Phase 1 adds:

- `tests/db/migrations.test.ts` — schema, enums, FKs, RLS-enabled, column-guard trigger.
- `tests/db/profiles-rls.test.ts` — anonymous / authenticated / admin RLS + column-guard.
- `tests/db/universities-rls.test.ts` — public read + admin-only write.
- `tests/db/constraints.test.ts` — UNIQUE / FK / CHECK / CASCADE / enum enforcement.

Phase 2 adds:

- `tests/unit/auth-schemas.test.ts` — Zod schemas reject `role` / `accountStatus` fields.
- `tests/integration/auth-core.test.ts` — mocked Supabase Auth integration tests
  for the registration, login, logout, password-reset, and profile-update paths.
- `tests/db/auth-provisioning.test.ts` — pglite-backed tests verifying the actual
  `provisionProfileCore` function against real Postgres, including Phase 1
  regression checks (column-guard trigger + cross-user RLS still enforce).

The nine E2E journeys listed in `IMPLEMENTATION_PLAN.md` §20 land in the
relevant later phases.

---

## 7.1. Authentication & Authorization (Phase 2)

Phase 2 implements the complete auth boundary per `API_CONTRACTS.md` §3 and
`TECHNICAL_ARCHITECTURE.md` §6:

**Server Actions** (in `src/server/auth/actions.ts`):

| Action                    | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| `registerStudent`         | Sign up + create `profiles` row with `role='student'` (HARDCODED). |
| `registerLandlord`       | Sign up + create `profiles` row with `role='landlord'` (HARDCODED). |
| `login`                   | Email/password login via Supabase Auth.          |
| `logout`                  | Invalidate the session. Idempotent.              |
| `requestPasswordReset`   | Always returns success (no email enumeration).   |
| `getSession`              | Returns the current user's profile + identity.  |
| `getOwnProfile`           | Same as `getSession`.                            |
| `updateOwnProfile`        | Updates `fullName`, `phone`, `universityId` ONLY. `role` / `accountStatus` rejected by Zod `.strict()`. |

**Authorization helpers** (in `src/server/auth/authorize.ts`):

| Helper                    | Throws on failure                                 |
| ------------------------- | ------------------------------------------------- |
| `getCurrentSession()`     | Returns `AuthenticatedUser \| null` (no throw).  |
| `requireAuthenticated()`  | `unauthenticated` (401) if no session.            |
| `requireRole(...roles)`   | `forbidden` (403) if role doesn't match.         |
| `requireAccountActive()`   | `forbidden` (403) if `account_status='suspended'`. |

**Critical security property**: Role is hardcoded per registration flow —
never read from client input. Three independent layers enforce this:

1. **Validation layer** — Zod schemas use `.strict()` so a payload with
   `role: "admin"` produces a `validation_error`, NOT a silent strip.
2. **Application layer** — `provisionProfileCore` accepts only `"student" |
   "landlord"` as the `role` parameter (TypeScript type system). There is
   no code path that ever sets `role = "admin"` from the registration flow.
3. **Database layer** (Phase 1) — `profiles_guard_protected_columns`
   trigger rejects any non-admin/non-service-role UPDATE of `role` or
   `account_status`. The trigger + RLS policies are verified in Phase 1
   tests and re-verified in Phase 2's `tests/db/auth-provisioning.test.ts`.

**Suspended-account behavior** (per `TECHNICAL_ARCHITECTURE.md` §6):

- A suspended user CAN authenticate via Supabase Auth (login succeeds).
- A suspended user CANNOT perform state-changing actions — `requireAccountActive()`
  throws `forbidden` at the top of every such Server Action.
- This is the architectural separation: **authentication succeeding is not
  the same as being authorized to act**.

**Route protection**:

- Middleware (`src/middleware.ts`) only refreshes the Supabase session
  cookie — it does NOT enforce auth. Auth is enforced by each Server
  Component / Server Action independently re-checking via `getCurrentSession()`.
- Protected routes (`/dashboard`, `/account`) redirect to `/login?next=...`
  if no session.

**Testing disclaimer** (per `IMPLEMENTATION_PLAN.md` testing-strategy note):

The environment for this implementation lacks a real Supabase server (no
Docker, no Supabase CLI). Supabase Auth integration is tested with **mocked
clients** (`tests/integration/auth-core.test.ts`) — clearly labeled as test
doubles. The actual Supabase Auth signUp/signInWithPassword behavior
requires a real Supabase project to verify end-to-end. The database-level
defenses (Phase 1 RLS, column-guard trigger, profile provisioning) ARE
verified against real Postgres 18 via pglite (`tests/db/auth-provisioning.test.ts`).

---

## 8. Database workflow

Migrations live in `supabase/migrations/`. Naming convention and ordering
rules are documented in `supabase/migrations/README.md`.

**Phase 1 ships three migrations** (foundational types, profiles, universities)
plus the launch-target university seed (`supabase/seed/universities.sql`).

### Verifiable alternative to `supabase start`

The environment this repo was developed in lacks Docker (required by
`supabase start`). Phase 1 uses [`@electric-sql/pglite`](https://github.com/electric-sql/pglite)
— real Postgres 18.3 in WASM — as the in-process database for tests and
type generation. pglite supports every feature Phase 1 needs: pgcrypto,
RLS, triggers, SECURITY DEFINER functions, `SET ROLE` for switching auth
contexts. The migration files are production-ready; pglite is purely a
verification tool, equivalent to what `supabase db reset --local` would do
if Docker were available.

In an environment with Docker + Supabase CLI, the standard workflow applies:

```bash
supabase start                              # boot local Supabase stack
supabase db reset --local                   # apply all migrations to fresh DB
npm run db:types                            # regenerate src/types/database.generated.ts
supabase stop                               # shut down local Supabase
```

In this environment (no Docker), the equivalent workflow is:

```bash
npm run test:db                             # boot fresh pglite + apply all migrations + run all DB tests
npm run db:types                            # regenerate types from pglite-introspected schema
```

Migration safety rules — see `IMPLEMENTATION_PLAN.md` §27. Critical rule:
**RLS policies for a table are applied in the same migration that creates
the table**, never a later "security pass" migration.

### Test-only fixture

`tests/db/fixtures/auth-stub.sql` creates a minimal `auth` schema with the
`auth.users` table, `auth.uid()` function, and the `anon`/`authenticated`
Postgres roles that Supabase Auth would normally provide. This is a test
fixture — in production Supabase, all of this is created by Supabase Auth's
bootstrap before any user migration runs. The fixture is run by the test
harness BEFORE migrations so the FK in migration 0002 (`profiles.id →
auth.users.id`) and the RLS `TO authenticated` clauses resolve correctly.

---

## 9. Project structure

```
.
├── .env.example              # env var template (tracked)
├── .env.local                # real local env (gitignored, NEVER commit)
├── .gitignore
├── .prettierrc.json
├── eslint.config.mjs
├── next.config.ts
├── next-env.d.ts
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── README.md                 # you are here
├── planning-docs/            # source of truth — NOT re-stated in this README
├── src/
│   ├── app/                  # Next.js App Router (routes, layouts, pages)
│   │   ├── layout.tsx        # root layout — semantic HTML, skip-link, metadata
│   │   ├── page.tsx          # Phase 0 placeholder home page
│   │   ├── not-found.tsx     # 404
│   │   ├── global-error.tsx  # unhandled-error boundary
│   │   ├── globals.css       # Tailwind v4 entry + accessibility baseline
│   │   ├── health/route.ts   # /health — env-validation Route Handler
│   │   └── api/webhooks/paystack/route.ts  # Paystack webhook (Phase 9 stub)
│   ├── components/ui/        # presentational React components
│   ├── config/               # env loader + app constants
│   ├── errors/               # standardized error model (API_CONTRACTS §19)
│   ├── integrations/         # (reserved) external-integration adapters
│   ├── lib/                  # domain/service layer (bookings, payments, ...)
│   │   ├── auth/             # auth shared logic (Phase 2)
│   │   ├── bookings/         # booking domain (Phase 7)
│   │   ├── payments/         # payment domain (Phase 9)
│   │   ├── verification/     # verification domain (Phase 4)
│   │   └── supabase/         # client + server (RLS-scoped) Supabase clients
│   ├── server/               # server-only modules (enforced via `server-only`)
│   │   ├── auth/             # role / ownership / account-status helpers (Phase 2)
│   │   ├── jobs/             # scheduled Edge Function bodies (Phase 8+)
│   │   ├── paystack/         # Paystack API + webhook signature verification
│   │   ├── storage/          # signed-upload/download URL issuance (Phase 3)
│   │   ├── supabase/         # privileged (service-role) client — single entry point
│   │   └── webhooks/         # webhook Route Handler implementations
│   ├── types/                # shared types + generated DB types (Phase 1)
│   └── validation/           # Zod schemas + shared validation helpers
├── supabase/
│   ├── config.toml           # local Supabase CLI config
│   ├── migrations/           # SQL migrations — Phase 1: 0001 foundational, 0002 profiles, 0003 universities
│   └── seed/                 # dev/test seed data — Phase 1: universities.sql (launch-target)
├── scripts/
│   └── generate-db-types.mjs # type generator (pglite introspection → Database interface)
└── tests/
    ├── unit/                 # Vitest unit tests
    ├── integration/          # Vitest integration tests
    ├── db/                   # Vitest database tests (pglite-backed)
    │   ├── fixtures/         # test-only fixtures (auth-stub.sql — NOT a production migration)
    │   ├── helpers.ts        # test harness: makeFreshDb(), setJwtClaims(), setServiceRole(), etc.
    │   ├── migrations.test.ts      # schema + enum + FK + constraint tests
    │   ├── profiles-rls.test.ts    # profiles RLS + column-guard trigger tests
    │   ├── universities-rls.test.ts # universities RLS tests
    │   └── constraints.test.ts    # UNIQUE / FK / CHECK / CASCADE tests
    ├── e2e/                  # Playwright E2E tests
    └── fixtures/             # shared test fixtures
```

### Trust boundaries (TECHNICAL_ARCHITECTURE §5)

| Boundary            | Trusted?                                                |
| ------------------- | ------------------------------------------------------- |
| Browser             | **No.** All client input re-validated server-side.     |
| Next.js server      | Yes, but authorization checked per-request.             |
| Database (Supabase) | Yes — authoritative persistence; RLS denies by default. |
| Paystack            | **No** until webhook signature verified + transaction re-verified via Paystack API. |
| Supabase Storage    | Public bucket: public read. Private bucket: signed-URL only, server-issued. |

---

## 10. Security notes for contributors

- **Client input is always untrusted.** Every Server Action re-validates
  shape, ownership, and business preconditions server-side — regardless of
  what the client already checked.
- **Money stays in minor units (kobo) at every API/payment boundary.** ₦50,000
  is `5000000`, never a float, never major units. The Zod helper
  `moneyMinorUnitsSchema` enforces this at validation boundaries.
- **Payment confirmation is exclusively server/webhook-authoritative.** No
  phase introduces an admin override or a client callback that writes
  `confirmed`/`success`. This is restated in every payment-touching code
  comment.
- **Booking availability is protected by the database constraint** (partial
  unique index `one_active_booking_per_room`), not by a frontend check. Every
  phase touching reservations proves this with a concurrency test.
- **Private verification documents stay in the private bucket** —
  signed-URL-only, for the life of the project. No phase moves them to
  public storage for convenience.
- **Authorization is enforced server-side and database-side (RLS).** UI
  hiding of an admin button is never treated as the actual security boundary.

---

## 11. What is NOT in this repo (yet)

Phase 0 does NOT include: student/landlord/admin registration UI, property
CRUD, room CRUD, verification workflow, booking workflow, Paystack
integration, webhook processing, reviews, reports, notifications, production
database schema, real storage buckets, or payment confirmation logic.

Each item lands in the phase listed in `IMPLEMENTATION_PLAN.md` §22.

---

## 12. Source-of-truth documents

These documents (in the project root or `planning-docs/`) define what
NetLodge is and how it's built. Do not redesign them silently:

- `PRODUCT_BRIEF.md`
- `MVP_SCOPE.md`
- `PRD.md`
- `DATABASE_SCHEMA.md`
- `TECHNICAL_ARCHITECTURE.md`
- `API_CONTRACTS.md`
- `IMPLEMENTATION_PLAN.md`

If you discover a genuine contradiction or implementation blocker, **stop
and report it** rather than silently changing the architecture.
