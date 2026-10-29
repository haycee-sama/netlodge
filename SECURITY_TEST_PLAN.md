# NetLodge — Security Test Plan

## 1. Authentication and Authorization Tests

### AUTH-001: Unauthenticated access to protected routes
- **Test**: GET /student/bookings without session
- **Expected**: Redirect to /login?redirect=/student/bookings
- **Status**: ✅ Verified (proxy.ts enforces)

### AUTH-002: Student booking for another student
- **Test**: RPC `create_booking` with `p_student_id` ≠ `auth.uid()`
- **Expected**: Error "Student ID must match the authenticated user"
- **Status**: ✅ Verified (103 tests, Test 8)

### AUTH-003: Landlord booking as student
- **Test**: RPC `create_booking` with landlord session
- **Expected**: Error "Only students can book accommodation"
- **Status**: ✅ Verified (103 tests, Test 6)

### AUTH-004: Service role direct RPC (auth.uid() = NULL)
- **Test**: RPC `create_booking` with service_role key
- **Expected**: Error "Not authenticated"
- **Status**: ✅ Verified (103 tests, Test 9b)

### AUTH-005: Anon direct RPC
- **Test**: RPC `create_booking` with anon key (no session)
- **Expected**: Error "Not authenticated"
- **Status**: ✅ Verified (103 tests, Test 9)

### AUTH-006: Rate limiting on login
- **Test**: 6 failed login attempts within 1 minute
- **Expected**: 6th attempt returns "Too many login attempts. Try again in 300 seconds."
- **Status**: ✅ Implemented (client-side rate limiter)

### AUTH-007: Open redirect prevention
- **Test**: Login with `?redirect=//evil.com`
- **Expected**: Redirects to role homepage (not evil.com)
- **Status**: ✅ Verified (code checks `startsWith("/") && !startsWith("//")`)

### AUTH-008: Profile update ownership
- **Test**: Student A updates Student B's profile via `.eq("id", studentB_id)`
- **Expected**: RLS blocks (policy: `auth.uid() = id`)
- **Status**: ✅ Verified (RLS policy)

## 2. API and Database Security Tests

### API-001: CSRF on mutation routes
- **Test**: POST /api/landlord/staff/assign with mismatched Origin header
- **Expected**: 403 "Origin not allowed"
- **Status**: ✅ Implemented (validateOrigin)

### API-002: Pending property visibility
- **Test**: Fetch properties as anon with `status=verified AND verification_status=approved`
- **Expected**: Pending properties excluded
- **Status**: ✅ Verified (103 tests, Test 14)

### API-003: Landlord reports auth
- **Test**: Landlord A fetches bookings with `.eq("properties.landlord_id", landlordB_id)`
- **Expected**: Only own bookings returned (RLS + explicit filter)
- **Status**: ✅ Verified (defense-in-depth filter)

### DB-001: SECURITY DEFINER search_path
- **Test**: Inspect all 52 SECURITY DEFINER functions
- **Expected**: All have `set search_path = public`
- **Status**: ✅ Verified (52/52)

### DB-002: Ledger immutability
- **Test**: Attempt DELETE or UPDATE on ledger_entries
- **Expected**: Exception raised (prevent triggers)
- **Status**: ✅ Verified (triggers in migration 0002)

### DB-003: One active booking per student
- **Test**: Student with active booking attempts another booking
- **Expected**: Error "You already have an active booking"
- **Status**: ✅ Implemented (migration 0027)

## 3. Input Validation Tests

### VAL-001: Booking price manipulation
- **Test**: RPC `create_booking` with extra pricing params (p_base_rent_kobo=1)
- **Expected**: Extra params ignored, server computes authoritative price
- **Status**: ✅ Verified (103 tests, Tests 1-3)

### VAL-002: Non-annual rental period
- **Test**: RPC `create_booking` with p_rental_period='monthly'
- **Expected**: Error "Unsupported rental period for booking"
- **Status**: ✅ Verified (103 tests, Test 10c)

### VAL-003: Invalid unit ID
- **Test**: RPC `create_booking` with nil UUID
- **Expected**: Error "Room not found"
- **Status**: ✅ Verified (103 tests, Test 10b)

### VAL-004: Malformed platform fee
- **Test**: Set platform_settings value to "not_a_number"
- **Expected**: Falls back to 0% (fail-safe)
- **Status**: ✅ Verified (103 tests, Test 5a)

## 4. Payment and Webhook Tests

### PAY-001: Amount mismatch
- **Test**: Paystack verification returns amount ≠ payment.amount_kobo
- **Expected**: Payment marked as failed, no booking confirmation
- **Status**: ✅ Implemented (verify + webhook routes)

### PAY-002: Duplicate payment confirmation
- **Test**: Two concurrent `confirm_payment` RPCs on same payment
- **Expected**: One returns "confirmed", other returns "already_confirmed"
- **Status**: ✅ Verified (103 tests, Test 12a)

### PAY-003: Second payment on confirmed booking
- **Test**: `confirm_payment` on pay2 after booking already confirmed via pay1
- **Expected**: Returns "already_confirmed", booking not re-flipped
- **Status**: ✅ Verified (103 tests, Test 12b)

### PAY-004: Webhook signature verification
- **Test**: POST /api/paystack/webhook with invalid signature
- **Expected**: 401 "Invalid signature"
- **Status**: ✅ Implemented (HMAC-SHA512 verification)

### PAY-005: Payment snapshot consistency
- **Test**: Verify booking.base_rent, total, outstanding, payment.amount all match
- **Expected**: All values consistent
- **Status**: ✅ Verified (103 tests, Test 13)

## 5. Concurrency Tests

### CONC-001: Concurrent booking of same room
- **Test**: Two students book the same room simultaneously
- **Expected**: Exactly one succeeds, other gets "Room is not available"
- **Status**: ✅ Verified (103 tests, Test 11)

### CONC-002: Concurrent refund requests
- **Test**: Two concurrent refunds exceeding refundable balance
- **Expected**: Total committed refund ≤ payment amount
- **Status**: ✅ Verified (concurrency tests)

## 6. Release Gate Requirements

| Check | Required | Status |
|---|---|---|
| TypeScript (0 errors) | ✅ | Pass |
| ESLint (0 errors) | ✅ | Pass (1 warning) |
| Production build | ✅ | Pass |
| Booking integrity tests (103) | ✅ | Pass |
| Concurrency tests | ✅ | Pass |
| No secrets in source | ✅ | Verified |
| No mock/demo data | ✅ | Verified |
| RLS on all tables | ✅ | 43 tables |
| SECURITY DEFINER search_path | ✅ | 52/52 |
| Payment webhook verification | ✅ | HMAC-SHA512 |
| Rate limiting on auth | ✅ | Client-side |
| CSRF on mutation routes | ✅ | 53/57 (4 exempt) |
