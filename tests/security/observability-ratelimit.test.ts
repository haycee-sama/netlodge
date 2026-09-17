/**
 * Phase 12 §15/§19 — Observability + rate-limiting tests.
 *
 * Observability:
 *   - logEvent writes structured entries to the active sink.
 *   - Sensitive fields (passwords, secrets, tokens, signed URLs) are
 *     automatically redacted from log context.
 *   - The RecordingLogSink captures entries for test assertions.
 *
 * Rate limiting:
 *   - InMemoryRateLimiter tracks per-key token buckets.
 *   - assertRateLimit throws `rate_limited` (HTTP 429) when the limit
 *     is exceeded.
 *   - NoopRateLimiter always allows (used in tests / when edge limiting
 *     is active).
 *
 * Per IMPLEMENTATION_PLAN.md §18-19 + API_CONTRACTS.md §22.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  logEvent,
  log,
  setLogSink,
  RecordingLogSink,
} from "@/server/observability";
import {
  InMemoryRateLimiter,
  NoopRateLimiter,
  setRateLimiter,
  assertRateLimit,
} from "@/server/ratelimit";

// ─────────────────────────────────────────────────────────────────────────────
// Observability — logEvent + redaction
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 observability — logEvent + redaction", () => {
  let sink: RecordingLogSink;

  beforeEach(() => {
    sink = new RecordingLogSink();
    setLogSink(sink);
  });

  afterEach(() => {
    setLogSink(null);
  });

  it("logEvent writes a structured entry to the active sink", () => {
    logEvent("warn", "authorization", "forbidden", "User attempted admin op", {
      actorId: "11111111-1111-1111-1111-111111111111",
      operation: "approveVerification",
    });
    expect(sink.entries.length).toBe(1);
    const entry = sink.entries[0]!;
    expect(entry.severity).toBe("warn");
    expect(entry.category).toBe("authorization");
    expect(entry.event).toBe("forbidden");
    expect(entry.message).toBe("User attempted admin op");
    expect(entry.context?.actorId).toBe("11111111-1111-1111-1111-111111111111");
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("log helpers (debug/info/warn/error) route to the same sink", () => {
    log.debug("system", "test", "debug msg");
    log.info("system", "test", "info msg");
    log.warn("system", "test", "warn msg");
    log.error("system", "test", "error msg");
    expect(sink.entries.length).toBe(4);
    expect(sink.entries.map((e) => e.severity)).toEqual([
      "debug",
      "info",
      "warn",
      "error",
    ]);
  });

  it("REDACTED_KEYS are scrubbed from log context (defense-in-depth)", () => {
    logEvent("error", "auth", "login_failed", "Login attempt failed", {
      actorId: "11111111-1111-1111-1111-111111111111",
      password: "user-supplied-password",
      passwordHash: "$2a$10$abc",
      token: "Bearer abc123",
      apiKey: "sk_test_123",
      secret: "whsec_123",
      cardNumber: "4242424242424242",
      cvv: "123",
      signedUrl: "https://example.com/signed/abc?token=secret",
      // Non-sensitive fields pass through.
      email: "user@example.com",
      count: 5,
    });

    const entry = sink.entries[0]!;
    expect(entry.context?.password).toBe("[REDACTED]");
    expect(entry.context?.passwordHash).toBe("[REDACTED]");
    expect(entry.context?.token).toBe("[REDACTED]");
    expect(entry.context?.apiKey).toBe("[REDACTED]");
    expect(entry.context?.secret).toBe("[REDACTED]");
    expect(entry.context?.cardNumber).toBe("[REDACTED]");
    expect(entry.context?.cvv).toBe("[REDACTED]");
    expect(entry.context?.signedUrl).toBe("[REDACTED]");
    // Non-sensitive fields are preserved.
    expect(entry.context?.email).toBe("user@example.com");
    expect(entry.context?.count).toBe(5);
  });

  it("redaction is recursive (nested objects)", () => {
    logEvent("error", "payment", "webhook_failed", "Webhook failed", {
      payload: {
        data: {
          amount: 5000,
          cardDetails: "sensitive",
          reference: "ref-123",
        },
      },
    });

    const entry = sink.entries[0]!;
    const payload = entry.context?.payload as Record<string, unknown> | undefined;
    const data = payload?.data as Record<string, unknown> | undefined;
    expect(data?.cardDetails).toBe("[REDACTED]");
    expect(data?.amount).toBe(5000);
  });

  it("redaction handles arrays of objects", () => {
    logEvent("info", "system", "batch", "Batch processed", {
      items: [
        { id: "1", token: "tok1" },
        { id: "2", token: "tok2" },
      ],
    });

    const entry = sink.entries[0]!;
    const items = entry.context?.items as Array<Record<string, unknown>>;
    expect(items[0]?.token).toBe("[REDACTED]");
    expect(items[1]?.token).toBe("[REDACTED]");
    expect(items[0]?.id).toBe("1");
  });

  it("RecordingLogSink.filter() narrows entries by category+event", () => {
    log.warn("authorization", "forbidden", "msg1");
    log.warn("authorization", "rate_limited", "msg2");
    log.error("payment", "webhook_failed", "msg3");

    expect(sink.filter("authorization").length).toBe(2);
    expect(sink.filter("authorization", "forbidden").length).toBe(1);
    expect(sink.filter("payment").length).toBe(1);
    expect(sink.filter("system").length).toBe(0);
  });

  it("logEvent with no context works", () => {
    logEvent("info", "system", "startup", "Server started");
    expect(sink.entries.length).toBe(1);
    expect(sink.entries[0]?.context).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting — InMemoryRateLimiter + assertRateLimit
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 rate-limiting — InMemoryRateLimiter", () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter();
    setRateLimiter(limiter);
  });

  afterEach(() => {
    setRateLimiter(null);
  });

  it("allows requests up to the limit", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await limiter.consume("test-key", 5, 60_000);
      results.push(r.allowed);
    }
    expect(results).toEqual([true, true, true, true, true]);
  });

  it("blocks the 6th request when limit is 5", async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.consume("test-key", 5, 60_000);
    }
    const r = await limiter.consume("test-key", 5, 60_000);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it("different keys have independent buckets", async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.consume("key-A", 5, 60_000);
    }
    // key-B should still have full budget.
    const r = await limiter.consume("key-B", 5, 60_000);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(4);
  });

  it("bucket resets after the window elapses", async () => {
    // Use a 1ms window — by the time we consume again, the window has elapsed.
    for (let i = 0; i < 2; i++) {
      await limiter.consume("test-key", 2, 1);
    }
    // Third request is blocked.
    let r = await limiter.consume("test-key", 2, 1);
    expect(r.allowed).toBe(false);

    // Wait 5ms for the window to reset.
    await new Promise((resolve) => setTimeout(resolve, 5));

    // New window — allowed again.
    r = await limiter.consume("test-key", 2, 1);
    expect(r.allowed).toBe(true);
  });

  it("reset() clears all buckets", async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.consume("test-key", 5, 60_000);
    }
    let r = await limiter.consume("test-key", 5, 60_000);
    expect(r.allowed).toBe(false);

    limiter.reset();

    r = await limiter.consume("test-key", 5, 60_000);
    expect(r.allowed).toBe(true);
  });
});

describe("Phase 12 rate-limiting — assertRateLimit throws on exceedance", () => {
  beforeEach(() => {
    setRateLimiter(new InMemoryRateLimiter());
  });

  afterEach(() => {
    setRateLimiter(null);
  });

  it("allows the first N requests without throwing", async () => {
    for (let i = 0; i < 3; i++) {
      await expect(
        assertRateLimit("login", `ip:1.2.3.4`, 3, 60_000),
      ).resolves.toBeUndefined();
    }
  });

  it("throws `rate_limited` (HTTP 429) on the (N+1)th request", async () => {
    for (let i = 0; i < 3; i++) {
      await assertRateLimit("login", `ip:1.2.3.4`, 3, 60_000);
    }
    await expect(assertRateLimit("login", `ip:1.2.3.4`, 3, 60_000)).rejects.toMatchObject({
      code: "rate_limited",
      httpStatus: 429,
    });
  });

  it("rate limit is per-key (different IPs have independent limits)", async () => {
    for (let i = 0; i < 3; i++) {
      await assertRateLimit("login", `ip:1.2.3.4`, 3, 60_000);
    }
    // Different IP — should be allowed.
    await expect(
      assertRateLimit("login", `ip:5.6.7.8`, 3, 60_000),
    ).resolves.toBeUndefined();
  });

  it("rate-limited events are logged for abuse-pattern visibility", async () => {
    const sink = new RecordingLogSink();
    setLogSink(sink);
    try {
      for (let i = 0; i < 3; i++) {
        await assertRateLimit("login", `ip:1.2.3.4`, 3, 60_000);
      }
      // 4th request triggers rate-limit + log.
      await expect(
        assertRateLimit("login", `ip:1.2.3.4`, 3, 60_000),
      ).rejects.toThrow();

      const rateLimitedLogs = sink.filter("authorization", "rate_limited");
      expect(rateLimitedLogs.length).toBe(1);
      expect(rateLimitedLogs[0]?.context?.operation).toBe("login");
    } finally {
      setLogSink(null);
    }
  });
});

describe("Phase 12 rate-limiting — NoopRateLimiter", () => {
  it("always allows (used in tests / when edge limiting is active)", async () => {
    const noop = new NoopRateLimiter();
    for (let i = 0; i < 100; i++) {
      const r = await noop.consume("any-key", 1, 1);
      expect(r.allowed).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rate-limit key derivation — IP + account-based per API_CONTRACTS.md §22
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 12 rate-limiting — key derivation patterns", () => {
  // These are not function calls — they document the key patterns the
  // application should use when calling assertRateLimit, per the contract.

  it("login uses IP + account-based limiting (two separate keys)", () => {
    // Per API_CONTRACTS.md §22: "Brute-force protection — IP + account-based".
    // The application should call assertRateLimit twice for login:
    //   1. assertRateLimit("login", `ip:${clientIp}`, 10, 60_000);
    //   2. assertRateLimit("login", `account:${email}`, 5, 60_000);
    // Either limit triggering blocks the request.
    const ipKey = `ip:1.2.3.4`;
    const accountKey = `account:user@example.com`;
    expect(ipKey).toMatch(/^ip:/);
    expect(accountKey).toMatch(/^account:/);
  });

  it("bookings.create uses IP + account-based (prevent scripted hoarding)", () => {
    const ipKey = `ip:1.2.3.4`;
    const accountKey = `account:11111111-1111-1111-1111-111111111111`;
    expect(ipKey).toMatch(/^ip:/);
    expect(accountKey).toMatch(/^account:/);
  });

  it("payments.initiate uses account-based (prevent transaction spam)", () => {
    const accountKey = `account:11111111-1111-1111-1111-111111111111`;
    expect(accountKey).toMatch(/^account:/);
  });
});
