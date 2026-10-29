# NetLodge — Comprehensive Codebase Audit Report

## 1. Architecture Overview

NetLodge is a Nigerian student accommodation marketplace built with:

- **Framework**: Next.js 16.4.3 (App Router, standalone output)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Supabase (PostgreSQL 17, RLS, Storage, Auth, Realtime)
- **Payments**: Paystack (test mode)
- **Maps**: Leaflet + react-leaflet
- **PDF**: jsPDF
- **Email**: Resend (optional, env-gated)
- **Image Processing**: Sharp
- **Rate Limiting**: Upstash Redis + client-side localStorage

### Application Structure
- **140 pages** across 7 route groups: (public), (student), (landlord), (manager), (agent), (admin), (auth)
- **57 API routes** (server-side endpoints)
- **28 database migrations** (0001–0027, applied to production)
- **43 RLS-enabled tables** with 88+ policies
- **52 SECURITY DEFINER functions** (all with `set search_path = public`)
- **103 automated assertions** in booking-integrity tests + concurrency tests

### Authentication & Authorization
- Supabase Auth with cookie-based sessions (SSR-compatible)
- `src/proxy.ts` acts as middleware: refreshes sessions, protects routes, redirects auth pages
- Role-based access via `user_roles` table (8 roles: student, landlord, property_manager, agent, verification_officer, support_staff, finance_admin, super_admin)
- `RoleShell` component guards dashboard routes client-side
- Database-level enforcement in SECURITY DEFINER functions (create_booking, confirm_payment, etc.)

## 2. Technology Stack

| Component | Technology | Version |
|---|---|---|
| Framework | Next.js | 16.4.3 |
| Runtime | Bun | 1.3.14 |
| Database | Supabase (PostgreSQL) | 17.11 |
| UI Library | shadcn/ui (Radix) | Latest |
| Styling | Tailwind CSS | 4.x |
| Maps | Leaflet + react-leaflet | 1.9.4 / 5.0.0 |
| PDF | jsPDF | 4.2.1 |
| Email | Resend | 6.35.0 |
| Images | Sharp | 0.34.3 |
| Payments | Paystack | Test mode |

## 3. Functional Findings

### F-001 (Low) — Hardcoded "32 days ago" in admin profile
- **File**: `src/components/admin/admin-profile-settings.tsx:114`
- **Issue**: "Last password change: 32 days ago" is hardcoded text, not derived from actual data
- **Impact**: Misleading information shown to admins
- **Fix**: Remove the field or fetch actual password change timestamp from Supabase Auth

### F-002 (Low) — Unsplash image patterns still in next.config.ts
- **File**: `next.config.ts:14-15`
- **Issue**: `images.unsplash.com` and `plus.unsplash.com` are still in `remotePatterns` but no longer used (all Unsplash images were removed in a previous session)
- **Impact**: Unnecessary config, potential SSRF surface
- **Fix**: Remove the two Unsplash entries from `remotePatterns`

### F-003 (Informational) — Admin settings page is read-only
- **File**: `src/app/(admin)/admin/settings/page.tsx`
- **Issue**: Platform settings mutations require "an audited, reauthenticated workflow that is not yet implemented"
- **Impact**: Admins can view but not change platform settings (commission rate, hold hours, etc.)
- **Fix**: Implement the reauthenticated mutation workflow (out of scope for this audit)

### F-004 (Informational) — Dispute workflow not fully defined
- **File**: `src/app/api/admin/finance/disputes/route.ts`
- **Issue**: Dispute status update endpoints exist but the full workflow is "not yet defined"
- **Impact**: Disputes can be created but resolution flow is incomplete
- **Fix**: Define and implement the dispute resolution workflow

## 4. Code Quality Findings

### CQ-001 (Low) — ESLint React Compiler warning in messaging-page.tsx
- **File**: `src/components/shared/messaging-page.tsx:59`
- **Issue**: React Compiler skips optimization due to manual memoization mismatch
- **Impact**: No functional impact — just an optimization skip warning
- **Fix**: Align useCallback dependencies or remove manual memoization

### CQ-002 (Informational) — 29 client-side mutations
- **Observation**: 29 direct Supabase insert/update/delete calls from client components
- **Assessment**: All are protected by RLS policies. Critical mutations (booking creation, payment) use SECURITY DEFINER RPCs. Profile updates use `.eq("id", session.userId)` (RLS-enforced). This is the standard Supabase pattern and is secure when RLS is correctly configured.

### CQ-003 (Informational) — No unit test framework (Jest/Vitest)
- **Observation**: Tests are TypeScript scripts run with `bun run`, not a formal test framework
- **Assessment**: The 103 assertions in `test-booking-integrity.ts` and the concurrency tests provide good integration coverage of critical paths. However, no unit tests exist for individual components or utility functions.

## 5. Performance and Reliability Findings

### PR-001 (Medium) — Homepage stats no longer cached
- **File**: `src/lib/supabase/property-server.ts:17-51`
- **Issue**: `unstable_cache` was removed because it broke the cookie context. Stats now run 5 parallel count queries on every homepage load.
- **Impact**: Under high traffic, this could be slow
- **Fix**: Use a dedicated anon Supabase client (without cookies) for public stats and wrap in `unstable_cache`, or use `revalidate` on the page itself

### PR-002 (Low) — N+1 query pattern in messaging page
- **File**: `src/components/shared/messaging-page.tsx:75-95`
- **Issue**: For each conversation, fetches last message and unread count separately
- **Impact**: O(n) queries where n = number of conversations
- **Fix**: Use a single query with subqueries or a database view

## 6. Accessibility Findings

### A11Y-001 (Good) — Skip link present
- Public layout has a "Skip to content" link for keyboard navigation ✅

### A11Y-002 (Good) — ARIA labels on icon buttons
- Header buttons have `aria-label` for screen readers ✅

### A11Y-003 (Good) — Form labels present
- Auth forms use `<Label>` components with `htmlFor` attributes ✅

### A11Y-004 (Low) — Map component lacks keyboard navigation
- **File**: `src/components/public/property-map.tsx`
- **Issue**: Leaflet map markers are not keyboard-focusable by default
- **Fix**: Add `tabIndex` and keyboard event handlers to markers

## 7. Evidence and File References

All findings verified through source-code inspection. Baseline checks:
- TypeScript: clean (0 errors)
- ESLint: 1 non-blocking warning
- Production build: success
- 103 booking-integrity tests: all pass
- Concurrency tests: all pass
