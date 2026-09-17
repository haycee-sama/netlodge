/**
 * Phase 2 — auth validation schema tests.
 *
 * Verifies the security-critical property that the registration and
 * profile-update schemas REJECT `role` and `accountStatus` fields
 * explicitly, rather than silently stripping them. Per API_CONTRACTS.md §3:
 * "fails closed, not silently ignored, so a malicious payload is visibly
 * rejected rather than quietly stripped."
 *
 * These tests do NOT touch Supabase Auth or the database — they verify
 * the pure-function Zod schemas in isolation. The actual Supabase Auth
 * integration is tested separately with mocked clients (see
 * `tests/integration/auth-actions.test.ts`).
 */
import { describe, expect, it } from "vitest";
import {
  registerStudentSchema,
  registerLandlordSchema,
  loginSchema,
  requestPasswordResetSchema,
  profileUpdateSchema,
  hasForbiddenProfileField,
  FORBIDDEN_PROFILE_FIELDS,
} from "@/lib/auth/schemas";

// ── registerStudent ─────────────────────────────────────────────────────────

describe("registerStudentSchema", () => {
  const validInput = {
    email: "student@example.com",
    password: "Password123",
    fullName: "Test Student",
    phone: "+2348000000001",
    universityId: "00000000-0000-0000-0000-000000000001",
  };

  it("accepts a valid student registration input", () => {
    const result = registerStudentSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("REJECTS a payload containing `role: 'admin'` (does not silently strip)", () => {
    const malicious = { ...validInput, role: "admin" };
    const result = registerStudentSchema.safeParse(malicious);
    expect(result.success).toBe(false);
    if (!result.success) {
      // The error must mention that `role` is an unrecognized key.
      const issues = result.error.issues.map((i) => i.message);
      expect(
        issues.some((m) => m.toLowerCase().includes("unrecognised") || m.toLowerCase().includes("unrecognized") || m.toLowerCase().includes("invalid")),
      ).toBe(true);
    }
  });

  it("REJECTS a payload containing `accountStatus: 'active'`", () => {
    const malicious = { ...validInput, accountStatus: "active" };
    const result = registerStudentSchema.safeParse(malicious);
    expect(result.success).toBe(false);
  });

  it("REJECTS a payload containing `account_status: 'suspended'` (snake_case form)", () => {
    const malicious = { ...validInput, account_status: "suspended" };
    const result = registerStudentSchema.safeParse(malicious);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerStudentSchema.safeParse({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a weak password (< 8 chars)", () => {
    const result = registerStudentSchema.safeParse({
      ...validInput,
      password: "Ab1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no number", () => {
    const result = registerStudentSchema.safeParse({
      ...validInput,
      password: "PasswordOnly",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no letter", () => {
    const result = registerStudentSchema.safeParse({
      ...validInput,
      password: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid universityId (not a UUID)", () => {
    const result = registerStudentSchema.safeParse({
      ...validInput,
      universityId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing fullName", () => {
    const result = registerStudentSchema.safeParse({
      email: validInput.email,
      password: validInput.password,
      phone: validInput.phone,
      universityId: validInput.universityId,
    });
    expect(result.success).toBe(false);
  });
});

// ── registerLandlord ────────────────────────────────────────────────────────

describe("registerLandlordSchema", () => {
  const validInput = {
    email: "landlord@example.com",
    password: "Password123",
    fullName: "Test Landlord",
    phone: "+2348000000002",
  };

  it("accepts a valid landlord registration input", () => {
    const result = registerLandlordSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("does NOT accept a universityId field (landlords don't belong to a university)", () => {
    const withUniversity = { ...validInput, universityId: "00000000-0000-0000-0000-000000000001" };
    const result = registerLandlordSchema.safeParse(withUniversity);
    expect(result.success).toBe(false);
  });

  it("REJECTS a payload containing `role: 'admin'`", () => {
    const malicious = { ...validInput, role: "admin" };
    const result = registerLandlordSchema.safeParse(malicious);
    expect(result.success).toBe(false);
  });

  it("REJECTS a payload containing `accountStatus: 'active'`", () => {
    const malicious = { ...validInput, accountStatus: "active" };
    const result = registerLandlordSchema.safeParse(malicious);
    expect(result.success).toBe(false);
  });
});

// ── login ───────────────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid email + password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "any-password",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects an extra `role` field (defense in depth)", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "password",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });
});

// ── requestPasswordReset ────────────────────────────────────────────────────

describe("requestPasswordResetSchema", () => {
  it("accepts a valid email", () => {
    const result = requestPasswordResetSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = requestPasswordResetSchema.safeParse({
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

// ── profileUpdate ───────────────────────────────────────────────────────────

describe("profileUpdateSchema", () => {
  it("accepts a partial update with only fullName", () => {
    const result = profileUpdateSchema.safeParse({ fullName: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts a partial update with fullName, phone, and universityId", () => {
    const result = profileUpdateSchema.safeParse({
      fullName: "New Name",
      phone: "+2348000000099",
      universityId: "00000000-0000-0000-0000-000000000001",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a null universityId (landlord clearing the field)", () => {
    const result = profileUpdateSchema.safeParse({
      universityId: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object (no fields to update)", () => {
    const result = profileUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("REJECTS `role: 'admin'` (CRITICAL — must not be silently ignored)", () => {
    const result = profileUpdateSchema.safeParse({ role: "admin" });
    expect(result.success).toBe(false);
  });

  it("REJECTS `accountStatus: 'active'`", () => {
    const result = profileUpdateSchema.safeParse({ accountStatus: "active" });
    expect(result.success).toBe(false);
  });

  it("REJECTS `account_status: 'suspended'` (snake_case form)", () => {
    const result = profileUpdateSchema.safeParse({
      account_status: "suspended",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid universityId (not a UUID)", () => {
    const result = profileUpdateSchema.safeParse({
      universityId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

// ── hasForbiddenProfileField helper ────────────────────────────────────────

describe("hasForbiddenProfileField", () => {
  it("returns true when input contains `role`", () => {
    expect(hasForbiddenProfileField({ role: "admin" })).toBe(true);
  });

  it("returns true when input contains `accountStatus`", () => {
    expect(hasForbiddenProfileField({ accountStatus: "active" })).toBe(true);
  });

  it("returns true when input contains `account_status` (snake_case)", () => {
    expect(hasForbiddenProfileField({ account_status: "suspended" })).toBe(true);
  });

  it("returns false when input contains only allowed fields", () => {
    expect(
      hasForbiddenProfileField({ fullName: "Name", phone: "+234" }),
    ).toBe(false);
  });

  it("returns false for null / non-object input", () => {
    expect(hasForbiddenProfileField(null)).toBe(false);
    expect(hasForbiddenProfileField(undefined)).toBe(false);
    expect(hasForbiddenProfileField("string")).toBe(false);
  });

  it("FORBIDDEN_PROFILE_FIELDS includes role, accountStatus, account_status", () => {
    expect(FORBIDDEN_PROFILE_FIELDS).toContain("role");
    expect(FORBIDDEN_PROFILE_FIELDS).toContain("accountStatus");
    expect(FORBIDDEN_PROFILE_FIELDS).toContain("account_status");
  });
});
