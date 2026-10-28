# NetLodge — Production Deployment Guide

This document covers everything required to deploy NetLodge to production on Vercel with Supabase and Paystack (test mode).

## 0. Bootstrap a fresh Supabase project (one-shot)

If you are setting up a NEW Supabase project (e.g. migrating from test to production, or creating a separate test project), use the bootstrap script:

```bash
# 1. Create a new Supabase project at https://supabase.com/dashboard/new
#    Note the project ref (e.g. abcdefghijklmnop) and DB password.

# 2. Create a .env.bootstrap file with the new project's credentials:
cat > .env.bootstrap <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://<new-project-ref>.supabase.co
SUPABASE_DB_PASSWORD=<your-db-password>
SUPABASE_SECRET_KEY=<service-role-key-from-dashboard>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key-from-dashboard>
EOF

# 3. Run the bootstrap script:
bun run scripts/bootstrap-supabase.ts
```

The bootstrap script:
- Applies all 14 SQL migrations (schema, RLS, functions, triggers, seed data, storage buckets, storage policies, performance indexes)
- Creates 6 test user accounts (landlord, student, VO, SA, FA, SS — all `TestPass123!`)
- Verifies all 43 tables, 3 storage buckets, and test accounts exist
- Prints next-step instructions

The script is **idempotent** — safe to re-run. It refuses to run against the known production project (`psmjjypiulliudepiurx`) unless `NETLODGE_BOOTSTRAP_ALLOW_PROD=1` is set.

To run only the migrations (no test accounts, no verification):
```bash
bun run scripts/apply-migrations.ts
```

The migration runner also reads from env vars (no hardcoded project refs). It tries common Supabase pooler regions automatically; set `SUPABASE_POOLER_HOST` if your project is in a different region.

**After bootstrap, complete the manual steps in sections 1–5 below.** The script cannot configure Supabase Auth URLs, Paystack webhooks, or Vercel env vars — those require dashboard access.

## Prerequisites

- A Vercel account with the NetLodge repo connected
- A Supabase project with all migrations applied (0001–0013)
- A Paystack business account in test mode (`sk_test_*` + `pk_test_*` keys)

## 1. Vercel environment variables

Set these in the Vercel project settings (Settings → Environment Variables). Create separate values for Production, Preview, and Development as noted.

| Variable | Required | Client-visible | Purpose | Where to obtain | Environments |
|----------|----------|---------------|---------|-----------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase project URL | Supabase Dashboard → Settings → API → Project URL | Production + Preview + Development |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Yes | Supabase anon/publishable key | Supabase Dashboard → Settings → API → Project API keys → `anon` `public` | Production + Preview + Development |
| `SUPABASE_SECRET_KEY` | Yes | **No** (server-only) | Supabase service-role key — bypasses RLS, used for admin operations | Supabase Dashboard → Settings → API → `service_role` | Production + Preview + Development |
| `SUPABASE_DB_PASSWORD` | Optional | **No** | Database password — used only by the migration runner script | Supabase Dashboard → Database → Database password | Development only (run migrations locally) |
| `PAYSTACK_SECRET_KEY` | Yes | **No** (server-only) | Paystack test secret key — must start with `sk_test_` | Paystack Dashboard → Settings → API Keys & Webhooks → Test Secret Key | Production + Preview + Development |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Yes | Yes | Paystack test public key | Paystack Dashboard → Settings → API Keys & Webhooks → Test Public Key | Production + Preview + Development |
| `NEXT_PUBLIC_SITE_URL` | Yes | Yes | Deployed site URL (used for Paystack callbacks + CSRF origin validation) | Your Vercel domain (e.g. `https://netlodge.vercel.app`) | Production (set to prod domain) + Preview (set to preview domain) + Development (`http://localhost:3000`) |
| `UPSTASH_REDIS_REST_URL` | Optional | **No** | Upstash Redis REST URL for distributed rate limiting | Upstash Dashboard → your database → REST API section | Production (recommended) |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | **No** | Upstash Redis REST token | Upstash Dashboard → your database → REST API section | Production (recommended) |
| `CRON_SECRET` | Optional | **No** | Secret for the `/api/cron/reconciliation` endpoint | Generate with `openssl rand -hex 32` | Production only |

**Notes:**
- `NEXT_PUBLIC_*` variables are bundled into the browser — never put secrets in them.
- `SUPABASE_SECRET_KEY` and `PAYSTACK_SECRET_KEY` are server-only — they must never have the `NEXT_PUBLIC_` prefix.
- If `UPSTASH_REDIS_*` is not set, rate limiting falls back to in-memory (per-instance). Sensitive endpoints (payment init, refunds, payouts) fail closed if Redis is configured but unreachable.

## 2. Supabase configuration

### Auth settings
- **Site URL**: Set to your production domain (e.g. `https://netlodge.vercel.app`)
- **Redirect URLs**: Add:
  - `https://your-domain.com/auth/callback`
  - `https://your-preview-domain.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`
- **Email auth**: Enabled (email + password)
- **Email confirmations**: Enabled (users must verify email before first login)

### Database
- All 11 migrations (0001–0010b) must be applied. Run `bun run scripts/apply-migrations.ts` locally to verify.
- RLS is enabled on every application table.
- Storage buckets (`property-images`, `verification-evidence`, `ticket-attachments`) are created with correct public/private flags + RLS policies.

### Staging project (recommended)
If you have a separate Supabase project for Preview deployments:
- Set the Preview environment variables to point to the staging project
- This prevents Preview deployments from modifying production data

If you only have one Supabase project:
- **Risk**: Preview deployments will read/write production data
- **Mitigation**: Ensure Preview deployments use the same RLS policies (they do by default) and that admin RPCs enforce role checks (they do)

## 3. Paystack configuration

### Test mode (current)
- Use `sk_test_*` and `pk_test_*` keys only
- The refund function (`refundTransaction`) refuses to call the live API — it checks `secretKey.startsWith("sk_test_")` and rejects otherwise
- **Do NOT switch to live keys** without explicit approval

### Webhook URL
- Set in Paystack Dashboard → Settings → API Keys & Webhooks → Webhook URL
- Production: `https://your-domain.com/api/paystack/webhook`
- The webhook verifies HMAC-SHA512 signatures using `PAYSTACK_SECRET_KEY`
- Events to subscribe to: `charge.success`, `charge.failed` (and `refund.processed` once wired)

### Callback URL
- Paystack redirects users back to `{NEXT_PUBLIC_SITE_URL}/api/payments/verify?reference=NLG-PAY-...`
- The verify route calls Paystack's verify API server-side — the redirect is NOT trusted as proof of payment

## 4. Vercel deployment

### Build configuration
- **Framework**: Next.js (auto-detected)
- **Build command**: `next build` (Vercel runs this automatically)
- **Output**: Standalone (configured in `next.config.ts`)
- **Node.js version**: 20.x (or latest LTS)

### Cron jobs
`vercel.json` configures a daily reconciliation cron job:
```json
{ "crons": [{ "path": "/api/cron/reconciliation", "schedule": "0 2 * * *" }] }
```
- The endpoint authenticates via `CRON_SECRET` (set in Vercel env vars)
- **Verification**: After deployment, check Vercel → Project → Cron Jobs to confirm the job is registered

### Security headers
`next.config.ts` adds these headers to all responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

API routes and dashboard pages have `Cache-Control: no-store` to prevent caching personalized data.

### Custom domain
- Add your custom domain in Vercel → Project → Settings → Domains
- Update `NEXT_PUBLIC_SITE_URL` to match
- Update Supabase Auth Site URL + Redirect URLs to match
- Update Paystack webhook URL to match

## 5. Post-deployment verification

After deployment, verify:

1. **Auth**: Sign in with a real account → confirm redirect to dashboard
2. **Unauthenticated access**: Visit `/student` while logged out → confirm redirect to `/login`
3. **Paystack**: Initialize a test payment → confirm redirect to `checkout.paystack.com`
4. **Webhook**: Complete a test payment → confirm the booking is confirmed in the database
5. **Storage**: Upload a property image → confirm it appears in the listing
6. **Rate limiting**: Send 10 rapid requests to `/api/payments/initiate` → confirm 429 response
7. **Cron**: Visit `/api/cron/reconciliation` without auth → confirm 401; with `CRON_SECRET` → confirm 200
8. **Security headers**: Check response headers in browser devtools → confirm HSTS + X-Frame-Options present

## 6. Demo mode removal (Phase 10)

Demo mode has been completely removed:
- No demo login buttons on `/login`
- No `netlodge-dev-session` cookie
- No `signIn()` / `switchRole()` in the auth context
- No role switcher in the user menu
- `DemoModeBanner` now shows "Live data" instead of "Demo mode"
- Middleware requires a real Supabase session for all protected routes (no demo fallback)
- If Supabase is unreachable, users are redirected to `/login` (fail closed)

The `dev-adapter` + `fixtures` files remain in the codebase for isolated test scripts but are not imported by any production route.
