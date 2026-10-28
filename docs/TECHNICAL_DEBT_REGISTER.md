# NetLodge — Technical Debt Register

**Last updated:** 2026-10-28
**Commit:** (pending — Phase 15 in progress)

---

## 1. Fixture-Backed Pages (P1 — Required before full launch)

63 pages across landlord, manager, agent, and admin dashboards import from `fixtures.ts`, `admin-fixtures.ts`, or use `getRepositories()` (dev-adapter). These pages render empty states for real authenticated users but don't provide their intended functionality.

### Student Pages (2)

| Page | Priority | Effort | Notes |
|------|----------|--------|-------|
| `/student/saved` | P1 | Low | Needs Supabase query for `saved_properties` + `properties` join |
| `/student/profile` | P2 | Medium | Needs profile CRUD via Supabase |
| `/student/settings` | P2 | Medium | Needs notification preferences CRUD |
| `/student/security` | P2 | Medium | Needs password change via Supabase Auth |

### Landlord Pages (14)

| Page | Priority | Effort | Notes |
|------|----------|--------|-------|
| `/landlord/bookings` | P1 | Medium | Needs Supabase query for landlord's bookings |
| `/landlord/bookings/[id]` | P1 | Medium | Booking detail + status history |
| `/landlord/availability` | P2 | Medium | Availability calendar |
| `/landlord/payouts` | P1 | Medium | Needs Supabase query for landlord's payouts |
| `/landlord/pricing` | P2 | Medium | Pricing management |
| `/landlord/reports` | P2 | Medium | Revenue/occupancy reports |
| `/landlord/notifications` | P1 | Low | Needs Supabase query for landlord's notifications |
| `/landlord/verification` | P1 | Medium | Verification status + evidence upload |
| `/landlord/rooms/[id]` | P1 | Medium | Room detail |
| `/landlord/rooms/[id]/edit` | P1 | Medium | Room edit |
| `/landlord/rooms/new` | P1 | Medium | Room creation |
| `/landlord/properties/[id]/edit` | P1 | Medium | Property edit |
| `/landlord/properties/[id]/floors` | P1 | Medium | Floor management |
| `/landlord/properties/[id]/rooms` | P1 | Medium | Room list for property |

### Manager Pages (9)

All `/manager/*` pages use fixtures. Priority: P2. Effort: Medium each.

### Agent Pages (5)

All `/agent/*` pages use fixtures. Priority: P2. Effort: Medium each.

### Admin Pages (31)

| Page | Priority | Effort | Notes |
|------|----------|--------|-------|
| `/admin/bookings` | P2 | Low | Oversight view |
| `/admin/commissions` | P3 | Medium | Commission settings |
| `/admin/finance/audit` | P2 | Low | Finance audit logs |
| `/admin/finance/commissions` | P3 | Medium | Commission management |
| `/admin/finance/disputes` | P2 | Medium | Dispute resolution |
| `/admin/finance/payments` | P2 | Low | Payment list (already have API) |
| `/admin/finance/payouts/[id]` | P2 | Low | Payout detail |
| `/admin/finance/reports` | P2 | Medium | Financial reports |
| `/admin/finance/transactions/[id]` | P3 | Low | Transaction detail |
| `/admin/integrations` | P3 | Medium | Integration health |
| `/admin/locations` | P3 | Low | Location management |
| `/admin/properties` | P2 | Low | Property oversight |
| `/admin/reports` | P2 | Medium | Platform reports |
| `/admin/rooms` | P3 | Low | Room oversight |
| `/admin/security` | P2 | Medium | Security center |
| `/admin/settings` | P2 | Medium | Platform settings |
| `/admin/staff` | P2 | Medium | Staff management |
| `/admin/support/conversations` | P3 | Medium | Unified inbox |
| `/admin/support/customers` | P3 | Low | Customer directory |
| `/admin/support/customers/[id]` | P3 | Low | Customer detail |
| `/admin/support/escalations` | P3 | Low | Escalation queue |
| `/admin/support/knowledge-base` | P3 | Medium | KB management |
| `/admin/support/reports` | P3 | Medium | Support reports |
| `/admin/system-health` | P3 | Low | System health |
| `/admin/universities` | P3 | Low | University management |
| `/admin/verification/escalations` | P3 | Low | Escalation queue |
| `/admin/verification/history` | P3 | Low | Decision history |
| `/admin/verification/landlords` | P3 | Low | Landlord KYC queue |
| `/admin/verification/properties` | P3 | Low | Property listing queue |
| `/admin/verification/rooms` | P3 | Low | Room evidence queue |
| `/admin/verification/students` | P3 | Low | Student KYC queue |

---

## 2. Legacy Code & Dead Code

| Item | Priority | Effort | Notes |
|------|----------|--------|-------|
| `src/lib/repositories/index.ts` | P1 | Low | Reads `NEXT_PUBLIC_REPOSITORY_ADAPTER`, always returns `devRepositories`. Remove the adapter switch + env var. |
| `src/lib/repositories/dev-adapter.ts` | P2 | Low | 1573 lines. Keep for test scripts; remove production imports. |
| `src/lib/data/fixtures.ts` | P2 | Low | 843 lines. Keep for test scripts; remove production imports. |
| `src/lib/data/admin-fixtures.ts` | P2 | Low | 1645 lines. Keep for test scripts; remove production imports. |
| `NEXT_PUBLIC_REPOSITORY_ADAPTER` in `.env.example` | P1 | Low | Remove legacy documentation. |
| `DATABASE_URL` (Prisma/SQLite) in `.env.example` | P3 | Low | Remove — Supabase is sole DB. |
| `src/lib/validators/index.ts` Zod errors | P3 | Medium | Pre-existing TS errors in Zod literal validators. |
| `src/app/(auth)/forgot-password/page.tsx` | P2 | Low | Uses `setSubmitting` instead of `isSubmitting` (TS error). |

---

## 3. Test Data in Database

| Item | Priority | Effort | Notes |
|------|----------|--------|-------|
| 20 test properties ("Phase5/7/9 Test...") | P2 | Medium | Need explicit approval before deletion. Have 26 bookings + 26 payments + 6 refunds + 26 ledger entries. |
| 2 legitimate seed properties ("Akoka Heights", "Bariga Gardens") | — | — | Keep — these are seed data from migration 0004. |
| Test auth users created by test scripts | P3 | Low | `test_vo_*`, `test_sa_*`, `test_fa_*`, `test_ss_*` — cleaned up by test scripts but some may remain. |

---

## 4. Missing Features

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| Real-time notifications (SSE/WebSocket) | P3 | High | Currently database-backed. Needs Supabase Realtime subscriptions. |
| Error monitoring (Sentry) | P2 | Low | No error tracking configured. |
| Email delivery verification | P2 | Low | Supabase Auth emails not tested end-to-end. |
| Property image rendering on detail pages | P2 | Low | Upload works but `property_images` not rendered on listing/detail pages. |
| Verification evidence upload UI | P2 | Medium | API exists; VO page doesn't use it. |
| Ticket attachment upload UI | P2 | Medium | API exists; student support page doesn't use it. |
| CSP header | P3 | Medium | Not implemented — needs careful testing with Supabase + Paystack. |
| Student profile/settings CRUD | P2 | Medium | Pages exist but use fixtures. |
| Landlord booking management | P1 | Medium | Pages exist but use fixtures. |

---

## 5. Dependencies

| Package | Status | Notes |
|---------|--------|-------|
| `@supabase/supabase-js` | ✅ Active | Core DB client |
| `@supabase/ssr` | ✅ Active | Cookie-based auth |
| `next` 16.1.3 | ✅ Active | App Router + Turbopack |
| `react` 19 | ✅ Active | |
| `tailwindcss` 4 | ✅ Active | |
| `react-hook-form` | ✅ Active | |
| `zod` | ✅ Active | |
| `@upstash/redis` | ⚠️ Not installed | Needed for distributed rate limiting |
| `@prisma/client` | ⚠️ Legacy | Unused — Supabase is sole DB |
| `prisma` | ⚠️ Legacy | Unused — migrations use raw SQL |

---

## 6. Recommended Next Phase

**Phase 15 — Convert remaining fixture-backed pages to live data:**
1. `/student/saved` + `/student/profile` + `/student/settings` + `/student/security`
2. `/landlord/bookings` + `/landlord/bookings/[id]` + `/landlord/payouts` + `/landlord/notifications`
3. `/landlord/rooms/*` + `/landlord/properties/[id]/*`
4. Remove `NEXT_PUBLIC_REPOSITORY_ADAPTER` + `DATABASE_URL` from `.env.example`
5. Clean up test properties from database (with explicit approval)

**Phase 16 — Production hardening:**
1. Add Sentry error monitoring
2. Configure Upstash Redis for distributed rate limiting
3. Verify Paystack webhook delivery
4. Verify cron job execution
5. Add CSP header
6. Wire upload UIs (verification evidence + ticket attachments)
