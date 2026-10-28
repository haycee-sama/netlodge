/**
 * Security helpers for API routes.
 *
 * - rateLimit: token bucket per IP+endpoint. Uses Upstash Redis when
 *   configured (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN), falls
 *   back to in-memory for single-instance deployments. Sensitive endpoints
 *   FAIL CLOSED if Redis is configured but unreachable (returns 429).
 *
 * - validateOrigin: checks the Origin header against the allowed origins
 *   for cookie-authenticated mutation requests. This is a CSRF mitigation
 *   (the SameSite=Strict cookie setting provides additional protection).
 *
 * Both helpers are server-only.
 */

import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

interface RateBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, RateBucket>();

interface RateLimitOptions {
  /** Maximum tokens in the bucket (burst capacity). */
  capacity: number;
  /** Tokens added per second (sustained rate). */
  refillPerSecond: number;
  /** If true, fail closed when the distributed store is unreachable. */
  failClosed?: boolean;
}

// Upstash Redis configuration
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_DISTRIBUTED = !!(UPSTASH_URL && UPSTASH_TOKEN);

/**
 * Check whether the request should be allowed under the rate limit.
 * Returns null if allowed, or a NextResponse (429) if rejected.
 *
 * When Upstash Redis is configured, uses a distributed sliding-window
 * counter. When not configured, falls back to in-memory (per-instance).
 *
 * For sensitive endpoints (failClosed=true), if Redis is configured but
 * the request fails, the rate limiter REJECTS the request (429) rather
 * than allowing it through.
 */
export async function rateLimit(
  request: NextRequest,
  scope: string,
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const key = `rl:${ip}:${scope}`;

  // Try distributed rate limiting first
  if (USE_DISTRIBUTED) {
    try {
      const allowed = await distributedRateLimit(key, options);
      if (!allowed) {
        const retryAfter = Math.ceil(1 / options.refillPerSecond);
        return NextResponse.json(
          { error: "Too many requests. Please retry later.", retryAfter },
          { status: 429, headers: { "Retry-After": String(retryAfter) } },
        );
      }
      return null;
    } catch (err) {
      // Redis error — fail closed for sensitive endpoints, fail open for others
      if (options.failClosed) {
        console.error("[rateLimit] Redis error (fail-closed):", err instanceof Error ? err.message : String(err));
        return NextResponse.json(
          { error: "Rate limit service unavailable" },
          { status: 429, headers: { "Retry-After": "60" } },
        );
      }
      // Fall through to in-memory
      console.warn("[rateLimit] Redis error (falling back to in-memory):", err instanceof Error ? err.message : String(err));
    }
  }

  // In-memory rate limiting (per-instance fallback)
  return inMemoryRateLimit(key, options);
}

function inMemoryRateLimit(key: string, options: RateLimitOptions): NextResponse | null {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket) {
    buckets.set(key, { tokens: options.capacity - 1, lastRefill: now });
    return null;
  }

  const elapsedSeconds = (now - bucket.lastRefill) / 1000;
  const refilled = Math.min(options.capacity, bucket.tokens + elapsedSeconds * options.refillPerSecond);

  if (refilled < 1) {
    const retryAfter = Math.ceil((1 - refilled) / options.refillPerSecond);
    return NextResponse.json(
      { error: "Too many requests. Please retry later.", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  buckets.set(key, { tokens: refilled - 1, lastRefill: now });
  return null;
}

/**
 * Distributed rate limiting via Upstash Redis.
 * Uses a sliding-window counter with INCR + EXPIRE.
 */
async function distributedRateLimit(key: string, options: RateLimitOptions): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return true;

  // Use a 1-second window — the counter resets every second
  const windowKey = `${key}:${Math.floor(Date.now() / 1000)}`;

  // Upstash REST API pipeline: each command is an array [CMD, arg1, arg2, ...]
  const pipeline = [
    ["INCR", windowKey],
    ["EXPIRE", windowKey, "2"],
  ];

  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pipeline),
  });

  if (!res.ok) {
    throw new Error(`Upstash returned ${res.status}`);
  }

  const data = await res.json();
  // Pipeline returns array of results — first is the INCR result
  const count = data?.[0]?.result ?? 0;
  return count <= options.capacity;
}

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

// ---------------------------------------------------------------------------
// CSRF / Origin validation
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = (() => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const origins = [siteUrl].filter(Boolean);
  // Allow localhost variants for dev
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000", "http://127.0.0.1:3000");
  }
  // Allow Vercel deployment URLs (production + preview)
  // Vercel assigns *.vercel.app domains for both production and preview
  origins.push("https://netlodge.vercel.app");
  return origins;
})();

/**
 * Check if an origin matches any allowed origin, including Vercel preview
 * domains (*.vercel.app) and same-host matches.
 */
function isOriginAllowed(candidateOrigin: string, requestHost: string | null): boolean {
  // Check explicit allowlist
  for (const allowed of ALLOWED_ORIGINS) {
    try {
      if (new URL(candidateOrigin).origin === new URL(allowed).origin) {
        return true;
      }
    } catch {
      // invalid URL — skip
    }
  }

  // Allow any *.vercel.app origin (preview deployments)
  try {
    const candidateUrl = new URL(candidateOrigin);
    if (candidateUrl.hostname.endsWith(".vercel.app")) {
      return true;
    }
    // Same-host check: if the origin's host matches the request's host,
    // allow it (covers cases where NEXT_PUBLIC_SITE_URL isn't set correctly)
    if (requestHost && candidateUrl.host === requestHost) {
      return true;
    }
  } catch {
    // invalid URL
  }

  return false;
}

/**
 * Validate the Origin header for mutation requests (POST/PUT/PATCH/DELETE).
 *
 * Returns null if the origin is allowed, or a 403 NextResponse if not.
 *
 * This is a CSRF mitigation: browsers send the Origin header on cross-site
 * requests, and we reject any mutation that doesn't come from an allowed
 * origin. Combined with SameSite=Strict cookies, this prevents CSRF attacks.
 *
 * For Bearer-token-authenticated requests (API clients), the origin check
 * is skipped — the Bearer token itself is the CSRF protection (it's not
 * automatically sent by browsers like cookies are).
 */
export function validateOrigin(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  // If a Bearer token is present, the request is API-client-authenticated,
  // not cookie-authenticated. Skip the origin check.
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) return null;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // If no origin/referer at all, block (browsers always send one for mutations)
  if (!origin && !referer) {
    return NextResponse.json(
      { error: "Missing Origin or Referer header" },
      { status: 403 },
    );
  }

  const candidate = origin ?? (referer ? new URL(referer).origin : "");

  if (ALLOWED_ORIGINS.length === 0) {
    // No allowed origins configured — allow same-origin only (compare to Host header)
    const host = request.headers.get("host");
    if (candidate && host) {
      try {
        const candidateUrl = new URL(candidate);
        if (candidateUrl.host === host) return null;
      } catch {
        // invalid URL
      }
    }
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403 },
    );
  }

  // Use the enhanced isOriginAllowed function which checks:
  // 1. Explicit allowlist
  // 2. *.vercel.app domains (preview deployments)
  // 3. Same-host match (origin host === request host)
  const requestHost = request.headers.get("host");
  if (!isOriginAllowed(candidate, requestHost)) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403 },
    );
  }

  return null;
}

/**
 * Combined security check: rate limit + origin validation.
 * Returns null if the request passes, or a NextResponse if it should be rejected.
 *
 * Now async because rateLimit may call Upstash Redis.
 */
export async function securityCheck(
  request: NextRequest,
  scope: string,
  rateLimitOptions: RateLimitOptions,
): Promise<NextResponse | null> {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const rateLimitError = await rateLimit(request, scope, rateLimitOptions);
  if (rateLimitError) return rateLimitError;

  return null;
}
