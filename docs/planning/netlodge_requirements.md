# NetLodge — Product & Engineering Requirements Register

## Overview
This document defines the functional and non-functional requirements for NetLodge, a Nigerian student accommodation marketplace. Each requirement has a unique ID, priority, dependencies, and acceptance criteria.

## Priority Levels
- **P0**: Critical — safety, financial integrity, launch-blocking
- **P1**: Essential — core marketplace functionality required for launch
- **P2**: Important — operational maturity and completeness
- **P3**: Optional — enhancement and polish

---

## Product Requirements (PROD)

| ID | Requirement | Priority | Dependencies | Acceptance Criteria |
|---|---|---|---|---|
| PROD-001 | Students can search for accommodation by university, neighbourhood, price, and unit type | P1 | None | Search returns verified properties; filters work correctly; empty state shown when no results |
| PROD-002 | Students can view property details with accurate images, facilities, and room listings | P1 | PROD-001 | Property detail page shows correct images, facilities, and available rooms |
| PROD-003 | Students can view individual room details including capacity, furnishing, rent, and availability | P1 | PROD-002 | Room detail page shows correct information; unavailable rooms are clearly marked |
| PROD-004 | Students can reserve a specific room with a 24-hour hold | P1 | PROD-003 | Booking creates a hold; room status changes to 'held'; hold expires after 24h |
| PROD-005 | Students can complete payment via Paystack (test mode) | P1 | PROD-004 | Payment is verified server-side; booking confirmed only after verification |
| PROD-006 | Students can view their bookings and payment history | P1 | PROD-005 | Student dashboard shows bookings with correct status and payment state |
| PROD-007 | Students can manage their profile and security settings | P1 | None | Profile editable; password changeable via Supabase Auth |
| PROD-008 | Students can save properties for later viewing | P2 | PROD-001 | Saved properties persist and are viewable in dashboard |
| PROD-009 | Students can raise support tickets | P1 | None | Tickets created via RPC; visible to support staff |
| PROD-010 | Students can cancel bookings where policy permits | P2 | PROD-005 | Cancellation follows documented policy; refund eligibility calculated |

---

## Booking Requirements (BOOK)

| ID | Requirement | Priority | Dependencies | Acceptance Criteria |
|---|---|---|---|---|
| BOOK-001 | A booking targets a specific rentable unit, not a property | P0 | None | bookings.rentable_unit_id is NOT NULL and references rentable_units |
| BOOK-002 | Concurrent booking attempts for the same unit cannot both succeed | P0 | BOOK-001 | FOR UPDATE lock + overlap check prevents double-booking |
| BOOK-003 | A temporary reservation expires after a configurable hold period | P0 | BOOK-001 | release_expired_holds() RPC resets expired bookings; default 24h |
| BOOK-004 | Booking cost is snapshotted at creation time | P0 | BOOK-001 | base_rent, additional_charges, caution_deposit, service_fee, total are stored on booking row |
| BOOK-005 | Price changes after booking do not affect the confirmed amount | P0 | BOOK-004 | Booking total_kobo is immutable after creation |
| BOOK-006 | Client-provided prices are never authoritative | P0 | BOOK-001 | create_booking() RPC uses parameters but payment init derives amount from booking.outstanding_kobo |
| BOOK-007 | Booking status transitions are well-defined and enforced | P1 | BOOK-001 | State machine: draft → pending_payment → payment_initiated → confirmed → active → completed |
| BOOK-008 | Cancelled bookings preserve historical payment records | P1 | BOOK-007 | Cancellation does not delete payments, ledger entries, or audit logs |
| BOOK-009 | Expired holds release the room back to available | P0 | BOOK-003 | Room status returns to 'available' when hold expires |
| BOOK-010 | A student can book a different room while having an active tenancy elsewhere | P2 | BOOK-001 | System does not block booking a different unit; only blocks overlapping dates on the same unit |

---

## Payment Requirements (PAY)

| ID | Requirement | Priority | Dependencies | Acceptance Criteria |
|---|---|---|---|---|
| PAY-001 | Payment initialization uses server-side Paystack API | P0 | None | initializeTransaction() called server-side; secret key never exposed to browser |
| PAY-002 | Payment amount is derived from the database, not client input | P0 | BOOK-004 | amount_kobo = booking.outstanding_kobo in initiate route |
| PAY-003 | Payment verification calls Paystack verify API server-side | P0 | PAY-001 | verifyTransaction() called before confirm_payment() RPC |
| PAY-004 | Webhook signature is verified with HMAC-SHA512 + timing-safe comparison | P0 | None | verifyWebhookSignature() used; invalid signatures rejected with 401 |
| PAY-005 | Duplicate webhook deliveries are handled idempotently | P0 | PAY-004 | confirm_payment() returns 'already_confirmed' for duplicate; no duplicate ledger entries |
| PAY-006 | Amount and currency are validated against the payment record | P0 | PAY-003 | requested_amount must match payment.amount_kobo; currency must match |
| PAY-007 | A successful redirect alone does not confirm payment | P0 | PAY-003 | /api/payments/verify calls verifyTransaction() before state change |
| PAY-008 | Failed payments do not leave partial financial records | P1 | PAY-005 | Failed payment updates status to 'failed' with reason; no ledger entry created |
| PAY-009 | Refund amounts cannot exceed the refundable balance | P0 | None | create_refund() checks refundable = amount_kobo - sum(existing non-rejected refunds) |
| PAY-010 | Refunds call Paystack refund API (test mode only) | P0 | PAY-009 | refundTransaction() refuses non-sk_test_* keys |
| PAY-011 | Ledger entries are append-only (no UPDATE or DELETE) | P0 | None | RLS denies UPDATE/DELETE; trigger functions prevent modification |
| PAY-012 | Ledger entries have a unique constraint on (entry_type, reference) | P0 | None | Duplicate entries are rejected by the database |

---

## Tenancy Requirements (TEN)

| ID | Requirement | Priority | Dependencies | Acceptance Criteria |
|---|---|---|---|---|
| TEN-001 | Tenancy is tracked via booking status (confirmed → active → completed) | P1 | BOOK-007 | State transitions follow the defined state machine |
| TEN-002 | Tenancy expiry is calculated from check_out date | P1 | TEN-001 | Expiry is date-based; no separate tenancy table |
| TEN-003 | Renewal extends the tenancy for a new rental period | P2 | TEN-001 | **NOT YET IMPLEMENTED** — renewal workflow is a P2 gap |
| TEN-004 | Expired tenancies release the room back to available | P1 | TEN-002 | Room status returns to 'available' when booking completes |
| TEN-005 | A student can hold multiple tenancies for different units | P2 | BOOK-010 | System allows multiple active bookings on different units |

---

## Notification Requirements (NOT)

| ID | Requirement | Priority | Dependencies | Acceptance Criteria |
|---|---|---|---|---|
| NOT-001 | Booking confirmation sends a notification to the student | P1 | BOOK-007 | create_notification() RPC called after confirm_payment() |
| NOT-002 | Booking confirmation sends a notification to the landlord | P1 | BOOK-007 | **NOT YET IMPLEMENTED** — landlord notification not sent |
| NOT-003 | Payment failure sends a notification to the student | P1 | PAY-008 | Notification created with type='payment_update' |
| NOT-004 | Notifications are deduplicated by (user_id, type, title, body) | P1 | None | create_notification() uses ON CONFLICT DO NOTHING |
| NOT-005 | Email delivery for critical events | P2 | NOT-001 | **NOT YET IMPLEMENTED** — no email provider integrated |
| NOT-006 | In-app notifications support read/unread status | P1 | NOT-001 | notifications.read column; /api/notifications/[id]/read endpoint |

---

## Security Requirements (SEC)

| ID | Requirement | Priority | Dependencies | Acceptance Criteria |
|---|---|---|---|---|
| SEC-001 | All 44 tables have RLS enabled | P0 | None | Verified: 44/44 tables have rowsecurity=true |
| SEC-002 | Admin roles cannot be self-assigned via registration | P0 | None | handle_new_user() only accepts marketplace roles |
| SEC-003 | API routes enforce role authorization server-side | P0 | None | requireRole() called in all service functions |
| SEC-004 | Payment initiation requires booking ownership | P0 | None | booking.student_id === user.id check |
| SEC-005 | Open redirects are prevented on login | P0 | None | redirect param validated: startsWith('/') && !startsWith('//') |
| SEC-006 | Rate limiting on sensitive endpoints | P1 | None | securityCheck() on payment, refund, payout, admin APIs |
| SEC-007 | CSRF origin validation on mutation endpoints | P1 | None | validateOrigin() in securityCheck() |
| SEC-008 | No secrets in client bundles | P0 | None | Only NEXT_PUBLIC_* vars exposed; verified by code scan |
| SEC-009 | SECURITY DEFINER functions have search_path=public | P0 | None | All 43 functions verified; migration 0017 fixed 6 trigger functions |
| SEC-010 | anon EXECUTE revoked on all RPCs except handle_new_user | P0 | None | Migration 0017 revoked 36 grants |
| SEC-011 | Webhook signature verification prevents forged callbacks | P0 | None | HMAC-SHA512 + timingSafeEqual |
| SEC-012 | Audit logs are append-only | P0 | None | RLS + trigger functions prevent UPDATE/DELETE |

---

## Operations Requirements (OPS)

| ID | Requirement | Priority | Dependencies | Acceptance Criteria |
|---|---|---|---|---|
| OPS-001 | CI runs lint, typecheck, and build on every push/PR | P1 | None | GitHub Actions workflow configured and passing |
| OPS-002 | Test database guard prevents production writes | P0 | None | _test-guard.ts refuses production by default |
| OPS-003 | Reset script has 5 safety layers | P0 | None | CI refusal, NODE_ENV check, NETLODGE_TEST_DB check, project-ref confirmation, 10s countdown |
| OPS-004 | Cron reconciliation job runs daily | P2 | None | vercel.json configured; CRON_SECRET required |
| OPS-005 | Health endpoint reports Supabase + config status | P1 | None | /api/health returns JSON with status, config, supabase checks |
| OPS-006 | Separate test Supabase project for integration tests | P2 | None | **NOT YET IMPLEMENTED** — tests blocked by guard |
| OPS-007 | Browser automation (Playwright) for E2E tests | P2 | OPS-006 | **NOT YET IMPLEMENTED** |
| OPS-008 | Error monitoring (Sentry or equivalent) | P2 | None | **NOT YET IMPLEMENTED** |
| OPS-009 | Backup verification procedure documented | P2 | None | **NOT YET IMPLEMENTED** |
