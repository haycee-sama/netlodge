/**
 * Phase 12 §6 — Input validation attack tests.
 *
 * Verifies that every public Server Action / API entry point rejects
 * malformed input at the schema layer. Tests attack with:
 *   - unknown fields (must be rejected by .strict())
 *   - wrong types
 *   - null / empty / whitespace
 *   - very long strings
 *   - negative numbers / zero / NaN / Infinity
 *   - invalid UUIDs
 *   - unknown enum values
 *   - SQL-like / HTML/script payloads (must be passed through, not interpreted)
 *
 * Per IMPLEMENTATION_PLAN.md §18: "every accepted field has a defined
 * shape/constraint, no 'accept anything' fields."
 */
import { describe, it, expect } from "vitest";
import {
  createBookingSchema,
  cancelBookingSchema,
  listOwnBookingsSchema,
} from "@/lib/bookings/schemas";
import {
  createReviewSchema,
  hideReviewSchema,
} from "@/lib/reviews/schemas";
import {
  createReportSchema,
  resolveReportSchema,
} from "@/lib/reports/schemas";
import {
  initiatePaymentSchema,
  paystackWebhookPayloadSchema,
} from "@/lib/payments/schemas";
import {
  registerStudentSchema,
  loginSchema,
} from "@/lib/auth/schemas";
import {
  approvePropertySchema,
  rejectPropertySchema,
  createPropertySchema,
  createRoomSchema,
} from "@/lib/properties/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Auth schemas — strict mode + shape validation
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 input-validation — auth schemas", () => {
  it("registerStudentSchema rejects unknown fields (strict)", () => {
    const r = registerStudentSchema.safeParse({
      fullName: "Test User",
      phone: "+1234567890",
      universityId: "00000000-0000-0000-0000-000000000001",
      email: "test@example.com",
      password: "password123",
      role: "admin", // ← forged role, must be rejected
    });
    expect(r.success).toBe(false);
  });

  it("registerStudentSchema rejects empty fullName", () => {
    const r = registerStudentSchema.safeParse({
      fullName: "   ",
      phone: "+1234567890",
      universityId: "00000000-0000-0000-0000-000000000001",
      email: "test@example.com",
      password: "password123",
    });
    expect(r.success).toBe(false);
  });

  it("registerStudentSchema rejects invalid email", () => {
    const r = registerStudentSchema.safeParse({
      fullName: "Test",
      phone: "+1234567890",
      universityId: "00000000-0000-0000-0000-000000000001",
      email: "not-an-email",
      password: "password123",
    });
    expect(r.success).toBe(false);
  });

  it("registerStudentSchema rejects short password", () => {
    const r = registerStudentSchema.safeParse({
      fullName: "Test",
      phone: "+1234567890",
      universityId: "00000000-0000-0000-0000-000000000001",
      email: "test@example.com",
      password: "short",
    });
    expect(r.success).toBe(false);
  });

  it("loginSchema rejects unknown fields (strict)", () => {
    const r = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      role: "admin", // ← forged role
    });
    expect(r.success).toBe(false);
  });

  it("loginSchema rejects null email", () => {
    const r = loginSchema.safeParse({
      email: null,
      password: "password123",
    });
    expect(r.success).toBe(false);
  });

  it("loginSchema accepts SQL-like email string IF it's RFC-valid (passed to Supabase Auth via parameterized query)", () => {
    // The string `'; DROP TABLE users; --@example.com` is NOT a syntactically
    // valid email per RFC (the local-part can't contain semicolons unquoted).
    // Zod's .email() rejects it. This is correct behavior — invalid input
    // should be rejected at the schema layer.
    //
    // A genuinely RFC-valid SQL-injection-attempting email like
    // `"'; DROP TABLE users; --"@example.com` (with quoted local-part) WOULD
    // be accepted by Zod, then passed to Supabase Auth via parameterized
    // query — no SQL injection possible. We don't test that variant because
    // Zod's .email() validation is the contract; the SQL-injection defense
    // is at the database driver layer (parameterized queries), not here.
    const r = loginSchema.safeParse({
      email: "'; DROP TABLE users; --@example.com",
      password: "password123",
    });
    // Schema correctly rejects the malformed email.
    expect(r.success).toBe(false);
  });

  it("loginSchema accepts HTML/script payload in password (not interpreted)", () => {
    const r = loginSchema.safeParse({
      email: "test@example.com",
      password: '<script>alert("xss")</script>',
    });
    expect(r.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Booking schemas — strict mode + shape validation
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 input-validation — booking schemas", () => {
  it("createBookingSchema rejects unknown fields (strict)", () => {
    const r = createBookingSchema.safeParse({
      roomId: "00000000-0000-0000-0000-000000000001",
      status: "confirmed", // ← forged status
      studentId: "00000000-0000-0000-0000-000000000002", // ← forged identity
    });
    expect(r.success).toBe(false);
  });

  it("createBookingSchema rejects invalid UUID", () => {
    const r = createBookingSchema.safeParse({ roomId: "not-a-uuid" });
    expect(r.success).toBe(false);
  });

  it("createBookingSchema rejects null roomId", () => {
    const r = createBookingSchema.safeParse({ roomId: null });
    expect(r.success).toBe(false);
  });

  it("cancelBookingSchema rejects unknown fields (strict)", () => {
    const r = cancelBookingSchema.safeParse({
      bookingId: "00000000-0000-0000-0000-000000000001",
      reason: "test",
      status: "cancelled", // ← forged status
    });
    expect(r.success).toBe(false);
  });

  it("listOwnBookingsSchema rejects oversized pageSize", () => {
    const r = listOwnBookingsSchema.safeParse({
      page: 1,
      pageSize: 10000, // ← exceeds max=100
    });
    expect(r.success).toBe(false);
  });

  it("listOwnBookingsSchema rejects negative page", () => {
    const r = listOwnBookingsSchema.safeParse({
      page: -1,
      pageSize: 20,
    });
    expect(r.success).toBe(false);
  });

  it("listOwnBookingsSchema rejects zero page", () => {
    const r = listOwnBookingsSchema.safeParse({
      page: 0,
      pageSize: 20,
    });
    expect(r.success).toBe(false);
  });

  it("listOwnBookingsSchema rejects unknown status value", () => {
    const r = listOwnBookingsSchema.safeParse({
      status: "fake_status",
    });
    expect(r.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Review schemas — strict mode + rating range
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 input-validation — review schemas", () => {
  it("createReviewSchema rejects unknown fields (strict)", () => {
    const r = createReviewSchema.safeParse({
      bookingId: "00000000-0000-0000-0000-000000000001",
      rating: 5,
      content: "Good stay",
      studentId: "00000000-0000-0000-0000-000000000002", // ← forged
      is_hidden: true, // ← forged moderation flag
    });
    expect(r.success).toBe(false);
  });

  it("createReviewSchema rejects rating < 1", () => {
    const r = createReviewSchema.safeParse({
      bookingId: "00000000-0000-0000-0000-000000000001",
      rating: 0,
      content: "bad",
    });
    expect(r.success).toBe(false);
  });

  it("createReviewSchema rejects rating > 5", () => {
    const r = createReviewSchema.safeParse({
      bookingId: "00000000-0000-0000-0000-000000000001",
      rating: 6,
      content: "great",
    });
    expect(r.success).toBe(false);
  });

  it("createReviewSchema rejects non-integer rating", () => {
    const r = createReviewSchema.safeParse({
      bookingId: "00000000-0000-0000-0000-000000000001",
      rating: 3.5,
      content: "ok",
    });
    expect(r.success).toBe(false);
  });

  it("createReviewSchema rejects empty content (after trim)", () => {
    const r = createReviewSchema.safeParse({
      bookingId: "00000000-0000-0000-0000-000000000001",
      rating: 4,
      content: "   ",
    });
    expect(r.success).toBe(false);
  });

  it("createReviewSchema rejects content > 5000 chars", () => {
    const r = createReviewSchema.safeParse({
      bookingId: "00000000-0000-0000-0000-000000000001",
      rating: 4,
      content: "x".repeat(5001),
    });
    expect(r.success).toBe(false);
  });

  it("createReviewSchema accepts HTML/script payload in content (not interpreted)", () => {
    const r = createReviewSchema.safeParse({
      bookingId: "00000000-0000-0000-0000-000000000001",
      rating: 4,
      content: '<script>alert("xss")</script>',
    });
    expect(r.success).toBe(true);
  });

  it("hideReviewSchema rejects empty reason (after trim)", () => {
    const r = hideReviewSchema.safeParse({
      reviewId: "00000000-0000-0000-0000-000000000001",
      reason: "   ",
    });
    expect(r.success).toBe(false);
  });

  it("hideReviewSchema rejects reason > 2000 chars", () => {
    const r = hideReviewSchema.safeParse({
      reviewId: "00000000-0000-0000-0000-000000000001",
      reason: "x".repeat(2001),
    });
    expect(r.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Report schemas — closed enum + target validation
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 input-validation — report schemas", () => {
  it("createReportSchema rejects unknown targetType (closed enum)", () => {
    const r = createReportSchema.safeParse({
      targetType: "fake_target",
      targetId: "00000000-0000-0000-0000-000000000001",
      reasonCategory: "spam",
    });
    expect(r.success).toBe(false);
  });

  it("createReportSchema rejects unknown fields (strict)", () => {
    const r = createReportSchema.safeParse({
      targetType: "property",
      targetId: "00000000-0000-0000-0000-000000000001",
      reasonCategory: "spam",
      reporterId: "00000000-0000-0000-0000-000000000002", // ← forged
      status: "resolved", // ← forged
    });
    expect(r.success).toBe(false);
  });

  it("createReportSchema rejects invalid UUID targetId", () => {
    const r = createReportSchema.safeParse({
      targetType: "property",
      targetId: "not-a-uuid",
      reasonCategory: "spam",
    });
    expect(r.success).toBe(false);
  });

  it("createReportSchema rejects empty reasonCategory", () => {
    const r = createReportSchema.safeParse({
      targetType: "property",
      targetId: "00000000-0000-0000-0000-000000000001",
      reasonCategory: "   ",
    });
    expect(r.success).toBe(false);
  });

  it("createReportSchema rejects reasonCategory > 100 chars", () => {
    const r = createReportSchema.safeParse({
      targetType: "property",
      targetId: "00000000-0000-0000-0000-000000000001",
      reasonCategory: "x".repeat(101),
    });
    expect(r.success).toBe(false);
  });

  it("createReportSchema rejects description > 5000 chars", () => {
    const r = createReportSchema.safeParse({
      targetType: "property",
      targetId: "00000000-0000-0000-0000-000000000001",
      reasonCategory: "spam",
      description: "x".repeat(5001),
    });
    expect(r.success).toBe(false);
  });

  it("resolveReportSchema rejects unknown outcome", () => {
    const r = resolveReportSchema.safeParse({
      reportId: "00000000-0000-0000-0000-000000000001",
      resolutionNotes: "done",
      outcome: "fake_outcome",
    });
    expect(r.success).toBe(false);
  });

  it("resolveReportSchema rejects empty resolutionNotes", () => {
    const r = resolveReportSchema.safeParse({
      reportId: "00000000-0000-0000-0000-000000000001",
      resolutionNotes: "   ",
      outcome: "action_taken",
    });
    expect(r.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Payment schemas — strict mode + amount rejection
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 input-validation — payment schemas", () => {
  it("initiatePaymentSchema rejects unknown fields (strict)", () => {
    const r = initiatePaymentSchema.safeParse({
      bookingId: "00000000-0000-0000-0000-000000000001",
      amount: 5000, // ← forged amount — must be rejected
      currency: "NGN", // ← forged currency
      paystackReference: "forged-ref", // ← forged reference
    });
    expect(r.success).toBe(false);
  });

  it("initiatePaymentSchema rejects null bookingId", () => {
    const r = initiatePaymentSchema.safeParse({ bookingId: null });
    expect(r.success).toBe(false);
  });

  it("paystackWebhookPayloadSchema accepts valid payload shape", () => {
    const r = paystackWebhookPayloadSchema.safeParse({
      event: "charge.success",
      data: {
        id: 12345,
        domain: "test",
        status: "success",
        reference: "ref-test",
        amount: 500000,
        currency: "NGN",
        paid_at: "2024-01-01T00:00:00.000Z",
        created_at: "2024-01-01T00:00:00.000Z",
        channel: "card",
        gateway_response: "Approved",
      },
    });
    expect(r.success).toBe(true);
  });

  it("paystackWebhookPayloadSchema rejects missing required data.reference", () => {
    const r = paystackWebhookPayloadSchema.safeParse({
      event: "charge.success",
      data: {
        id: 12345,
        domain: "test",
        status: "success",
        // reference missing
        amount: 500000,
        currency: "NGN",
        created_at: "2024-01-01T00:00:00.000Z",
      },
    });
    expect(r.success).toBe(false);
  });

  it("paystackWebhookPayloadSchema rejects negative amount (Phase 12 finding F-002)", () => {
    // FINDING F-002: paystackWebhookPayloadSchema used `z.number()` for
    // `amount`, which accepts negative, NaN, and Infinity. A malicious
    // Paystack-impersonating webhook (after signature bypass) could
    // submit a negative amount that bypasses the amount-comparison
    // check in processWebhookCore. Phase 12 tightened to `z.number().int().positive()`.
    const r = paystackWebhookPayloadSchema.safeParse({
      event: "charge.success",
      data: {
        id: 12345,
        domain: "test",
        status: "success",
        reference: "ref-test",
        amount: -500000, // ← invalid
        currency: "NGN",
        created_at: "2024-01-01T00:00:00.000Z",
      },
    });
    expect(r.success).toBe(false);
  });

  it("paystackWebhookPayloadSchema rejects NaN amount (Phase 12 finding F-002)", () => {
    const r = paystackWebhookPayloadSchema.safeParse({
      event: "charge.success",
      data: {
        id: 12345,
        domain: "test",
        status: "success",
        reference: "ref-test",
        amount: NaN,
        currency: "NGN",
        created_at: "2024-01-01T00:00:00.000Z",
      },
    });
    expect(r.success).toBe(false);
  });

  it("paystackWebhookPayloadSchema rejects Infinity amount (Phase 12 finding F-002)", () => {
    // FINDING F-002 (same fix): Infinity passed z.number() validation,
    // but `Infinity === expectedAmountKobo` would always be false,
    // causing the webhook to be routed to 'verification_failed'.
    // While not directly exploitable (signature verification first),
    // defense-in-depth says reject malformed input at the schema layer.
    const r = paystackWebhookPayloadSchema.safeParse({
      event: "charge.success",
      data: {
        id: 12345,
        domain: "test",
        status: "success",
        reference: "ref-test",
        amount: Infinity,
        currency: "NGN",
        created_at: "2024-01-01T00:00:00.000Z",
      },
    });
    expect(r.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property schemas — strict mode + price validation
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 input-validation — property schemas", () => {
  it("createPropertySchema rejects unknown fields (strict)", () => {
    const r = createPropertySchema.safeParse({
      universityId: "00000000-0000-0000-0000-000000000001",
      area: "Test Area",
      address: "123 Main St",
      description: "Test",
      landlordId: "00000000-0000-0000-0000-000000000002", // ← forged
      status: "approved", // ← forged
    });
    expect(r.success).toBe(false);
  });

  it("createRoomSchema rejects negative price", () => {
    const r = createRoomSchema.safeParse({
      propertyId: "00000000-0000-0000-0000-000000000001",
      roomType: "single",
      price: -100,
      occupancy: 1,
      amenities: [],
    });
    expect(r.success).toBe(false);
  });

  it("createRoomSchema rejects zero price (must be > 0 per PRD §18)", () => {
    // FINDING F-001: moneyMinorUnitsSchema in src/validation/index.ts
    // allowed `n >= 0` (non-negative), but PRD §18 requires `price > 0`.
    // Zero-price rooms violate the documented business rule and would
    // produce nonsensical free bookings. Fixed in Phase 12 by tightening
    // the schema to `n > 0`.
    const r = createRoomSchema.safeParse({
      propertyId: "00000000-0000-0000-0000-000000000001",
      roomType: "single",
      price: 0,
      occupancy: 1,
      amenities: [],
    });
    expect(r.success).toBe(false);
  });

  it("createRoomSchema rejects zero occupancy", () => {
    const r = createRoomSchema.safeParse({
      propertyId: "00000000-0000-0000-0000-000000000001",
      roomType: "single",
      price: 5000,
      occupancy: 0,
      amenities: [],
    });
    expect(r.success).toBe(false);
  });

  it("approvePropertySchema rejects unknown fields (strict)", () => {
    const r = approvePropertySchema.safeParse({
      propertyId: "00000000-0000-0000-0000-000000000001",
      status: "approved", // ← forged status
    });
    expect(r.success).toBe(false);
  });

  it("rejectPropertySchema rejects empty reason", () => {
    const r = rejectPropertySchema.safeParse({
      propertyId: "00000000-0000-0000-0000-000000000001",
      reason: "   ",
    });
    expect(r.success).toBe(false);
  });
});
