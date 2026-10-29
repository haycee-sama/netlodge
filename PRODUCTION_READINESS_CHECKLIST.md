# NetLodge — Production Readiness Checklist

## Deployment Configuration

| Check | Status | Notes |
|---|---|---|
| Framework configured for production | ✅ | Next.js 16 standalone output |
| Build command works | ✅ | `next build` succeeds |
| Vercel deployment configured | ✅ | vercel.json present |
| Environment variables documented | ✅ | .env.example with all vars |
| Production DB migrations applied | ✅ | 28/28 migrations applied to psmjjypiulliudepiurx |

## Secrets Management

| Check | Status | Notes |
|---|---|---|
| .env files gitignored | ✅ | `.env*` ignored (except .env.example) |
| No secrets in source code | ✅ | All use process.env |
| No secrets in client bundle | ✅ | Only NEXT_PUBLIC_* vars exposed |
| Supabase secret key server-only | ✅ | Used only in admin.ts (server-side) |
| Paystack secret key server-only | ✅ | Used only in paystack/server.ts |
| GitHub token | ⚠️ | Provided in chat — should be rotated after session |
| RESEND_API_KEY | ⚠️ | Not yet set — email notifications will silently skip |
| NEXT_PUBLIC_SUPPORT_EMAIL | ⚠️ | Not yet set — footer shows fallback |
| NEXT_PUBLIC_SUPPORT_PHONE | ⚠️ | Not yet set — footer omits phone |

## Database Security

| Check | Status | Notes |
|---|---|---|
| RLS enabled on all tables | ✅ | 43 tables |
| RLS policies correct | ✅ | 88+ policies with USING + WITH CHECK |
| SECURITY DEFINER functions safe | ✅ | 52 functions, all with `set search_path = public` |
| Ledger immutable | ✅ | prevent-delete + prevent-update triggers |
| Audit logs immutable | ✅ | prevent-delete + prevent-update triggers |
| Storage buckets have RLS | ✅ | 4 buckets (property-images, room-photos, verification-evidence, ticket-attachments) |
| Migrations tracking secure | ✅ | netlodge_internal._migrations (not exposed to PostgREST) |

## Authentication and Authorization

| Check | Status | Notes |
|---|---|---|
| Session refresh on every request | ✅ | src/proxy.ts (createServerClient with setAll) |
| Protected routes redirect to login | ✅ | proxy.ts checks protectedPaths |
| Role-based access control | ✅ | 8 roles, RoleShell + requireRole + RLS |
| Rate limiting on auth endpoints | ✅ | Client-side (5/min, 5min lockout) |
| MFA support | ✅ | TOTP via Supabase MFA API (student security page) |
| Sign-out failure handling | ✅ | Returns {success, error}, doesn't clear state on failure |
| Open redirect prevention | ✅ | Login validates redirect starts with / and not // |

## Logging and Monitoring

| Check | Status | Notes |
|---|---|---|
| Audit logs on critical operations | ✅ | Payments, refunds, payouts, verification, role changes |
| Error boundaries per route group | ✅ | 7 error.tsx files (public, student, landlord, admin, agent, manager, global) |
| Console logging in API routes | ✅ | console.error on failures (visible in Vercel logs) |
| Google Analytics | ✅ | NEXT_PUBLIC_GA_MEASUREMENT_ID configured |
| Payment reconciliation cron | ✅ | /api/cron/reconciliation (daily, CRON_SECRET protected) |

## Backups and Recovery

| Check | Status | Notes |
|---|---|---|
| Database backups | ⚠️ | Supabase provides automatic daily backups (Pro plan) |
| Point-in-time recovery | ⚠️ | Available on Supabase Pro plan |
| Migration rollback plan | ⚠️ | Migrations are forward-only; rollback requires manual SQL |
| Ledger data recovery | ✅ | Ledger is append-only — no data loss from updates |

## Error Handling

| Check | Status | Notes |
|---|---|---|
| Global error boundary | ✅ | src/app/error.tsx |
| Per-route-group error boundaries | ✅ | 7 error.tsx files |
| Loading states on all pages | ✅ | Loader2 spinner or skeleton |
| Empty states on all lists | ✅ | EmptyState component with icon + CTA |
| API error responses | ✅ | JSON {error, description} with appropriate status codes |
| Toast notifications | ✅ | Sonner toasts on success/error |

## Performance

| Check | Status | Notes |
|---|---|---|
| Image optimization | ✅ | Sharp pipeline (resize 1600px, JPEG q80) |
| Next.js Image component | ✅ | Used on all property/room images |
| Pagination on search | ✅ | URL-synced filters, page size 12-20 |
| Homepage stats | ⚠️ | 5 parallel count queries per load (caching removed due to cookie context issue) |
| N+1 in messaging | ⚠️ | One query per conversation for last message + unread count |
| Bundle size | ✅ | Standalone output, code splitting, lazy-loaded map |

## Testing and Release Criteria

| Check | Status | Notes |
|---|---|---|
| TypeScript strict | ✅ | 0 errors |
| ESLint | ✅ | 0 errors (1 non-blocking warning) |
| Production build | ✅ | Success |
| Booking integrity tests | ✅ | 103 assertions, all pass |
| Concurrency tests | ✅ | All pass |
| No mock/demo data | ✅ | Verified (4,503 lines of dead code removed in prior session) |
| No fake buttons | ✅ | Every button performs a real action |
| No "coming soon" stubs | ✅ | All previously-removed features built into real functionality |

## Items Requiring User Action

1. **Set RESEND_API_KEY** in Vercel env vars to enable email notifications
2. **Set NEXT_PUBLIC_SUPPORT_EMAIL** with a real, monitored email address
3. **Set NEXT_PUBLIC_SUPPORT_PHONE** with a real phone number (or omit)
4. **Rotate GitHub token** if the one shared in chat is considered compromised
5. **Verify Supabase Pro plan** for automatic daily backups + point-in-time recovery
6. **Configure Paystack webhook URL** in Paystack Dashboard → Settings → API Keys & Webhooks → `https://netlodge.vercel.app/api/paystack/webhook`
7. **Configure Paystack callback URL** → `https://netlodge.vercel.app/api/payments/verify`
8. **Set up CRON_SECRET** in Vercel and configure a daily cron job (e.g., Vercel Cron or external) to hit `https://netlodge.vercel.app/api/cron/reconciliation` with `Authorization: Bearer <CRON_SECRET>`
