# NetLodge — Production Launch Checklist

**Last updated:** 2026-10-28
**Commit:** `582d94a43a1a5a1ed90c2faabc918107f20d7802`

---

## Status Legend

- ✅ **Verified** — Confirmed working in this audit
- ⚠️ **Not verified** — Needs manual verification or external dashboard access
- ❌ **Failing** — Known issue that must be fixed before launch
- 🔲 **Blocked** — Requires external action or approval

---

## 1. Supabase Configuration

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | Project URL configured | ✅ | `NEXT_PUBLIC_SUPABASE_URL` in `.env` |
| 1.2 | Publishable/anon key configured | ✅ | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env` |
| 1.3 | Service-role key configured (server-only) | ✅ | `SUPABASE_SECRET_KEY` in `.env` |
| 1.4 | Database password configured | ✅ | `SUPABASE_DB_PASSWORD` in `.env` |
| 1.5 | All 11 migrations applied | ✅ | Verified via `apply-migrations.ts` |
| 1.6 | RLS enabled on all tables | ✅ | Migration 0003 |
| 1.7 | Storage buckets created | ✅ | 3 buckets: property-images, verification-evidence, ticket-attachments |
| 1.8 | Storage RLS policies applied | ✅ | Migration 0010b |
| 1.9 | Auth Site URL set to production domain | ⚠️ | **Action:** Set in Supabase Dashboard → Authentication → URL Configuration |
| 1.10 | Auth redirect URLs configured | ⚠️ | **Action:** Add production + preview + localhost callback URLs |
| 1.11 | Email confirmation enabled | ⚠️ | **Action:** Verify in Supabase Dashboard → Authentication → Providers → Email |
| 1.12 | Password reset flow configured | ⚠️ | **Action:** Verify redirect URL for password reset |
| 1.13 | Database backups verified | ⚠️ | **Action:** Verify backup schedule in Supabase Dashboard → Database → Backups |

## 2. Paystack Configuration

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | Test secret key configured (`sk_test_*`) | ✅ | `PAYSTACK_SECRET_KEY` in `.env` |
| 2.2 | Test public key configured (`pk_test_*`) | ✅ | `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` in `.env` |
| 2.3 | Refund function refuses live keys | ✅ | `sk_test_*` check in `refundTransaction()` |
| 2.4 | API reachable | ✅ | Verified by `test-paystack-real-api.ts` |
| 2.5 | Transaction initialization works | ✅ | Verified by `test-paystack-e2e.ts` |
| 2.6 | Webhook URL set to production domain | ⚠️ | **Action:** Set in Paystack Dashboard → Settings → API Keys & Webhooks |
| 2.7 | Webhook events subscribed | ⚠️ | **Action:** Subscribe to `charge.success`, `charge.failed` |
| 2.8 | Real test card payment completed | ⚠️ | **Action:** Manually test with card `4084 0836 8058 5131` after deployment |
| 2.9 | Real test refund completed | ⚠️ | **Action:** Manually test refund after a successful test payment |

## 3. Vercel Configuration

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | Repository connected to Vercel | ⚠️ | **Action:** Connect `haycee-sama/netlodge` in Vercel |
| 3.2 | Build command correct | ✅ | `next build` (auto-detected by Vercel) |
| 3.3 | Production branch is `main` | ⚠️ | **Action:** Verify in Vercel project settings |
| 3.4 | All env vars set for Production | ⚠️ | **Action:** Set all 7 required vars (see env matrix below) |
| 3.5 | All env vars set for Preview | ⚠️ | **Action:** Set for preview deployments |
| 3.6 | Custom domain configured | ⚠️ | **Action:** Add domain in Vercel → Settings → Domains |
| 3.7 | HTTPS enforced | ⚠️ | **Action:** Verify Vercel auto-provisions SSL |
| 3.8 | Cron job registered | ⚠️ | **Action:** Verify in Vercel → Project → Cron Jobs |
| 3.9 | `CRON_SECRET` set | ⚠️ | **Action:** Generate with `openssl rand -hex 32` |
| 3.10 | `UPSTASH_REDIS_REST_URL` set | ⚠️ | **Action:** Create Upstash Redis DB, set URL + token |
| 3.11 | `UPSTASH_REDIS_REST_TOKEN` set | ⚠️ | **Action:** Same as above |

## 4. Environment Variable Matrix

| Variable | Required | Client-visible | Purpose | Source | Environments |
|----------|----------|---------------|---------|--------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase project URL | Supabase Dashboard → Settings → API | Prod + Preview + Dev |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Yes | Supabase anon key | Supabase Dashboard → Settings → API | Prod + Preview + Dev |
| `SUPABASE_SECRET_KEY` | Yes | **No** | Supabase service-role key | Supabase Dashboard → Settings → API | Prod + Preview + Dev |
| `PAYSTACK_SECRET_KEY` | Yes | **No** | Paystack test secret key | Paystack Dashboard → API Keys | Prod + Preview + Dev |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Yes | Yes | Paystack test public key | Paystack Dashboard → API Keys | Prod + Preview + Dev |
| `NEXT_PUBLIC_SITE_URL` | Yes | Yes | Production domain URL | Your Vercel domain | Prod + Preview + Dev |
| `SUPABASE_DB_PASSWORD` | Optional | **No** | DB password (migration runner only) | Supabase Dashboard → Database | Dev only |
| `UPSTASH_REDIS_REST_URL` | Optional | **No** | Distributed rate limiting | Upstash Dashboard | Prod (recommended) |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | **No** | Distributed rate limiting | Upstash Dashboard | Prod (recommended) |
| `CRON_SECRET` | Optional | **No** | Reconciliation cron auth | Generate with `openssl rand -hex 32` | Prod only |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional | Yes | GA4 Measurement ID | Google Analytics 4 | Prod (optional) |

## 5. Application Verification

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | Production build succeeds (143/143) | ✅ | `npx next build` |
| 5.2 | Lint passes (0 errors) | ✅ | `bun run lint` |
| 5.3 | Phase 5 payment integrity tests | ✅ | `test-confirm-payment.ts` |
| 5.4 | Phase 6 admin RPC tests | ✅ | `test-admin-rpcs.ts` |
| 5.5 | Phase 7 finance/support tests | ✅ | `test-finance-support-rpcs.ts` |
| 5.6 | Phase 8 student/storage tests | ✅ | `test-phase8-student-storage.ts` |
| 5.7 | Phase 9 integrity/security tests | ✅ | `test-phase9-integrity.ts` |
| 5.8 | Paystack real API test | ✅ | `test-paystack-real-api.ts` |
| 5.9 | Health endpoint | ✅ | `/api/health` returns 200 |
| 5.10 | Sitemap uses live data | ✅ | `sitemap.ts` queries Supabase |
| 5.11 | No demo mode in production | ✅ | No `netlodge-dev-session` cookie |
| 5.12 | Security headers applied | ✅ | `next.config.ts` headers() |
| 5.13 | Booking flow works | ✅ | Browser QA verified |
| 5.14 | GA4 excludes private routes | ✅ | `shouldTrack()` filter |
| 5.15 | No secrets in client bundles | ✅ | No `NEXT_PUBLIC_` on secret keys |

## 6. Post-Deployment Verification

After deployment, perform these manual checks:

1. **Visit `/api/health`** — should return `{"status":"ok"}`
2. **Visit `/login`** — should show login form (no demo buttons)
3. **Visit `/student` while logged out** — should redirect to `/login`
4. **Visit `/admin` while logged out** — should redirect to `/login`
5. **Sign in as student** — should land on `/student` dashboard
6. **Browse properties** — should show real listings from database
7. **Open a room** — should show room details + booking form
8. **Create a booking** — should create booking with `pending_payment` status
9. **Click Pay** — should redirect to Paystack checkout
10. **Complete test payment** — should redirect back, booking confirmed
11. **Check `/student/notifications`** — should show payment confirmation notification
12. **Sign in as finance admin** — should see transaction in finance dashboard
13. **Test `/sitemap.xml`** — should list public pages + verified properties
14. **Test `/robots.txt`** — should disallow private routes
15. **Check response headers** — should include HSTS, X-Frame-Options, etc.

## 7. Launch Decision

**CONDITIONAL GO** — NetLodge can launch for:
- ✅ Property browsing (public pages)
- ✅ Student registration + login
- ✅ Room booking creation
- ✅ Paystack test-mode payment (after manual card verification)

**Must fix before full launch:**
- ⚠️ Complete manual Paystack test card payment
- ⚠️ Set all Vercel environment variables
- ⚠️ Set Supabase Auth Site URL
- ⚠️ Set Paystack webhook URL
- ⚠️ Set Upstash Redis for distributed rate limiting
- ⚠️ Verify cron job is running

**Can defer to post-launch:**
- Convert remaining 63 fixture-backed dashboard pages to live data
- Wire upload UI for verification evidence + ticket attachments
- Implement real-time notifications (SSE/WebSocket)
- Clean up test properties from database
- Add error monitoring (Sentry)
