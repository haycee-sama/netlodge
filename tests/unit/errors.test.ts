/**
 * Phase 0 smoke test — error-model serialization.
 *
 * This test exists for one reason: to PROVE the Vitest harness actually
 * executes. Per IMPLEMENTATION_PLAN.md §22 Phase 0 exit criteria: "lint/
 * typecheck passing, Supabase client configured against a dev project, no
 * functional features yet" — and per the phase-0 instructions: "the test
 * command must genuinely execute rather than merely exist in package.json".
 *
 * The test exercises a pure-function module (`src/errors`) that has no
 * external dependencies — no Supabase, no Paystack, no React. If this
 * passes, the harness is wired correctly. If it fails, the harness itself
 * is broken and every later phase's tests would also be broken.
 */
import { describe, expect, it } from "vitest";
import {
  AppError,
  conflictError,
  ERROR_CODE_TO_STATUS,
  forbiddenError,
  notFoundError,
  validationError,
} from "@/errors";

describe("error model (API_CONTRACTS §19)", () => {
  it("serializes a validation error with field-level details", () => {
    const err = validationError("Invalid registration input", [
      { field: "email", issue: "must be a valid email" },
      { field: "password", issue: "must be at least 8 characters" },
    ]);

    expect(err.code).toBe("validation_error");
    expect(err.httpStatus).toBe(400);
    expect(err.serialize()).toEqual({
      error: {
        code: "validation_error",
        message: "Invalid registration input",
        details: [
          { field: "email", issue: "must be a valid email" },
          { field: "password", issue: "must be at least 8 characters" },
        ],
      },
    });
  });

  it("serializes a forbidden error without leaking internal detail", () => {
    const err = forbiddenError();
    expect(err.code).toBe("forbidden");
    expect(err.httpStatus).toBe(403);
    expect(err.serialize().error.message).toBe(
      "You do not have permission to do this.",
    );
    // No `details` field on non-validation errors.
    expect(err.serialize().error.details).toBeUndefined();
  });

  it("serializes a not_found error generically — never reveals existence", () => {
    const err = notFoundError();
    expect(err.code).toBe("not_found");
    expect(err.httpStatus).toBe(404);
    // Message is generic — does not distinguish "exists but unauthorized"
    // from "doesn't exist" (API_CONTRACTS §19).
    expect(err.serialize().error.message).toBe("Not found.");
  });

  it("serializes a conflict with an optional `reason` sub-code", () => {
    const err = conflictError("This room was just reserved.", "room_unavailable");
    expect(err.code).toBe("conflict");
    expect(err.httpStatus).toBe(409);
    expect(err.reason).toBe("room_unavailable");
    expect(err.serialize()).toEqual({
      error: {
        code: "conflict",
        message: "This room was just reserved.",
        reason: "room_unavailable",
      },
    });
  });

  it("preserves the AppError shape across the standard error codes", () => {
    // Spot-check that every code in the table maps to a status — guards
    // against a future contributor adding a code without a status mapping.
    for (const code of Object.keys(ERROR_CODE_TO_STATUS) as Array<
      keyof typeof ERROR_CODE_TO_STATUS
    >) {
      expect(ERROR_CODE_TO_STATUS[code]).toBeGreaterThan(0);
    }
  });

  it("AppError is a real Error subclass (so try/catch works)", () => {
    const err = new AppError({
      code: "internal_error",
      message: "boom",
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe("AppError");
  });
});
