# NetLodge — Architecture Proposal

## 1. Current Architecture (Verified)

### Technology Stack
| Layer | Technology | Version | Status |
|---|---|---|---|
| Framework | Next.js (App Router) | 16.4.3 | Verified working |
| UI Library | React | 19.0.0 | Verified working |
| Styling | Tailwind CSS | 4.x | Verified working |
| Components | shadcn/ui + Radix UI | Latest | Verified working |
| Database | Supabase PostgreSQL | 15.x | Verified working |
| Auth | Supabase Auth (SSR, cookie-based) | 2.118.0 | Verified working |
| Payments | Paystack (test mode, REST API) | — | Verified working |
| Rate Limiting | Upstash Redis (distributed) | — | Verified working |
| Hosting | Vercel (standalone output) | — | Verified working |
| CI | GitHub Actions | — | Verified working |
| Image Storage | Supabase Storage (3 buckets) | — | Verified working |

### Component Responsibilities

```
┌─────────────────────────────────────────────────┐
│                   Vercel (Hosting)                │
│  ┌─────────────────────────────────────────────┐ │
│  │            Next.js 16 App Router             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐ │ │
│  │  │  Public   │  │  Student  │  │  Landlord  │ │ │
│  │  │  Routes   │  │  Routes   │  │  Routes   │ │ │
│  │  └────┬─────┘  └────┬─────┘  └─────┬─────┘ │ │
│  │       │              │               │       │ │
│  │  ┌────▼──────────────▼───────────────▼─────┐ │ │
│  │  │           API Routes (52 total)          │ │ │
│  │  │  ┌─────────┐ ┌─────────┐ ┌──────────┐  │ │ │
│  │  │  │ Payments │ │  Admin  │ │  Student  │  │ │ │
│  │  │  │  (2)     │ │  (28)   │ │   (8)     │  │ │ │
│  │  │  └────┬────┘ └────┬────┘ └─────┬────┘  │ │ │
│  │  └───────┼──────────┼─────────────┼───────┘ │ │
│  └──────────┼──────────┼─────────────┼─────────┘ │
│             │          │             │            │
│  ┌──────────▼──────────▼─────────────▼─────────┐ │
│  │          Security Layer                      │ │
│  │  ┌──────────────┐  ┌──────────────────┐     │ │
│  │  │ Rate Limiting │  │  CSRF Validation  │     │ │
│  │  │ (Upstash Redis)│  │  (Origin Header)  │     │ │
│  │  └──────────────┘  └──────────────────┘     │ │
│  └──────────┬──────────┬─────────────┬─────────┘ │
│             │          │             │            │
│  ┌──────────▼──────────▼─────────────▼─────────┐ │
│  │       Service Layer (requireRole)            │ │
│  │  ┌────────────┐ ┌───────────┐ ┌───────────┐ │ │
│  │  │  Finance    │ │   Admin   │ │  Support   │ │ │
│  │  │  Service    │ │  Service  │ │  Service   │ │ │
│  │  └──────┬─────┘ └─────┬─────┘ └─────┬─────┘ │ │
│  └─────────┼─────────────┼─────────────┼───────┘ │
│            │             │             │          │
│  ┌─────────▼─────────────▼─────────────▼───────┐ │
│  │          Supabase PostgreSQL                 │ │
│  │  ┌──────────────────────────────────────┐   │ │
│  │  │  44 Tables (RLS on all)              │   │ │
│  │  │  88 RLS Policies                     │   │ │
│  │  │  43 SECURITY DEFINER Functions       │   │ │
│  │  │  19 Migrations (0001-0018 + 0010b)   │   │ │
│  │  └──────────────────────────────────────┘   │ │
│  │  ┌──────────────────────────────────────┐   │ │
│  │  │  Storage (3 buckets)                 │   │ │
│  │  │  • property-images (public)          │   │ │
│  │  │  • verification-evidence (private)   │   │ │
│  │  │  • ticket-attachments (private)      │   │ │
│  │  └──────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│   Paystack API   │  │  Upstash Redis  │
│  (test mode)     │  │  (rate limiting) │
│                  │  │                  │
│  • Initialize    │  │  • INCR + EXPIRE │
│  • Verify        │  │  • Sliding window│
│  • Refund        │  │  • failClosed    │
│  • Webhook       │  │                  │
└─────────────────┘  └─────────────────┘
```

### Authentication Flow
1. User signs in via Supabase Auth (email/password)
2. Cookie-based session (SameSite=Strict, HttpOnly)
3. `signInWithEmail()` fetches role from `user_roles` table
4. Role resolution uses deterministic priority order
5. `AuthProvider` calls `getCurrentSession()` on mount + auth state changes
6. `RoleShell` redirects mismatched users to their own dashboard
7. `proxy.ts` (middleware) redirects unauthenticated users to `/login`

### Payment Flow
1. Student clicks "Pay" → `POST /api/payments/initiate`
2. Amount derived from `booking.outstanding_kobo` (database)
3. Payment record created with status='initiated'
4. Paystack `initializeTransaction()` called server-side
5. Student redirected to Paystack checkout
6. Paystack redirects back to `/api/payments/verify?reference=...`
7. `verifyTransaction()` calls Paystack verify API (defense in depth)
8. Amount + currency validated against payment record
9. `confirm_payment()` RPC called (atomic, idempotent, FOR UPDATE lock)
10. Booking status → confirmed, ledger entry created, notification sent
11. Paystack webhook (if configured) also calls `confirm_payment()` — idempotent

### Security Architecture
- **RLS**: 88 policies across 44 tables
- **SECURITY DEFINER**: 43 functions with `search_path = public`
- **Authorization**: `requireRole()` in all service-layer functions
- **Rate limiting**: `securityCheck()` on all sensitive endpoints
- **CSRF**: `validateOrigin()` on mutation endpoints
- **Webhook**: HMAC-SHA512 + timing-safe comparison
- **Secrets**: Only `NEXT_PUBLIC_*` vars in client bundles
- **Audit**: Append-only `audit_logs` table (no UPDATE/DELETE via RLS + triggers)
- **Ledger**: Append-only `ledger_entries` table (same protection)

## 2. Architecture Recommendations

### Recommendation 1: Retain Current Stack — VERIFIED
**Current:** Next.js 16 + Supabase + Paystack
**Proposed:** Retain
**Rationale:** The stack is modern, well-supported, and functional. No compelling reason to change.
**Risk of changing:** High (complete rewrite)
**Risk of keeping:** Low

### Recommendation 2: Remove Prisma — REQUIRES APPROVAL
**Current:** Prisma 6.11.1 in package.json, not imported by production code
**Proposed:** Remove prisma, @prisma/client, db:* scripts, src/lib/db.ts, src/lib/data/, src/lib/repositories/
**Rationale:** Dead code adds confusion and 63 dependency entries
**Risk of changing:** Low (nothing imports it)
**Risk of keeping:** Low (confusion only)

### Recommendation 3: Add Email Provider — RECOMMENDED
**Current:** No email delivery (in-app notifications only)
**Proposed:** Integrate Resend or Supabase Email
**Rationale:** Critical events (booking confirmation, payment success) should trigger emails
**Alternatives:** Termii (SMS + email), AWS SES
**Risk of changing:** Low (additive)

### Recommendation 4: Create Test Database — RECOMMENDED
**Current:** All tests blocked by test guard (production target)
**Proposed:** Create separate Supabase project, set NETLODGE_TEST_DB
**Rationale:** Enables integration testing without risking production data
**Risk of changing:** None (additive)
**Cost:** Free tier

### Recommendation 5: Retain Supabase Storage — VERIFIED
**Current:** 3 buckets (property-images, verification-evidence, ticket-attachments)
**Proposed:** Retain
**Rationale:** Functional, RLS-protected, cost-effective
**Alternatives:** Cloudinary (more features, but migration risk)

### Recommendation 6: Retain Paystack — VERIFIED
**Current:** Paystack test mode with server-side verification
**Proposed:** Retain for launch; verify Transfer API for automated payouts
**Rationale:** Paystack is the leading Nigerian payment provider; integration is functional
**Unresolved:** Live mode activation requires business verification + explicit approval

## 3. Trade-off Analysis

| Decision | Option A | Option B | Recommendation |
|---|---|---|---|
| Payment model | Platform collects → manual payout | Paystack split payments | A (simpler, safer for launch) |
| Image storage | Supabase Storage | Cloudinary | A (functional, no migration risk) |
| Email provider | Resend | Supabase Email | Resend (better deliverability) |
| Test database | Separate Supabase project | Local Docker Postgres | A (matches production, free tier) |
| Prisma | Remove | Keep | Remove (dead code) |
| Role switching | Single highest role | User-selectable | Single (simpler, no UX confusion) |
| Renewal | Extend existing booking | Create linked booking | Create linked (preserves history) |
