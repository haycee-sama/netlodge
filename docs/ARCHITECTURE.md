# NetLodge — System Architecture & Infrastructure

**Last updated:** 2026-10-28
**Stack:** Next.js 16, TypeScript, Supabase/PostgreSQL, Paystack, Vercel

---

## 1. ACID Transactions

NetLodge uses PostgreSQL ACID transactions via SECURITY DEFINER functions:

### Booking Creation (`create_booking`)
- **Atomicity:** Single function — locks room row `FOR UPDATE`, checks availability + overlaps, creates booking, marks room as held, records history — all in one transaction.
- **Consistency:** Partial unique index `uq_bookings_one_active_per_unit` prevents two active bookings on the same room even if the RPC has a bug.
- **Isolation:** `FOR UPDATE` row lock serializes concurrent booking attempts for the same room. Advisory lock function `try_booking_lock()` available as an alternative.
- **Durability:** PostgreSQL WAL ensures committed transactions survive crashes.

### Payment Confirmation (`confirm_payment`)
- **Atomicity:** Locks both payment + booking rows `FOR UPDATE`, flips payment status, flips booking status, updates room, inserts ledger entry, records audit log — all in one transaction.
- **Consistency:** Unique constraint on `ledger_entries(entry_type, reference)` prevents duplicate ledger entries.
- **Isolation:** `FOR UPDATE` on payment row serializes concurrent verify + webhook calls.
- **Durability:** Audit log + ledger are append-only (triggers block UPDATE/DELETE).

### Refund Creation (`create_refund`)
- **Atomicity:** Locks payment row `FOR UPDATE`, computes refundable balance, creates refund row, records audit log — all in one transaction.
- **Isolation:** `FOR UPDATE` prevents concurrent over-refunding.

---

## 2. Caching Layer

### Server-Side Caching (`src/lib/cache/public-cache.ts`)
Uses Next.js `unstable_cache` with tag-based revalidation:

| Cache | Duration | Tag | Invalidation |
|-------|----------|-----|--------------|
| Universities | 1 hour | `universities` | `revalidateUniversityCache()` |
| Featured properties | 5 min | `properties` | `revalidatePropertyCache()` |
| Neighbourhoods | 1 hour | `neighbourhoods` | `revalidateUniversityCache()` |

**Rules:**
- Only public data is cached (universities, verified properties)
- User-specific data (bookings, payments, notifications) is NEVER cached
- API routes + dashboard pages have `Cache-Control: no-store` header
- Cache is invalidated on mutations via `revalidateTag()`

### Client-Side Caching
- Supabase browser client handles its own connection pooling
- React Query (via `QueryProvider`) provides stale-while-revalidate for client fetches
- No localStorage caching of business data

---

## 3. Database Indexing

### Core Indexes (migration 0001)
- All foreign keys indexed
- All `reference` columns (unique) indexed
- All `slug` columns (unique) indexed
- `status` columns indexed for queue queries

### Performance Indexes (migration 0012)
- **Booking overlap detection:** `idx_bookings_unit_dates` on `(rentable_unit_id, check_in, check_out)` with partial index for active statuses only
- **Hold expiry sweep:** `idx_bookings_hold_expires` on `hold_expires_at` for pending bookings
- **Payment reconciliation:** `idx_payments_confirmed_at` for successful payments by date
- **Webhook dedup:** `idx_payments_gateway_ref` for gateway_reference lookup
- **Notification bell:** `idx_notifications_user_read_created` composite index
- **Audit logs:** `idx_audit_logs_timestamp_category` for admin viewer
- **Queue queries:** Composite indexes on `(status, created_at)` for verification cases, support tickets, refunds, reconciliation records

### Constraint Indexes
- `uq_bookings_one_active_per_unit` — partial unique index preventing two active bookings per room
- `uq_payments_provider_txn_id` — unique on Paystack transaction ID for provider-level dedup
- `uq_ledger_entries_entry_type_reference` — prevents duplicate ledger entries

---

## 4. Rate Limiting

### Architecture (`src/lib/security/api-security.ts`)
- **Token bucket algorithm** per IP + scope
- **Upstash Redis** when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are configured (distributed)
- **In-memory fallback** when Redis is not configured (per-instance)
- **Fail-closed** for sensitive endpoints (payment, refund, payout) — returns 429 if Redis is configured but unreachable
- **Fail-open** for non-sensitive endpoints (reads, notification list) — falls back to in-memory

### Rate Limits by Endpoint Type

| Endpoint Type | Burst | Sustained | Fail Policy |
|---------------|-------|-----------|-------------|
| Payment initialization | 5 | 0.2/s | Fail closed |
| Refund create/review | 5 | 0.2/s | Fail closed |
| Payout approve/reject | 5 | 0.2/s | Fail closed |
| Reconciliation run | 2 | 0.1/s | Fail closed |
| Student ticket create | 3 | 0.1/s | Fail open |
| Student ticket reply | 5 | 0.2/s | Fail open |
| Uploads | 10 | 0.5/s | Fail open |
| Admin reads | 30 | 2/s | Fail open |
| Student reads | 30 | 2/s | Fail open |

### Production Requirement
- **Multi-instance deployments (Vercel, K8s):** Must configure Upstash Redis for distributed rate limiting
- **Single-instance:** In-memory limiter is sufficient
- **Webhook + health endpoints:** Not rate-limited (verified by signature/secret respectively)

---

## 5. API Gateway

### Vercel as API Gateway
Vercel acts as the API gateway, providing:
- **TLS termination** (automatic HTTPS)
- **CDN** for static assets
- **Edge network** for global latency
- **Automatic scaling** (serverless functions)
- **DDoS protection** (Vercel's edge firewall)

### Next.js Proxy (Middleware)
`src/proxy.ts` acts as an application-level gateway:
- Session refresh (Supabase cookie refresh)
- Route protection (redirect to /login if unauthenticated)
- Auth page redirect (redirect to / if already authenticated)

### Security Headers (`next.config.ts`)
Applied to all responses via the `headers()` function:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Cache-Control: no-store` for API + dashboard pages

---

## 6. Containerization

### Dockerfile
Multi-stage build for production containerization:
- **Stage 1 (deps):** Install dependencies with Bun
- **Stage 2 (builder):** Build Next.js standalone output
- **Stage 3 (runner):** Minimal production image (Node.js Alpine)

### Features
- Non-root user (`nextjs:nodejs`)
- Health check via `/api/health`
- Exposes port 3000
- Standalone output (no `node_modules` in production image)
- Compatible with Kubernetes, ECS, Cloud Run, Docker Swarm

### Usage
```bash
# Build
docker build -t netlodge .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
  -e SUPABASE_SECRET_KEY=... \
  -e PAYSTACK_SECRET_KEY=... \
  -e NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=... \
  -e NEXT_PUBLIC_SITE_URL=https://your-domain.com \
  netlodge
```

---

## 7. Load Balancing & Horizontal Scaling

### Vercel (Default Deployment)
- **Automatic load balancing** via Vercel's edge network
- **Horizontal scaling** — each serverless function invocation is independent
- **No session affinity needed** — all state is in Supabase (database) or cookies (Supabase Auth)
- **Sticky sessions NOT required** — the architecture is stateless

### Self-Hosted (Docker/K8s)
- Use a reverse proxy (Nginx, Caddy, Traefik) for load balancing
- Multiple container replicas behind the proxy
- **No session affinity** — Supabase Auth uses JWT cookies, not server-side sessions
- **Shared rate limiting required** — Upstash Redis or equivalent

### Scaling Characteristics
- **Stateless:** No server-side session state — any instance can serve any request
- **Database-bounded:** Scaling limited by Supabase connection pool (defaults to 200 connections)
- **Connection pooling:** Supabase uses PgBouncer (transaction mode) for connection pooling
- **Read scaling:** Public reads can be cached (see Caching Layer above)

---

## 8. Reverse Proxy

### Vercel (Default)
Vercel handles reverse proxy automatically:
- HTTPS termination
- Static asset CDN
- Serverless function routing

### Self-Hosted (Caddy)
```Caddyfile
netlodge.example.com {
    reverse_proxy localhost:3000
    encode gzip zstd
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

---

## 9. Message Queues & Asynchronous Processing

### Current Architecture
NetLodge does NOT use a dedicated message queue. All operations are synchronous:
- Booking creation → immediate response
- Payment verification → synchronous Paystack API call
- Webhook processing → synchronous, returns 200 immediately
- Notification creation → synchronous database insert

### Future: Message Queue Integration
For high-volume operations, a message queue (e.g., Supabase Queue, Redis Streams, or AWS SQS) could be used for:
- **Email notifications** (queue → process asynchronously)
- **Reconciliation runs** (queue → process in background)
- **Image processing** (queue → resize/optimize after upload)
- **Analytics events** (queue → batch send to GA4)

### Webhook as Event Source
The Paystack webhook acts as a lightweight event queue:
- `charge.success` → payment confirmation
- `charge.failed` → payment failure recording
- `refund.processed` → refund completion (future)

---

## 10. Asynchronous Processing

### Cron Jobs
- **Reconciliation:** `GET /api/cron/reconciliation` — daily at 2 AM (Vercel Cron)
  - Compares local payments with Paystack verify API
  - Flags discrepancies for human review
  - Idempotent — safe to retry
  - Authenticated via `CRON_SECRET`

### Hold Expiry
- `release_expired_holds()` RPC — releases rooms with expired booking holds
- Can be called by the cron job or a scheduled trigger
- Updates booking status to `expired` + sets room back to `available`

### Background Tasks (Future)
- **Email sending:** Supabase Auth handles password reset + email confirmation emails
- **Image optimization:** Next.js Image component handles on-demand optimization
- **Sitemap regeneration:** Next.js `sitemap.ts` is regenerated on each request (or cached)

---

## 11. Connection Pooling

### Supabase Connection Pooling
Supabase provides PgBouncer (transaction mode) by default:
- **Connection string:** `postgresql://postgres.{ref}:{password}@aws-0-{region}.pooler.supabase.com:6543/postgres`
- **Max connections:** 200 (Supabase Pro plan)
- **Pool mode:** Transaction (suitable for serverless)
- **Used by:** Migration runner (`scripts/apply-migrations.ts`)

### Next.js Server-Side
- Each serverless function invocation creates a new Supabase client
- The client is lightweight (HTTP-based, not a persistent connection)
- No connection leak risk — the client is garbage collected after the function returns

### Migration Runner
- Uses the Supabase pooler for direct PostgreSQL access
- Connects via `pg` library with connection timeout

---

## 12. Idempotency

### Payment Confirmation
- `confirm_payment()` RPC checks `payment.status === 'successful' && payment.confirmed_by_backend` at the start — returns `already_confirmed` if true
- `FOR UPDATE` lock on payment row serializes concurrent calls
- Ledger entry has `UNIQUE(entry_type, reference)` — duplicate insert is a no-op (`ON CONFLICT DO NOTHING`)
- Audit log is append-only (no UPDATE/DELETE triggers)

### Webhook Processing
- Signature verification rejects forged/duplicate deliveries
- Payment reference is unique — the same Paystack transaction can't create two payment rows
- `provider_transaction_id` column has a unique partial index for provider-level dedup

### Booking Creation
- `FOR UPDATE` on room row serializes concurrent attempts
- Partial unique index `uq_bookings_one_active_per_unit` prevents two active bookings
- Date-range overlap check inside the locked transaction

### Refund Creation
- `FOR UPDATE` on payment row serializes concurrent refund attempts
- Refundable balance computed inside the locked transaction
- Terminal status guard — can't re-review rejected/approved refunds

### Support Ticket Replies
- `reply_to_ticket()` RPC checks ownership + ticket status inside the transaction
- Closed tickets can't receive replies

### Notification Creation
- `create_notification()` RPC deduplicates on `(user_id, type, title, href)` within 24 hours
- Prevents webhook retries from spamming users
