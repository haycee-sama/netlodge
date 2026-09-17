/**
 * Rate-limiting module — Phase 12.
 *
 * Public surface: RateLimiter interface, InMemoryRateLimiter (dev/test),
 * NoopRateLimiter (disabled), assertRateLimit helper.
 */
export {
  InMemoryRateLimiter,
  NoopRateLimiter,
  getRateLimiter,
  setRateLimiter,
  assertRateLimit,
  type RateLimiter,
  type RateLimitResult,
} from "@/server/ratelimit/rate-limiter";
