# NetLodge — Security Audit Report

## Executive Security Summary

NetLodge implements a **defense-in-depth** security architecture with multiple layers:

1. **Database layer**: RLS on all 43 tables, 52 SECURITY DEFINER functions (all with `set search_path = public`), immutable ledger entries, prevent-delete/update triggers on audit logs and ledger
2. **API layer**: 53 of 57 mutation routes have `securityCheck` (rate limiting + CSRF via `validateOrigin`); 4 routes are intentionally exempt (webhook uses HMAC, referral click is anonymous, 2 admin routes use service-layer auth)
3. **Application layer**: Proxy-based session refresh, role-based route protection, client-side rate limiting on auth endpoints
4. **Payment layer**: Server-authoritative pricing via `get_booking_pricing()` RPC, `create_booking()` enforces `auth.uid()` + `has_role('student')` at DB level, `confirm_payment()` is atomic + idempotent, webhook verifies HMAC-SHA512 + re-verifies with Paystack API

**No Critical or High vulnerabilities were found.** The codebase has been through multiple security-focused sessions that systematically closed known issues. Remaining findings are Low/Informational hardening recommendations.

## Attack Surface Inventory

| Surface | Protection |
|---|---|
| Public routes (/, /search, /properties, /rooms) | RLS (anon can read verified+approved only) |
| Auth routes (/login, /register, /forgot-password) | Client-side rate limiting (5/min, 5min lockout) |
| Student routes (/student/*) | Proxy redirect + RoleShell guard + RLS |
| Landlord routes (/landlord/*) | Proxy redirect + RoleShell guard + RLS + explicit ownership checks |
| Admin routes (/admin/*) | Proxy redirect + RoleShell guard + `requireRole()` on every API route |
| API mutation routes | `securityCheck` (rate limit + CSRF origin validation) |
| Payment initiation | Server-derived amount from `booking.outstanding_kobo` |
| Payment verification | Paystack API re-verification + amount/currency validation |
| Webhook | HMAC-SHA512 signature + idempotency check + `confirm_payment` RPC |
| File uploads | Sharp image processing + storage RLS + file type/size validation |
| Database functions | All SECURITY DEFINER with `set search_path = public` |

## Confirmed Vulnerabilities

### No Critical or High vulnerabilities confirmed.

## Low-Severity Findings

### SEC-LOW-001 — Admin verification routes missing CSRF `validateOrigin`
- **Severity**: Low
- **Confidence**: Confirmed
- **Files**: `src/app/api/admin/verification/[caseId]/review/route.ts`, `src/app/api/admin/verification/[caseId]/notes/route.ts`
- **Evidence**: These POST routes don't call `securityCheck` or `validateOrigin`. However, they call `reviewVerificationCase()` and `addInternalNote()` which internally call `requireRole(["verification_officer", "super_admin"])` — so authorization IS enforced at the service layer.
- **Impact**: Theoretical CSRF risk if an attacker can craft a cross-origin request with valid cookies. Supabase's `SameSite=Lax` cookie setting provides additional mitigation.
- **Remediation**: Add `validateOrigin(request)` at the top of each POST handler
- **Regression test**: Send a POST with a mismatched Origin header — should return 403

### SEC-LOW-002 — Hardcoded "32 days ago" in admin profile
- **Severity**: Low (information integrity, not security)
- **File**: `src/components/admin/admin-profile-settings.tsx:114`
- **Evidence**: `Last password change: 32 days ago` is hardcoded text
- **Impact**: Misleading information
- **Remediation**: Remove or fetch from auth metadata

### SEC-LOW-003 — Unused Unsplash domains in next.config.ts
- **Severity**: Low (unnecessary attack surface)
- **File**: `next.config.ts:14-15`
- **Evidence**: `images.unsplash.com` and `plus.unsplash.com` in `remotePatterns` but no code references them
- **Impact**: Unnecessary image proxy surface
- **Remediation**: Remove the two entries

## Unverified Concerns

### SEC-UNV-001 — Dependency vulnerabilities (transitive)
- **Finding**: `bun audit` reports vulnerabilities in transitive dependencies (`ajv`, `deepmerge-ts`, `brace-expansion`) via ESLint and Prisma dev dependencies
- **Status**: Unverified risk — these are dev-dependencies not included in production bundles
- **Remediation**: Update ESLint and Prisma when compatible versions are available

## OWASP Top 10 Mapping

| OWASP Category | Status |
|---|---|
| A01 — Broken Access Control | ✅ Secured (RLS + SECURITY DEFINER + explicit ownership checks) |
| A02 — Cryptographic Failures | ✅ No hardcoded secrets, TLS via Vercel, HMAC-SHA512 for webhooks |
| A03 — Injection | ✅ Parameterized queries via Supabase SDK, no raw SQL |
| A04 — Insecure Design | ✅ Defense-in-depth architecture, server-authoritative pricing |
| A05 — Security Misconfiguration | ✅ Security headers set, RLS enabled on all tables, .env files gitignored |
| A06 — Vulnerable Components | ⚠️ Transitive dev-dependency vulnerabilities (not in production) |
| A07 — Auth Failures | ✅ Rate limiting on auth, session refresh via proxy, MFA via Supabase |
| A08 — Data Integrity Failures | ✅ Immutable ledger, prevent-update/delete triggers, idempotent RPCs |
| A09 — Logging Failures | ✅ Audit logs on all critical operations, console.error in error boundaries |
| A10 — SSRF | ✅ No user-controlled URL fetching; image proxy limited to configured domains |

## Payment Security Verification

| Check | Result |
|---|---|
| Server-authoritative pricing | ✅ `get_booking_pricing()` RPC computes all amounts |
| Client cannot set price | ✅ `create_booking()` accepts no pricing params |
| Payment amount from DB | ✅ `booking.outstanding_kobo` — never client input |
| Paystack verification | ✅ Server-side `verifyTransaction()` on both verify + webhook |
| Amount validation | ✅ Compares Paystack amount to `payment.amount_kobo` |
| Currency validation | ✅ Compares Paystack currency to `payment.currency` |
| Idempotency | ✅ `confirm_payment` RPC locks rows FOR UPDATE, unique constraint on ledger |
| Webhook signature | ✅ HMAC-SHA512 with timing-safe comparison |
| Replay protection | ✅ `confirmed_by_backend` flag prevents double-processing |
| Refund authorization | ✅ Requires finance_admin/super_admin role via RPC |

## Database Security Verification

| Check | Result |
|---|---|
| RLS on all exposed tables | ✅ 43 tables with RLS enabled |
| SECURITY DEFINER search_path | ✅ All 52 functions have `set search_path = public` |
| Policy USING + WITH CHECK | ✅ All policies have both clauses where applicable |
| Service role bypass | ⚠️ Expected — service_role bypasses RLS (used only in API routes with explicit auth) |
| Storage bucket policies | ✅ room-photos, property-images, verification-evidence, ticket-attachments |
| Immutable audit logs | ✅ prevent-delete + prevent-update triggers |
| Immutable ledger | ✅ prevent-delete + prevent-update triggers |
| Idempotent ledger entries | ✅ Unique constraint on (entry_type, reference) |

## Secrets Management

| Check | Result |
|---|---|
| .env files gitignored | ✅ `.env*` in .gitignore (except .env.example) |
| No secrets in source | ✅ All use `process.env.*` |
| No secrets in client bundle | ✅ Only NEXT_PUBLIC_* vars (publishable key, site URL, GA ID) |
| GitHub token in chat history | ⚠️ Was provided by user for pushes — should be rotated if compromised |
| Paystack secret key | ✅ Only in process.env, never exposed to client |
| Supabase secret key | ✅ Only in process.env, used only in server-side admin client |
