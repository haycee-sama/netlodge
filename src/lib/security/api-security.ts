/**
 * Security helpers for API routes.
 *
 * - rateLimit: simple in-memory token bucket per IP+endpoint.
 *   NOTE: This is per-instance only. In a multi-instance deployment (Vercel,
 *   Cloud Run, etc.) you need a shared store (Redis, Upstash, etc.) for
 *   true distributed rate limiting. This implementation is a fail-safe
 *   baseline that protects a single instance and degrades gracefully.
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
}

/**
 * Check whether the request should be allowed under the rate limit.
 * Returns null if allowed, or a NextResponse (429) if rejected.
 *
 * The key is derived from the client IP + a scope (usually the route path).
 * Behind a proxy/load balancer, the X-Forwarded-For header is trusted.
 */
export function rateLimit(
  request: NextRequest,
  scope: string,
  options: RateLimitOptions,
): NextResponse | null {
  const ip = getClientIp(request);
  const key = `${ip}:${scope}`;

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket) {
    buckets.set(key, { tokens: options.capacity - 1, lastRefill: now });
    return null;
  }

  // Refill tokens based on elapsed time
  const elapsedSeconds = (now - bucket.lastRefill) / 1000;
  const refilled = Math.min(options.capacity, bucket.tokens + elapsedSeconds * options.refillPerSecond);

  if (refilled < 1) {
    // Rate limited
    const retryAfter = Math.ceil((1 - refilled) / options.refillPerSecond);
    return NextResponse.json(
      { error: "Too many requests. Please retry later.", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  buckets.set(key, { tokens: refilled - 1, lastRefill: now });
  return null;
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
  return origins;
})();

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

  const allowed = ALLOWED_ORIGINS.some((allowedOrigin) => {
    try {
      return new URL(candidate).origin === new URL(allowedOrigin).origin;
    } catch {
      return false;
    }
  });

  if (!allowed) {
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
 */
export function securityCheck(
  request: NextRequest,
  scope: string,
  rateLimitOptions: RateLimitOptions,
): NextResponse | null {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const rateLimitError = rateLimit(request, scope, rateLimitOptions);
  if (rateLimitError) return rateLimitError;

  return null;
}
