# NetLodge — Implementation Roadmap

## Overview
This roadmap emerges from the evidence-based audit findings. Work is organized into logical, independently reviewable milestones.

## Priority Model
- **P0**: Safety, financial integrity, critical security, launch-blocking defects
- **P1**: Essential marketplace functionality
- **P2**: Important improvements and operational maturity
- **P3**: Optional enhancements

---

## Phase 1: Security & Financial Integrity — COMPLETE ✓

**Objective:** Fix all P0 security and financial defects
**Status:** All items complete as of commit 7cddccf

| Task | Priority | Status | Commit |
|---|---|---|---|
| Fix role resolution (getCurrentSession priority) | P0 | ✓ Done | 53f07bc |
| Fix RoleShell role-mismatch redirect | P0 | ✓ Done | 53f07bc |
| Fix open redirect on login | P0 | ✓ Done | 53f07bc |
| Fix auth callback (exchangeCodeForSession) | P0 | ✓ Done | 53f07bc |
| Fix registration role assignment (handle_new_user) | P0 | ✓ Done | 256693a |
| Fix Paystack .test TLD email rejection | P0 | ✓ Done | dcf2d72 |
| Fix Upstash Redis pipeline format | P0 | ✓ Done | d5e2f24 |
| Fix gen_random_bytes in create_booking | P0 | ✓ Done | Direct DB fix |
| Fix admin overview null metrics crash | P0 | ✓ Done | bd68748 |
| Remove all fake Demo mode UI | P1 | ✓ Done | 6dedbf6, e26696c |
| Fix property_manager role name mismatch | P1 | ✓ Done | 974eb08 |
| Add rate limiting to 6 admin API routes | P1 | ✓ Done | 974eb08 |
| Fix tests/.zscripts dependency | P1 | ✓ Done | 974eb08 |
| Remove DemoModeBanner from all pages | P2 | ✓ Done | 7cddccf |
| Fix contact form (was fake) | P1 | ✓ Done | e26696c |
| Fix reset-password (was fake) | P1 | ✓ Done | 6dedbf6 |
| Fix student security page (was fake) | P1 | ✓ Done | 6dedbf6 |

**Definition of Done:** Build passes (151/151), lint 0 errors, TypeScript 0 errors, production health OK.

---

## Phase 2: Launch Configuration — IN PROGRESS

**Objective:** Complete dashboard configuration required for production launch
**Dependencies:** Phase 1 complete
**Estimated effort:** 2-4 hours (manual dashboard work)

| Task | Priority | Status | Dependency |
|---|---|---|---|
| Add all 12 env vars to Vercel | P0 | BLOCKED | Requires Vercel dashboard access |
| Configure Supabase Auth Site URL | P0 | BLOCKED | Requires Supabase dashboard access |
| Configure Paystack webhook URL | P0 | BLOCKED | Requires Paystack dashboard access |
| Configure CRON_SECRET on Vercel | P1 | BLOCKED | Requires Vercel dashboard access |
| Verify end-to-end payment with test card | P0 | BLOCKED | Depends on env vars + webhook |
| Rotate compromised GitHub token | P0 | BLOCKED | Requires GitHub access |
| Rotate compromised Paystack live keys | P0 | BLOCKED | Requires Paystack dashboard |

**Acceptance criteria:** Production health endpoint returns OK; test card payment succeeds; booking is confirmed in database.

---

## Phase 3: Email Notifications — NOT STARTED

**Objective:** Send email notifications for critical events
**Priority:** P2
**Dependencies:** Email provider account (Resend or Supabase Email)
**Estimated effort:** 1-2 days

| Task | Priority | Effort |
|---|---|---|
| Choose email provider | P2 | 2 hours |
| Create email template system | P2 | 4 hours |
| Integrate with create_notification RPC | P2 | 4 hours |
| Send booking confirmation email | P2 | 2 hours |
| Send payment confirmation email | P2 | 2 hours |
| Send password reset email (already works via Supabase) | P2 | 0 (verify only) |

**Acceptance criteria:** Student receives email after booking confirmation; email contains correct booking details.

---

## Phase 4: Dispute Workflow — NOT STARTED

**Objective:** Implement dispute creation and resolution
**Priority:** P2
**Dependencies:** Business policy decisions (D-007)
**Estimated effort:** 2-3 days

| Task | Priority | Effort |
|---|---|---|
| Define dispute policy | P2 | Business decision |
| Create create_dispute RPC | P2 | 4 hours |
| Create resolve_dispute RPC | P2 | 4 hours |
| Build student dispute creation UI | P2 | 4 hours |
| Build admin dispute resolution UI | P2 | 4 hours |
| Add evidence upload for disputes | P2 | 4 hours |
| Write tests | P2 | 4 hours |

**Acceptance criteria:** Student can create a dispute linked to a booking; admin can review, request evidence, and resolve; audit log records all actions.

---

## Phase 5: Renewal Workflow — NOT STARTED

**Objective:** Allow students to renew their tenancy
**Priority:** P2
**Dependencies:** Business policy decisions (D-008)
**Estimated effort:** 2-3 days

| Task | Priority | Effort |
|---|---|---|
| Define renewal policy | P2 | Business decision |
| Create request_renewal RPC | P2 | 4 hours |
| Create approve_renewal RPC | P2 | 4 hours |
| Build student renewal UI | P2 | 4 hours |
| Build landlord approval UI | P2 | 4 hours |
| Integrate renewal payment flow | P2 | 4 hours |
| Write tests | P2 | 4 hours |

**Acceptance criteria:** Student can request renewal; landlord can approve/reject; payment extends tenancy; original booking preserved.

---

## Phase 6: Test Infrastructure — NOT STARTED

**Objective:** Create isolated test database and browser test suite
**Priority:** P2
**Dependencies:** Supabase project creation
**Estimated effort:** 2-3 days

| Task | Priority | Effort |
|---|---|---|
| Create separate Supabase project | P2 | 1 hour |
| Set NETLODGE_TEST_DB env var | P2 | 30 min |
| Run bootstrap-supabase.ts against test project | P2 | 30 min |
| Run all 7 test scripts against test DB | P2 | 2 hours |
| Install and configure Playwright | P2 | 4 hours |
| Write E2E test: student search → book → pay | P2 | 4 hours |
| Write E2E test: landlord property management | P2 | 4 hours |
| Write E2E test: admin dashboard | P2 | 4 hours |
| Write E2E test: role-based access control | P2 | 4 hours |

**Acceptance criteria:** All test scripts pass against test DB; Playwright E2E suite passes in CI.

---

## Phase 7: Dead Code Removal — NOT STARTED

**Objective:** Remove unused Prisma dependency and repository pattern
**Priority:** P3
**Dependencies:** Product owner approval (D-002)
**Estimated effort:** 4 hours

| Task | Priority | Effort |
|---|---|---|
| Remove prisma from package.json | P3 | 30 min |
| Remove src/lib/db.ts | P3 | 5 min |
| Remove src/lib/data/ (fixtures) | P3 | 5 min |
| Remove src/lib/repositories/ | P3 | 5 min |
| Remove db:* scripts from package.json | P3 | 5 min |
| Update bun.lock | P3 | 30 min |
| Verify build still passes | P3 | 30 min |

**Acceptance criteria:** Build passes; no references to removed files; lockfile updated.

---

## Phase 8: Performance & Polish — NOT STARTED

**Objective:** Optimize performance and add finishing touches
**Priority:** P3
**Dependencies:** Phase 1 complete
**Estimated effort:** 1-2 days

| Task | Priority | Effort |
|---|---|---|
| Create proper OG image (1200×630 PNG) | P3 | 2 hours |
| Run Lighthouse audit on key pages | P3 | 2 hours |
| Optimize image loading (next/image priority) | P3 | 4 hours |
| Add proper 404 tracking | P3 | 2 hours |
| Add sitemap submission to Google Search Console | P3 | 1 hour |
| Dependency vulnerability review | P3 | 4 hours |

**Acceptance criteria:** Lighthouse score ≥ 90 on homepage; OG image renders correctly on social media.
