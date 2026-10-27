# Testing & Secrets Guide

## Environment Variables

### Public (safe for browser)
```
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  # Supabase publishable/anon key
NEXT_PUBLIC_SITE_URL              # Public site URL for metadata
```

### Server-only (NEVER expose to browser)
```
SUPABASE_SECRET_KEY              # Service-role key — bypasses RLS
SUPABASE_DB_PASSWORD             # Database password for migrations
PAYSTACK_SECRET_KEY              # Paystack API secret (also used to verify webhook signatures — no separate webhook secret needed)
CLOUDINARY_API_KEY               # Cloudinary API key
CLOUDINARY_API_SECRET            # Cloudinary API secret
```

### Rules
1. Never commit `.env` files — they are gitignored.
2. `.env.example` contains placeholders only — no real values.
3. Server-only variables must NOT have `NEXT_PUBLIC_` prefix.
4. The admin Supabase client (`src/lib/supabase/admin.ts`) uses `SUPABASE_SECRET_KEY` and must never be imported in client components.

## Test Account Setup

### Creating test users
1. Register via the `/register` page or Supabase Dashboard → Authentication → Users → Add user.
2. New registrations automatically get the `student` role (via the `handle_new_user` trigger).
3. To assign admin roles, use the Supabase Dashboard SQL Editor:
   ```sql
   INSERT INTO public.user_roles (user_id, role, reason)
   VALUES ('<user-uuid>', 'verification_officer', 'Test setup');
   ```

### Demo accounts (no real auth)
The login page has quick-access demo buttons for UI testing. These create a local session only — they do NOT authenticate against Supabase. Demo accounts are clearly labelled.

## Safe Test Execution

### Database tests
- Use the Supabase session-mode pooler for direct connections.
- Never run destructive tests against production data.
- Use transactions with ROLLBACK for test operations.

### RLS tests
- RLS must be tested with authenticated user sessions, NOT with the service-role key.
- The service-role key bypasses RLS entirely.
- Test both allowed and denied operations for each role.

### Payment tests
- Use Paystack test mode only (`pk_test_` / `sk_test_` keys).
- Never use live payment credentials for testing.
- Test transactions should be clearly labelled.

### Paystack test cards (Nigerian test cards)

These cards only work with `sk_test_` keys. Real cards will be declined in test mode.

| Card number          | Type         | Behaviour                                  |
|----------------------|--------------|--------------------------------------------|
| `4084 0836 8058 5131`| Visa         | Successful charge (PIN `1234`)             |
| `5399 8383 8383 8381`| Mastercard   | Successful charge (PIN `1234`)             |
| `5060 6666 6666 6666`| Verve        | Successful charge (PIN `1234`)             |
| `4084 0836 8058 5130`| Visa         | Declined — simulates insufficient funds    |
| `5126 4490 0000 0006`| Mastercard   | Declined — generic failure                 |

- Use any future expiry date and any 3-digit CVV.
- For bank transfer / USSD channels, follow the on-screen instructions in the Paystack test checkout — they simulate a successful transfer automatically.

### Paystack webhook setup (REQUIRED for production-grade confirmation)

The webhook is the authoritative source of payment state — the redirect URL is not trusted.

1. **Local development (tunnel required)** — Paystack cannot reach `localhost`. Use one of:
   - `ngrok http 3000` → copy the `https://*.ngrok.io` URL
   - `vercel dev` with a public preview URL
   - `cloudflared tunnel --url http://localhost:3000`
2. **Paystack Dashboard** → Settings → API Keys & Webhooks → Add Webhook URL:
   - URL: `https://your-public-domain/api/paystack/webhook`
   - Tick the events: `charge.success`, `charge.failed` (and `refund.processed` once refunds are wired)
3. The webhook signature is computed with **the same `PAYSTACK_SECRET_KEY`** used for API calls (Paystack does not issue a separate webhook secret). The route verifies `x-paystack-signature` as HMAC-SHA512(secret, rawBody) using `crypto.timingSafeEqual` to prevent timing attacks.

### End-to-end payment test plan

Pre-conditions:
- Supabase test project is reachable with valid env vars in `.env`.
- A landlord test account exists with at least one verified property and one available room.
- A student test account exists.
- Paystack test keys are configured and the webhook URL is registered.

Steps:
1. Sign in as the student, browse to a verified property, open a room detail page.
2. Click **Place a hold / Book now** — the `create_booking()` RPC should atomically create a `bookings` row (status `pending_payment`), a `holds` row, and flip `rentable_units.status = 'held'`.
3. On `/student/bookings/[id]`, click **Pay ₦X**. The browser should redirect to Paystack's test checkout.
4. Use the Visa test card `4084 0836 8058 5131` with PIN `1234`. Click **Pay**.
5. Paystack redirects back to `/api/payments/verify?reference=NLG-PAY-...`. The server calls Paystack verify, then atomically:
   - `payments.status = 'successful'`, `payments.confirmed_by_backend = true`
   - `bookings.status = 'confirmed'`, `bookings.paid_kobo = total_kobo`
   - `rentable_units.status = 'occupied'`, `active_booking_id` set
   - `booking_status_history` row inserted
   - `ledger_entries` row inserted
   - `audit_logs` row inserted via `record_audit()` RPC
6. The browser lands on `/student/bookings/[id]?payment=success` — the success banner should show.
7. Visit `/student/payments` — the new payment should appear with a **Backend-verified** badge.
8. Sign in as the landlord (same email domain as the property's `landlord_id`). Visit `/landlord/transactions` — the same payment should appear in the gross/net summary.
9. Paystack should also deliver the `charge.success` webhook within a few seconds. Because the route is idempotent, a duplicate delivery should log "already confirmed — skipping" and return 200.
10. Sign in as `finance_admin` (or `super_admin`) — the transaction should appear in the admin finance dashboards.

Failure scenarios to test:
- **Webhook signature mismatch** — POST an event with a wrong signature → expect 401.
- **Amount tampering** — manually edit the `payments.amount_kobo` column before the webhook arrives → webhook should detect the mismatch and flip the payment to `failed`.
- **Booking cancelled mid-flight** — cancel the booking after initiating payment but before confirming → webhook should detect the `cancelled` status and surface for reconciliation rather than confirming.
- **Duplicate webhook** — replay the same webhook payload twice → second delivery should be a no-op (idempotent).

## Phase 6 — Verification Officer & Super Admin testing

### Test accounts

The following test accounts are pre-configured in the Supabase project (passwords are `TestPass123!` for all):

| Email | Role | Purpose |
|------|------|---------|
| `landlord.test@netlodge.test` | landlord | Owns test properties, can submit verification cases |
| `student.test@netlodge.test` | student | Books rooms, makes payments |
| `vo.test@netlodge.test` | verification_officer | Reviews verification cases (create on demand — see below) |
| `sa.test@netlodge.test` | super_admin | Full platform administration (create on demand — see below) |

To create the VO + SA test accounts:

```bash
bun run scripts/create-admin-test-accounts.ts
```

### Verification Officer workflow test plan

1. Sign in as `vo.test@netlodge.test` at `/login`.
2. Navigate to `/admin/verification` — the dashboard should load with live metrics (new cases, assigned to me, overdue, escalated).
3. Click **Open review queue** → the queue page shows all pending verification cases from the database.
4. Use the status, type, entity, and overdue filters to narrow the list.
5. Click any case → the detail page shows case summary, related property/landlord, evidence list, internal notes, and action buttons.
6. Click **Assign to me** → the case status flips to `under_review` and `assigned_officer_id` is set.
7. Click **Approve** → enter review notes → confirm. The case status flips to `approved` and (for property cases) the property's `verification_status` flips to `approved` and `status` to `verified`.
8. Test **Reject** (requires a reason), **Request info** (requires a message), and **Escalate** (requires a target + reason).
9. Verify that the self-approval guard blocks a VO from reviewing their own submission (entity_id = VO's profile id).
10. Sign in as `sa.test@netlodge.test` → navigate to `/admin/audit-logs` → verify the `verification.approve` audit entry appears.

### Super Admin workflow test plan

1. Sign in as `sa.test@netlodge.test`.
2. Navigate to `/admin` — the platform overview shows real metrics from the database (users by role, properties by status, bookings, payments, verification cases).
3. Navigate to `/admin/users` → search, filter by role/status, click any user.
4. On the user detail page:
   - Test **Change role** (requires a reason) — the `set_user_role` RPC enforces no-self-change and no-demoting-last-super-admin.
   - Test **Suspend account** (requires a reason) — the `set_user_active_status` RPC enforces no-self-suspension and no-suspending-last-super-admin.
   - Test **Reactivate account**.
5. Verify the audit timeline on the user detail page shows all role/status changes.
6. Navigate to `/admin/audit-logs` → filter by category, severity, or search. Verify audit entries are immutable (no edit/delete buttons exist).
7. Navigate to `/admin/verification/queue` → the SA can see the same queue as VOs and can also re-open closed cases.

### Automated tests

Two integration test scripts are included:

```bash
# Tests the SECURITY DEFINER RPCs (review_verification_case, set_user_role,
# set_user_active_status, platform_metrics) against the live Supabase project.
# Creates and cleans up its own test data.
bun run scripts/test-admin-rpcs.ts

# Tests the API route authorization (401 for unauthenticated, 403 for
# wrong-role, 200 for authorized) against the running dev server.
bun run scripts/test-admin-api-auth.ts
```

### Security guarantees verified by tests

- Unauthenticated users receive 401 from all `/api/admin/*` routes.
- Authenticated non-admin users (students) receive 403 from all admin RPCs.
- A VO can review cases but cannot access SA endpoints (users, audit-logs, metrics).
- A VO cannot approve their own submission (self-approval guard).
- A SA cannot change their own role (self-escalation guard).
- A SA cannot suspend their own account (self-suspension guard).
- The last active super_admin cannot be demoted or suspended (lockout guard).
- All privileged actions (approve, reject, escalate, role change, suspend, reactivate) record an audit log entry with the actor, action, target, and reason.
- Audit logs are append-only — no UPDATE or DELETE policies exist on `audit_logs`.
- Demo-mode sessions (cookie-based, no JWT) are redirected away from `/admin` by the middleware and rejected by all API routes.

## Phase 7 — Finance, Support, Reconciliation, and Security Hardening

### Test accounts

Additional test accounts created for Phase 7 (password `TestPass123!`):

| Email | Role | Purpose |
|------|------|---------|
| `fa.test@netlodge.test` | finance_admin | Refunds, payouts, reconciliation |
| `ss.test@netlodge.test` | support_staff | Ticket queue, replies, escalation |

### Finance Admin workflow test plan

1. Sign in as `fa.test@netlodge.test`.
2. `/admin/finance` — dashboard shows real metrics (gross volume, platform revenue, payouts, refunds, success rate).
3. `/admin/finance/transactions` — list of all payments with status/verified badges.
4. `/admin/finance/refunds` — click "New refund" → enter a payment ID, amount (kobo), reason, detail → submit. The `create_refund` RPC validates the refundable balance and locks the payment row.
5. Click "Approve" on a requested refund → the route calls Paystack's test-mode refund API and records the provider reference. The refund moves to "processing".
6. Click "Reject" on a requested refund → requires a reason. The refund moves to "rejected".
7. `/admin/finance/payouts` — click "Approve" on a scheduled payout. The payout moves to "in_flight" (no live transfer). Self-approval is blocked.
8. Click "Reject" on a scheduled payout → requires a reason.
9. `/admin/finance/reconciliation` — click "Run reconciliation" → select a date range → the system creates reconciliation records for all successful payments and verifies each with Paystack. Discrepancies are flagged.
10. Click "Resolve" on a discrepancy → requires resolution notes. The record moves to "resolved" (the underlying payment is NOT modified).

### Support Agent workflow test plan

1. Sign in as `ss.test@netlodge.test`.
2. `/admin/support/tickets` — queue shows all tickets with status/priority filters.
3. Click any ticket → detail page shows the original message, conversation, and action buttons.
4. Click "Assign to me" → ticket moves to "in_progress", `assigned_to` is set.
5. Type a reply → uncheck "Internal note" → click "Send reply" → the message appears in the conversation.
6. Check "Internal note" → type a note → click "Add internal note" → the note appears with a lock icon (visible to staff only, RLS-enforced).
7. Use the status dropdown to move the ticket to "resolved" or "closed".
8. Click "Escalate" → select a target role + reason → the ticket is flagged as escalated.

### Security hardening test plan

The `/api/payments/initiate` and all `/api/admin/finance/*` + `/api/admin/support/*` mutation routes now enforce:

1. **Origin validation** (CSRF mitigation): mutation requests (POST/PUT/PATCH/DELETE) without an `Origin` or `Referer` header are rejected with 403. Requests with a foreign origin are rejected. Bearer-token-authenticated requests skip this check (the token is the CSRF protection).
2. **Rate limiting**: per-IP token bucket. Payment init: 5 burst / 0.2/s sustained. Refund/payout/reconciliation mutations: 5 burst / 0.2/s. Read endpoints: 30 burst / 2/s. When exhausted, returns 429 with `Retry-After`.
3. **Role checks**: every route verifies the caller's role via `requireRole()`.

Test with:
```bash
bun run /tmp/test-security.ts  # CSRF + rate limit checks against dev server
```

### Automated tests

Three integration test scripts:

```bash
# Phase 5: confirm_payment RPC (atomic, idempotent booking confirmation)
bun run scripts/test-confirm-payment.ts

# Phase 6: admin RPCs (verification, role change, suspend, platform metrics)
bun run scripts/test-admin-rpcs.ts

# Phase 7: finance + support RPCs (refunds, payouts, reconciliation, tickets, notifications)
bun run scripts/test-finance-support-rpcs.ts
```

### Rate limiting limitations

The rate limiter is **in-memory per instance**. In a multi-instance deployment (Vercel, Cloud Run, Kubernetes with >1 replica), each instance maintains its own bucket. For true distributed rate limiting, you need a shared store (Redis, Upstash, Cloudflare KV). The current implementation:

- Protects a single instance correctly.
- Degrades gracefully in multi-instance: each instance enforces its own limit, so the effective limit is `limit × instance_count` (less strict, but not unbounded).
- Is a fail-safe baseline — not a substitute for a distributed rate limiter in production.

To enable distributed rate limiting, integrate Upstash Redis or Cloudflare KV in `src/lib/security/api-security.ts`.

### Notification delivery

Notifications are **database-backed** (not real-time). The `notifications` table stores per-user notifications with `read` boolean. The webhook calls `create_notification` (deduped on user+type+title+href within 24h) after payment confirmation.

**Real-time delivery (SSE/WebSocket) is NOT implemented.** To add it:
1. Set up Supabase Realtime subscriptions on the `notifications` table.
2. Add a client-side listener in the auth context.
3. Show a toast when a new notification arrives.

## Credential Cleanup Procedure

When development is complete and temporary credentials are no longer needed:

### 1. Supabase
- [ ] Rotate the `SUPABASE_SECRET_KEY` (Supabase Dashboard → Settings → API Keys → Rotate)
- [ ] Change the database password (Supabase Dashboard → Database → Database password)
- [ ] Delete test users from Authentication → Users
- [ ] Remove test rows from `user_roles`, `profiles`, and other tables

### 2. Paystack
- [ ] Revoke test API keys if dedicated test keys were created
- [ ] Delete test transactions from the Paystack dashboard

### 3. Cloudinary
- [ ] Rotate API secret if test uploads were made
- [ ] Delete test uploaded assets

### 4. Local environment
- [ ] Delete `.env` file or replace with production values
- [ ] Clear browser localStorage (`netlodge:auth:dev`, `netlodge-theme`)
- [ ] Clear browser cookies for the development domain

### 5. CI/CD
- [ ] Remove any CI secrets added specifically for this project
- [ ] Revoke any deploy keys or access tokens

### 6. GitHub
- [ ] Review git history for any accidentally committed secrets
- [ ] Rotate any GitHub tokens that may have been exposed
- [ ] Remove any GitHub Actions secrets that are no longer needed
