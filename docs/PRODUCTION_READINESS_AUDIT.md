# NetLodge — Production Readiness Audit

**Audit date:** 2026-10-28
**Commit:** `582d94a43a1a5a1ed90c2faabc918107f20d7802`
**Branch:** `main`
**Auditor:** Automated (GLM)

---

## Executive Summary

**Recommendation: CONDITIONAL GO — limited launch for property browsing and booking creation only.**

NetLodge's core booking → payment → confirmation pipeline is functionally correct and verified by integration tests against the live Supabase database. The production build succeeds (143/143 pages). Authentication, RLS, and SECURITY DEFINER RPCs enforce role-based access correctly.

However, **63 pages across landlord, manager, agent, and admin dashboards still read from in-memory fixtures** rather than the live database. These pages render empty states for real authenticated users (the fixture data is keyed to `dev_*` user IDs that don't match any real Supabase auth session), so they don't expose fake data to real users — but they also don't provide their intended functionality.

**Launch-blocking issues:**
1. 63 dashboard pages use fixtures instead of live data (P1)
2. Distributed rate limiting not configured (no Upstash Redis) (P1)
3. Real Paystack test-mode card payment not verified end-to-end (P1)
4. Cron reconciliation job not verified as running (P2)
5. 20 test properties + 26 payments + 6 refunds in the database need cleanup (P2)

**Verified working:**
- ✅ Student booking flow (create_booking RPC fixed in migration 0011)
- ✅ Payment initialization via real Paystack test API
- ✅ Payment confirmation (confirm_payment RPC — idempotent, atomic)
- ✅ Webhook signature verification (HMAC-SHA512, timing-safe)
- ✅ Refund creation, approval, completion (create_refund, review_refund RPCs)
- ✅ Payout approval/rejection (approve_payout, reject_payout RPCs)
- ✅ Reconciliation (run_reconciliation RPC — idempotent)
- ✅ Student support tickets (create_student_ticket, reply_to_ticket RPCs)
- ✅ Verification Officer workflow (review_verification_case RPC)
- ✅ Super Admin user/role management (set_user_role, set_user_active_status RPCs)
- ✅ Storage buckets + RLS policies (3 buckets: property-images, verification-evidence, ticket-attachments)
- ✅ Notifications (create_notification RPC — deduped)
- ✅ Health endpoint (/api/health)
- ✅ Sitemap (live data from Supabase)
- ✅ Security headers (HSTS, X-Frame-Options, etc.)
- ✅ CSRF/origin validation on mutation endpoints
- ✅ Rate limiting (in-memory, per-instance)
- ✅ Demo mode fully removed (no dev-session cookie, no role switching)
- ✅ All 6 regression test suites pass (Phase 5–9 + Paystack)

---

## Audit Scope

- Repository: `https://github.com/haycee-sama/netlodge` at commit `582d94a`
- Supabase project: `psmjjypiulliudepiurx`
- Paystack: test mode only (`sk_test_*`)
- All 11 SQL migrations (0001–0011) verified as applied
- All 143 Next.js routes verified as building successfully
- 6 integration test suites verified as passing

### Verified facts vs assumptions

| Claim | Status | Evidence |
|-------|--------|----------|
| Build succeeds 143/143 | ✅ Verified | `npx next build` output |
| Phase 5–9 tests pass | ✅ Verified | All 6 test scripts run |
| Paystack API reachable | ✅ Verified | `test-paystack-real-api.ts` |
| Booking flow works | ✅ Verified | Browser QA — booking created |
| 63 pages use fixtures | ✅ Verified | `grep -rln` across src/ |
| RLS enabled on all tables | ✅ Verified | Migration 0003 inspection |
| Storage buckets configured | ✅ Verified | Direct database query |
| Demo mode removed | ✅ Verified | No `netlodge-dev-session` in code |
| Real card payment completed | ❌ Not verified | Cloudflare blocks automated checkout |
| Cron job running | ❌ Not verified | No Vercel dashboard access |
| Upstash Redis configured | ❌ Not verified | No `UPSTASH_REDIS_*` in env |
| Supabase Auth Site URL set | ❌ Not verified | No Supabase dashboard access |

---

## Route/Feature Inventory

### Public Pages (live data ✅)

| Route | Data Source | Status |
|-------|------------|--------|
| `/` (homepage) | Supabase | ✅ Live |
| `/properties` | Supabase | ✅ Live |
| `/properties/[slug]` | Supabase | ✅ Live |
| `/rooms/[id]` | Supabase | ✅ Live |
| `/universities` | Supabase | ✅ Live |
| `/universities/[slug]` | Supabase | ✅ Live |
| `/search` | Fixtures | ⚠️ Fixture-backed |
| `/how-it-works` | Static | ✅ |
| `/safety` | Static | ✅ |
| `/help` | Static | ✅ |
| `/contact` | Static | ✅ |
| `/terms`, `/privacy`, `/cookies` | Static | ✅ |

### Auth Pages

| Route | Status |
|-------|--------|
| `/login` | ✅ Supabase Auth only (demo removed) |
| `/register` | ✅ Supabase Auth (student role only) |
| `/forgot-password` | ✅ Supabase Auth |
| `/reset-password` | ✅ Supabase Auth |

### Student Pages

| Route | Data Source | Status |
|-------|------------|--------|
| `/student` (dashboard) | Supabase | ✅ Live |
| `/student/bookings` | Supabase | ✅ Live |
| `/student/bookings/[id]` | Supabase | ✅ Live (payment via Paystack) |
| `/student/payments` | Supabase | ✅ Live |
| `/student/notifications` | Supabase | ✅ Live |
| `/student/support` | Supabase | ✅ Live |
| `/student/saved` | Fixtures | ⚠️ Fixture-backed |
| `/student/profile` | Fixtures | ⚠️ Fixture-backed |
| `/student/settings` | Fixtures | ⚠️ Fixture-backed |
| `/student/security` | Fixtures | ⚠️ Fixture-backed |

### Landlord Pages (14 fixture-backed)

| Route | Data Source | Status |
|-------|------------|--------|
| `/landlord` (dashboard) | Supabase | ✅ Live |
| `/landlord/properties` | Supabase | ✅ Live |
| `/landlord/properties/new` | Supabase | ✅ Live (with image upload) |
| `/landlord/properties/[id]` | Supabase | ✅ Live |
| `/landlord/transactions` | Supabase | ✅ Live |
| `/landlord/bookings` | Fixtures | ⚠️ Fixture-backed |
| `/landlord/bookings/[id]` | Fixtures | ⚠️ Fixture-backed |
| `/landlord/availability` | Fixtures | ⚠️ Fixture-backed |
| `/landlord/payouts` | Fixtures | ⚠️ Fixture-backed |
| `/landlord/pricing` | Fixtures | ⚠️ Fixture-backed |
| `/landlord/reports` | Fixtures | ⚠️ Fixture-backed |
| `/landlord/notifications` | Fixtures | ⚠️ Fixture-backed |
| `/landlord/verification` | Fixtures | ⚠️ Fixture-backed |
| `/landlord/rooms/*` | Fixtures | ⚠️ Fixture-backed |
| `/landlord/properties/[id]/edit` | Fixtures | ⚠️ Fixture-backed |
| `/landlord/properties/[id]/floors` | Fixtures | ⚠️ Fixture-backed |
| `/landlord/properties/[id]/rooms` | Fixtures | ⚠️ Fixture-backed |

### Manager Pages (9 fixture-backed)

All `/manager/*` pages use fixtures. No live data.

### Agent Pages (5 fixture-backed)

All `/agent/*` pages use fixtures. No live data.

### Admin Pages

| Route | Data Source | Status |
|-------|------------|--------|
| `/admin` (SA overview) | Supabase | ✅ Live |
| `/admin/users` | Supabase | ✅ Live |
| `/admin/users/[id]` | Supabase | ✅ Live |
| `/admin/audit-logs` | Supabase | ✅ Live |
| `/admin/verification` | Supabase | ✅ Live |
| `/admin/verification/queue` | Supabase | ✅ Live |
| `/admin/verification/[caseId]` | Supabase | ✅ Live |
| `/admin/finance` | Supabase | ✅ Live |
| `/admin/finance/transactions` | Supabase | ✅ Live |
| `/admin/finance/refunds` | Supabase | ✅ Live |
| `/admin/finance/payouts` | Supabase | ✅ Live |
| `/admin/finance/reconciliation` | Supabase | ✅ Live |
| `/admin/support/tickets` | Supabase | ✅ Live |
| `/admin/support/tickets/[id]` | Supabase | ✅ Live |
| `/admin/*/notifications` | Supabase | ✅ Live |
| `/admin/announcements` | Supabase | ✅ Live |
| 31 other admin sub-pages | Fixtures | ⚠️ Fixture-backed |

### API Routes (all live ✅)

All `/api/*` routes use live Supabase data. No fixtures in any API route.

---

## Findings

### P0 — Stop-ship

None found. No authentication bypass, no cross-user data exposure, no payment integrity defects, no exposed credentials in committed code.

### P1 — Required before launch

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| 1 | 63 dashboard pages use fixtures | P1 | `grep -rln` confirmed 63 files import from fixtures/dev-adapter |
| 2 | Distributed rate limiting not configured | P1 | No `UPSTASH_REDIS_*` env vars; rate limiting is per-instance in-memory |
| 3 | Real Paystack test card payment not verified | P1 | Cloudflare blocks automated browsers on Paystack checkout |
| 4 | `NEXT_PUBLIC_REPOSITORY_ADAPTER` still in code | P1 | `src/lib/repositories/index.ts` reads it; `.env.example` documents it |
| 5 | Search page uses fixtures | P1 | `src/components/public/search-page-content.tsx` imports from fixtures |

### P2 — Important

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| 6 | 20 test properties in database | P2 | Database audit found 20 properties named "Phase5/7/9 Test..." |
| 7 | Cron job not verified as running | P2 | `vercel.json` configures it but no Vercel dashboard access |
| 8 | Real-time notifications not implemented | P2 | Database-backed only; no SSE/WebSocket |
| 9 | Student profile/settings/security pages use fixtures | P2 | 3 student pages still fixture-backed |

### P3 — Later

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| 10 | Property image upload UI not fully wired | P3 | API exists; wizard has upload component; detail pages don't render uploaded images |
| 11 | Verification evidence upload UI not wired | P3 | API exists; VO page doesn't use it |
| 12 | Ticket attachment upload UI not wired | P3 | API exists; student support page doesn't use it |

---

## Security Audit

### Authentication & Authorization

- ✅ Supabase Auth is the sole authentication authority
- ✅ `proxy.ts` (formerly `middleware.ts`) validates sessions server-side
- ✅ All API routes call `requireRole()` which checks the database
- ✅ RLS enforced on all tables
- ✅ SECURITY DEFINER RPCs have `search_path = public`
- ✅ No demo cookies, no localStorage auth fallback
- ✅ Last-super-admin guard enforced in `set_user_role` + `set_user_active_status`
- ✅ Self-approval guard in `review_verification_case`
- ✅ Separation of duties in `approve_payout` (can't approve own payout)

### CSRF & Origin Validation

- ✅ All mutation endpoints validate Origin header
- ✅ Bearer-token requests skip origin check (token = CSRF protection)
- ✅ `SameSite=Lax` cookies (Supabase default)

### Rate Limiting

- ✅ In-memory token bucket per IP+scope
- ✅ Sensitive endpoints (payment, refund, payout) have `failClosed: true`
- ⚠️ Per-instance only — needs Upstash Redis for multi-instance
- ✅ Returns 429 with `Retry-After` header

### Security Headers

- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-Frame-Options: DENY`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- ✅ `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- ✅ `Cache-Control: no-store` for API + dashboard pages

### Secrets

- ✅ No secrets in committed code
- ✅ `.env` is gitignored
- ✅ `.env.example` contains only placeholders
- ✅ Service-role key never has `NEXT_PUBLIC_` prefix
- ✅ Paystack secret key is server-only
- ✅ `refundTransaction()` refuses live keys (`sk_test_*` check)

---

## Payment Integrity Audit

### Booking Flow

1. ✅ `create_booking` RPC locks room row `FOR UPDATE` — prevents concurrent bookings
2. ✅ Checks room availability + overlapping bookings
3. ✅ Creates booking with `pending_payment` status
4. ✅ Marks room as `held`
5. ✅ Records status history

### Payment Flow

1. ✅ `/api/payments/initiate` derives amount from booking record (not client input)
2. ✅ Verifies booking ownership
3. ✅ Checks booking eligibility (status, hold not expired)
4. ✅ Inserts payment row FIRST (status='initiated'), then calls Paystack
5. ✅ Paystack initialization uses real test API (`https://api.paystack.co`)
6. ✅ Email normalization for Paystack (`.test` TLD → safe fallback)

### Payment Verification

1. ✅ `/api/payments/verify` calls Paystack verify API server-side
2. ✅ Validates amount, currency, transaction status
3. ✅ Calls `confirm_payment` RPC — atomic, idempotent
4. ✅ `confirm_payment` locks payment + booking rows `FOR UPDATE`
5. ✅ Idempotent — second call returns `already_confirmed`
6. ✅ Ledger entry unique on `(entry_type, reference)`
7. ✅ Audit log recorded inside RPC

### Webhook

1. ✅ HMAC-SHA512 signature verification using raw body
2. ✅ Timing-safe comparison (`crypto.timingSafeEqual`)
3. ✅ Re-verifies transaction with Paystack API (defense in depth)
4. ✅ Validates amount + currency
5. ✅ Calls `confirm_payment` RPC (idempotent)
6. ✅ Sends notification via `create_notification` (deduped)

### Refund Flow

1. ✅ `create_refund` validates refundable balance (locks payment row)
2. ✅ Prevents over-refunding (checks existing non-rejected refunds)
3. ✅ `review_refund` calls Paystack refund API (test mode only)
4. ✅ Records provider reference
5. ✅ `mark_refund_completed` is idempotent, creates ledger debit
6. ✅ Terminal status guard — can't re-review rejected/approved refunds

### Payout Flow

1. ✅ `approve_payout` enforces separation of duties
2. ✅ State machine: only `scheduled → in_flight`
3. ✅ `reject_payout` requires reason
4. ✅ Does NOT trigger live transfers
5. ✅ Audit-logged with critical severity

### Reconciliation

1. ✅ `run_reconciliation` is idempotent (second run inserts 0)
2. ✅ Verifies each payment with Paystack API
3. ✅ Flags discrepancies (never auto-fixes)
4. ✅ `resolve_reconciliation` requires notes, audit-logged
5. ✅ Does NOT modify underlying payment records

---

## Storage Audit

| Bucket | Public | Max Size | MIME Types | RLS |
|--------|--------|----------|------------|-----|
| `property-images` | ✅ | 5 MB | JPEG, PNG, WebP, GIF | Public read, auth upload, owner/admin delete |
| `verification-evidence` | ❌ | 10 MB | JPEG, PNG, PDF, WebP | Uploader + VO + SA read, auth upload |
| `ticket-attachments` | ❌ | 10 MB | JPEG, PNG, PDF, WebP, TXT | Owner + support + admin read, auth upload |

- ✅ Storage paths are server-generated (not user-supplied)
- ✅ File size + MIME type validated server-side
- ✅ Private buckets return 1-hour signed URLs
- ✅ Cross-user private read denied (verified by test)

---

## Residual Risks

1. **63 fixture-backed pages** — render empty states for real users but don't provide functionality
2. **Per-instance rate limiting** — sufficient for single-instance Vercel deployment but not multi-instance
3. **No real-time notifications** — database-backed only
4. **20 test properties in database** — need cleanup (requires explicit approval)
5. **Real Paystack card payment not verified** — Cloudflare blocks automated checkout
6. **No email delivery verification** — Supabase Auth email confirmation/password reset not tested end-to-end
7. **No error monitoring** — no Sentry or equivalent configured
8. **No backup verification** — Supabase backups not verified
