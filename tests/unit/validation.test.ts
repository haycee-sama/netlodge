/**
 * Phase 0 smoke test — Zod validation helpers.
 *
 * Proves the validation foundation imports and behaves correctly. No
 * external dependencies — pure functions.
 */
import { describe, expect, it } from "vitest";
import {
  formatZodError,
  moneyMinorUnitsSchema,
  paginationSchema,
  sortDirectionSchema,
  uuidSchema,
} from "@/validation";

describe("validation foundation", () => {
  it("pagination applies defaults and enforces the page-size ceiling", () => {
    expect(paginationSchema.parse({}).page).toBe(1);
    expect(paginationSchema.parse({}).pageSize).toBe(20);

    // Accepts coerced numeric strings.
    expect(paginationSchema.parse({ page: "3", pageSize: "10" })).toEqual({
      page: 3,
      pageSize: 10,
    });

    // Rejects over-ceiling page sizes — fail fast at the validation boundary
    // rather than silently truncating, so the caller learns the contract.
    expect(() => paginationSchema.parse({ pageSize: 500 })).toThrow();
    expect(() => paginationSchema.parse({ page: 0 })).toThrow();
  });

  it("money is always a POSITIVE integer (kobo, minor units) — Phase 12 finding F-001", () => {
    // ₦50,000 = 5,000,000 kobo
    expect(moneyMinorUnitsSchema.parse(5_000_000)).toBe(5_000_000);
    expect(moneyMinorUnitsSchema.parse("5000000")).toBe(5_000_000);

    // Phase 12 finding F-001: zero is REJECTED — money must be > 0 per PRD §18.
    // The original schema accepted `n >= 0` (non-negative); tightened to `n > 0`
    // to match the documented business rule and the DB-level CHECK constraint
    // `CHECK (price > 0)` in migration 0006.
    expect(() => moneyMinorUnitsSchema.parse(0)).toThrow();

    // Floats are rejected — never a float at any API/payment boundary.
    expect(() => moneyMinorUnitsSchema.parse(5000.5)).toThrow();
    // Negative amounts are rejected.
    expect(() => moneyMinorUnitsSchema.parse(-1)).toThrow();
    // Non-numeric strings are rejected.
    expect(() => moneyMinorUnitsSchema.parse("not-a-number")).toThrow();
  });

  it("UUID schema rejects malformed IDs", () => {
    expect(uuidSchema.parse("00000000-0000-0000-0000-000000000000")).toBe(
      "00000000-0000-0000-0000-000000000000",
    );
    expect(() => uuidSchema.parse("not-a-uuid")).toThrow();
    expect(() => uuidSchema.parse("")).toThrow();
  });

  it("sortDirection is restricted to asc/desc", () => {
    expect(sortDirectionSchema.parse("asc")).toBe("asc");
    expect(sortDirectionSchema.parse("desc")).toBe("desc");
    expect(() => sortDirectionSchema.parse("sideways")).toThrow();
  });

  it("formatZodError produces the standardized `details` shape", () => {
    const result = uuidSchema.safeParse("not-a-uuid");
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(Array.isArray(formatted)).toBe(true);
      expect(formatted[0]).toHaveProperty("field");
      expect(formatted[0]).toHaveProperty("issue");
    } else {
      // Unreachable — `not-a-uuid` is invalid.
      expect.unreachable("uuid schema should have rejected");
    }
  });
});
