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
