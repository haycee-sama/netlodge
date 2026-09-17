/**
 * Rate-limiting abstraction — Phase 12.
 *
 * Per API_CONTRACTS.md §22 + IMPLEMENTATION_PLAN.md §18:
 *
 *   Mechanism: edge/middleware-level IP- and account-based limiting
 *   (Vercel/Next.js middleware) plus Supabase Auth's own built-in
 *   protections for login/password-reset — no dedicated rate-limiting
 *   service, consistent with TECHNICAL_ARCHITECTURE.md §30's
 *   "no unnecessary infrastructure" conclusion. Exact thresholds are
 *   a configuration detail, not fixed in this contract document.
 *
 * The list of operations that require rate-limiting per the contract:
 *   - auth.login (brute-force protection — IP + account-based)
 *   - auth.requestPasswordReset (prevent email-bombing)
 *   - verification.submit (general abuse hygiene)
 *   - properties.submit (general abuse hygiene)
 *   - bookings.create (prevent scripted room-hoarding)
 *   - payments.initiate (prevent transaction-creation spam)
 *   - reports.create (prevent flooding the admin queue)
 *   - reviews.create (already bounded by one-review-per-booking — low priority)
 *
 * Architecture:
 *   This module provides a `RateLimiter` interface with two implementations:
 *     1. `InMemoryRateLimiter` — default for dev/test, deterministic unit-testable.
 *        Production caveat: per-instance only (won't share state across
 *        serverless instances). Production should use Vercel's middleware-level
 *        KV/Redis-backed limiter or a vendor-provided solution.
 *     2. `NoopRateLimiter` — explicitly disables rate limiting (used in tests
 *        that need to exercise fast-path logic without triggering limits).
 *
 *   The application uses `assertRateLimit()` at the top of each rate-limited
 *   Server Action. If the limit is exceeded, a `rate_limited` AppError is
 *   thrown (HTTP 429).
 *
 * NOT VERIFIED (per Phase 12 prompt §15):
 *   - Production rate limiting — the InMemoryRateLimiter works per-process
 *     but does NOT share state across serverless instances. Production
 *     enforcement requires Vercel middleware + a shared store (KV/Redis).
 *   - The exact thresholds are configuration values, NOT fixed per the contract.
 */
import "server-only";
import { AppError } from "@/errors";

// ── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Epoch-ms when the limit resets. */
  resetAt: number;
  /** The configured limit (max requests per window). */
  limit: number;
}

export interface RateLimiter {
  /**
   * Check and consume a rate-limit token. MUST be atomic — concurrent
   * calls within the same window MUST each consume a token.
   *
   * @param key — the rate-limit key (e.g., `login:ip:1.2.3.4` or
   *   `bookings:account:uuid`).
   * @param limit — max requests per window.
   * @param windowMs — window size in milliseconds.
   * @returns RateLimitResult — `allowed: false` if the limit is exceeded.
   */
  consume(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult>;
}

// ── InMemoryRateLimiter ─────────────────────────────────────────────────────

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Default dev/test rate limiter. Per-process in-memory token buckets.
 *
 * PRODUCTION CAVEAT:
 *   This implementation does NOT share state across serverless instances.
 *   In production, use Vercel's middleware-level rate limiter (backed by
 *   Vercel KV or Edge Config) or a similar vendor solution. The
 *   `RateLimiter` interface is unchanged — only the implementation swaps.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();

  async consume(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const existing = this.buckets.get(key);

    // If no bucket OR the bucket window has elapsed, create a fresh one.
    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: limit - 1, resetAt, limit };
    }

    // Existing bucket — increment count, check limit.
    if (existing.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.resetAt,
        limit,
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: limit - existing.count,
      resetAt: existing.resetAt,
      limit,
    };
  }

  /**
   * Test-only: reset all buckets. Used between test cases.
   */
  reset(): void {
    this.buckets.clear();
  }
}

// ── NoopRateLimiter ─────────────────────────────────────────────────────────

/**
 * No-op rate limiter — always allows. Used by tests that need to exercise
 * fast-path logic without triggering rate limits, or by environments where
 * rate limiting is handled at the edge (Vercel middleware).
 */
export class NoopRateLimiter implements RateLimiter {
  async consume(
    _key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    return {
      allowed: true,
      remaining: limit,
      resetAt: Date.now() + windowMs,
      limit,
    };
  }
}

// ── Singleton management ──────────────────────────────────────────────────────

let activeLimiter: RateLimiter | null = null;

/**
 * Get the active rate limiter. Defaults to a singleton InMemoryRateLimiter.
 *
 * Production should call `setRateLimiter()` at startup with a
 * Vercel-KV-backed implementation (or similar). The default
 * InMemoryRateLimiter is per-process only — sufficient for dev/test,
 * NOT for production multi-instance deployments.
 */
export function getRateLimiter(): RateLimiter {
  if (!activeLimiter) {
    activeLimiter = new InMemoryRateLimiter();
  }
  return activeLimiter;
}

/**
 * Override the active rate limiter — used in tests and at production startup.
 */
export function setRateLimiter(limiter: RateLimiter | null): void {
  activeLimiter = limiter;
}

// ── assertRateLimit helper ────────────────────────────────────────────────────

/**
 * Check rate limit and throw `rate_limited` (HTTP 429) if exceeded.
 *
 * Used at the top of each rate-limited Server Action.
 *
 * @example
 *   await assertRateLimit("login", `ip:${clientIp}`, 10, 60_000);
 *   // ... continue with login logic ...
 *
 * The `operation` is for logging/observability — the actual rate-limit
 * key is `key` (e.g., `ip:1.2.3.4` or `account:uuid`).
 */
export async function assertRateLimit(
  operation: string,
  key: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const limiter = getRateLimiter();
  const result = await limiter.consume(`${operation}:${key}`, limit, windowMs);

  if (!result.allowed) {
    // Log the rate-limit event for abuse-pattern visibility.
    const { log } = await import("@/server/observability");
    log.warn("authorization", "rate_limited", `Rate limit exceeded: ${operation}`, {
      operation,
      limit,
      windowMs,
      resetAt: new Date(result.resetAt).toISOString(),
    });

    throw new AppError({
      code: "rate_limited",
      message: "Too many requests. Please try again later.",
    });
  }
}
