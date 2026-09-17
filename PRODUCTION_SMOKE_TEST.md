# NetLodge — Production Smoke-Test Plan

## Purpose

This document defines the minimum smoke-test sequence that must be executed
once real Supabase, Paystack, email provider, scheduler, and production
deployment access exist. It is the **final gate** before directing real
user traffic at the application.

Per IMPLEMENTATION_PLAN.md §22 Phase 13 exit criterion:

> One real end-to-end reservation-and-payment cycle completed successfully
> in the production environment before any real user traffic is directed at it.

Every item below must be executed against the **real production environment**
(not pglite, not sandbox, not mocked). Items marked BLOCKED require
infrastructure that is NOT available in the current development environment.

---

## Prerequisites

Before starting, the following must be provisioned:

1. **Supabase project** — production instance, not local.
2. **All 10 migrations applied** (`0001` through `0010`) via `supabase db push`
   or the Supabase dashboard SQL editor.
3. **Supabase Storage buckets created** — `property-images` (public) and
   `verification-documents` (private) per migration 0004.
4. **Supabase Auth configured** — email/password provider enabled.
5. **Paystack production credentials** — `PAYSTACK_SECRET_KEY` and
   `PAYSTACK_WEBHOOK_SECRET` (live keys, NOT test keys).
6. **Paystack webhook URL configured** — `https://<production-domain>/api/webhooks/paystack`.
7. **Email provider configured** — `EMAIL_PROVIDER_API_KEY` + `EMAIL_PROVIDER_ENDPOINT`.
8. **Production deployment** — Next.js app deployed (Vercel recommended).
9. **Environment variables set** in the deployment platform (NOT in `.env.local`).
10. **HTTPS confirmed** — the production domain must serve over HTTPS.
11. **DNS confirmed** — the production domain resolves to the deployment.
12. **Scheduled job configured** — a cron/scheduled function that calls
    `expireBookings` every 1-2 minutes (Vercel Cron, Supabase Edge
    Functions, or equivalent).

---

## Smoke-Test Sequence

### 1. Supabase Migration Deployment

- [ ] Run `supabase db push` (or apply migrations 0001-0010 in order).
- [ ] Verify all tables exist: `profiles`, `universities`, `landlords`,
      `landlord_verifications`, `properties`, `property_reviews`, `rooms`,
      `property_images`, `room_images`, `bookings`, `payment_transactions`,
      `payment_webhook_events`, `audit_logs`, `reviews`, `reports`.
- [ ] Verify all enums exist: `user_role`, `account_status`,
      `verification_status`, `decision_type`, `property_status`,
      `booking_status`, `payment_status`, `webhook_outcome`,
      `report_status`, `report_target`.
- [ ] Verify all SECURITY DEFINER functions exist:
      `netlodge_is_current_user_admin`, `netlodge_is_current_user_active_admin`,
      `guard_protected_profile_columns`, `sync_landlord_verification_status`,
      `guard_landlord_verifications_append_only`,
      `guard_property_status_transitions`, `guard_reviews_hidden_columns`,
      `guard_reports_status_transitions`, `confirm_booking_payment`,
      `admin_approve_verification`, `admin_reject_verification`,
      `admin_approve_property`, `admin_reject_property`,
      `admin_suspend_property`, `admin_lift_suspension_property`,
      `admin_resolve_report`, `admin_mark_report_under_review`,
      `admin_hide_review`, `admin_unhide_review`.
- [ ] Verify RLS is enabled + forced on every table.
- [ ] Verify the seed university (University of Lagos) is present.

### 2. Authentication

- [ ] Register a test student via the UI (`/register/student`).
- [ ] Verify the student appears in `auth.users` AND `profiles`.
- [ ] Verify `profiles.role = 'student'` (NOT client-supplied).
- [ ] Login as the test student.
- [ ] Verify session cookie is set.
- [ ] Access `/dashboard` — should render.
- [ ] Access `/admin` — should redirect to `/dashboard`.
- [ ] Logout.
- [ ] Verify session cookie is cleared.
- [ ] Attempt login with wrong password — verify generic "Invalid email or password".

### 3. Landlord Verification Flow

- [ ] Register a test landlord via the UI (`/register/landlord`).
- [ ] Verify `landlords` row created with `current_verification_status = 'unsubmitted'`.
- [ ] Upload verification documents (ID + ownership evidence) via signed upload URLs.
- [ ] Submit verification.
- [ ] Verify a new `landlord_verifications` row is created (append-only).
- [ ] Login as admin (manually provisioned — admin accounts are NOT self-registered).
- [ ] Navigate to `/admin/verifications` — verify the submission appears.
- [ ] Click through to review the submission.
- [ ] Request document download URL — verify it works and is short-lived.
- [ ] Approve the verification.
- [ ] Verify `landlords.current_verification_status = 'approved'`.
- [ ] Verify `landlords.verification_valid_until` is set (6 months out).
- [ ] Verify an `audit_logs` row was created with `action = 'landlord_verification.approved'`.
- [ ] Verify the landlord received a notification email (check email provider logs).

### 4. Property Creation and Approval

- [ ] Login as the now-approved landlord.
- [ ] Create a property (area, address, description).
- [ ] Create a room (type, price, occupancy, amenities).
- [ ] Upload a property image.
- [ ] Submit the property for approval.
- [ ] Verify `properties.status = 'submitted'`.
- [ ] Login as admin.
- [ ] Navigate to `/admin/properties` — verify the submission appears.
- [ ] Approve the property.
- [ ] Verify `properties.status = 'approved'`.
- [ ] Verify an `audit_logs` row was created with `action = 'property.approved'`.
- [ ] Verify the landlord received a notification email.

### 5. Discovery

- [ ] As an unauthenticated visitor, navigate to `/discover`.
- [ ] Verify the approved property appears in search results.
- [ ] Verify the property's `area` is shown but NOT the full `address`.
- [ ] Verify the landlord's first name is shown but NOT their email/phone.
- [ ] Click through to the property detail page.
- [ ] Verify rooms are listed with correct prices.
- [ ] Verify the verified badge appears (if landlord verification is valid).

### 6. Reservation + Payment (THE CRITICAL PATH)

- [ ] Login as a test student.
- [ ] Navigate to the property detail page.
- [ ] Click "Reserve" on a listed room.
- [ ] Verify a booking is created with `status = 'reservation_pending'`.
- [ ] Verify `reserved_price` is snapshotted from the room's current price.
- [ ] Verify `hold_expires_at` is set (15 minutes from now).
- [ ] Initiate payment — verify the Paystack authorization URL is returned.
- [ ] Verify `bookings.status = 'payment_pending'`.
- [ ] Verify `payment_transactions` row created with `status = 'pending'`.
- [ ] Redirect to Paystack checkout.
- [ ] Complete payment with a REAL small-value test card (e.g., ₦100).
- [ ] Wait for Paystack webhook delivery.
- [ ] Verify `payment_transactions.status = 'success'`.
- [ ] Verify `bookings.status = 'confirmed'`.
- [ ] Verify `bookings.confirmed_at` is set.
- [ ] Verify the student received a payment confirmation email.
- [ ] Verify the landlord received a "reservation received" email.
- [ ] Navigate to `/dashboard` — verify the confirmed booking appears.

### 7. Payment Edge Cases

- [ ] Attempt to pay for an already-confirmed booking — verify rejection.
- [ ] Wait for the hold to expire on a new reservation — verify the booking
      transitions to `expired` and the room becomes available again.
- [ ] Attempt to pay for an expired booking — verify reconciliation path
      (payment marked `expired`, booking NOT confirmed).
- [ ] Trigger a duplicate webhook delivery — verify idempotency gate
      (`provider_event_id` UNIQUE constraint prevents double confirmation).
- [ ] Submit a webhook with an invalid signature — verify 401 rejection.
- [ ] Submit a webhook with a valid signature but wrong amount — verify
      `verification_failed` outcome.

### 8. Admin Operations

- [ ] Suspend a property — verify it disappears from discovery.
- [ ] Verify existing confirmed bookings on the suspended property remain honored.
- [ ] Lift the suspension — verify the property reappears in discovery.
- [ ] File a report as a student — verify it appears in the admin queue.
- [ ] Resolve the report — verify `status = 'resolved'` + audit log + reporter email.
- [ ] Hide a review — verify it's invisible to anonymous users.
- [ ] Verify a suspended admin cannot perform any admin mutation (RPC denies).

### 9. Security Headers

- [ ] `curl -I https://<production-domain>/` — verify headers:
      - `X-Content-Type-Options: nosniff`
      - `Referrer-Policy: strict-origin-when-cross-origin`
      - `X-Frame-Options: DENY`
      - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [ ] Verify `X-Powered-By` header is ABSENT.
- [ ] Verify CSP is NOT yet set (documented follow-up — requires Paystack/Supabase testing).
- [ ] Verify HSTS is NOT yet set (set only after confirming HTTPS in production).

### 10. Scheduled Job (Expiration)

- [ ] Create a reservation and do NOT pay for it.
- [ ] Wait 15+ minutes (hold window).
- [ ] Verify the booking transitions to `expired` (if the scheduler ran).
- [ ] Verify the room becomes available for a new booking.
- [ ] Create another reservation, expire it, then create a new one on the same room —
      verify the new reservation succeeds (room was released).

### 11. Rate Limiting

- [ ] Attempt 11 logins from the same IP within 1 minute — verify the 11th
      is rejected with HTTP 429.
- [ ] Attempt 6 bookings from the same account within 1 minute — verify the
      6th is rejected.
- [ ] **NOTE**: The InMemoryRateLimiter is per-process only. In a multi-instance
      deployment (Vercel serverless), each instance has its own counter. For
      true distributed rate limiting, configure Vercel middleware + KV/Redis.
      This is documented as NOT VERIFIED.

### 12. Error Boundary

- [ ] Navigate to a non-existent property ID — verify 404 (not a stack trace).
- [ ] Submit invalid JSON to the webhook endpoint — verify 400 (not 500).
- [ ] Attempt an unauthorized admin operation as a student — verify 403.
- [ ] Verify no response body contains SQL internals, stack traces, or secrets.

---

## Sign-Off

All items above must be checked before directing real user traffic.

- [ ] All items passed.
- [ ] Any failures documented with root cause + fix.
- [ ] Final manual walk-through of the full student + landlord happy paths
      completed against production configuration.
- [ ] At least one real end-to-end reservation-and-payment cycle completed
      successfully in the production environment.

**Date:** _______________
**Tester:** _______________
**Environment:** _______________
