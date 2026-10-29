/**
 * Client-side rate limiter for auth flows.
 *
 * Uses localStorage to track attempts per action type. This is a
 * defense-in-depth measure — the primary protection is Supabase Auth's
 * own rate limiting. This prevents a malicious user from spamming
 * signIn/signUp/resetPassword from the browser.
 *
 * Usage:
 *   const { allowed, retryAfter } = checkAuthRateLimit("login");
 *   if (!allowed) { return error("Too many attempts. Try again in Xs.") }
 *   // ... attempt auth ...
 *   recordAuthAttempt("login", success);
 */

const STORAGE_KEY = "netlodge-auth-ratelimit";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000; // 1 minute
const LOCKOUT_MS = 5 * 60_000; // 5 minutes after max attempts

interface RateLimitEntry {
  attempts: number;
  windowStart: number;
  lockedUntil: number;
}

type RateLimitMap = Record<string, RateLimitEntry>;

function readMap(): RateLimitMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMap(map: RateLimitMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage not available — skip
  }
}

export function checkAuthRateLimit(action: string): { allowed: boolean; retryAfter: number } {
  const map = readMap();
  const now = Date.now();
  const entry = map[action] ?? { attempts: 0, windowStart: now, lockedUntil: 0 };

  // Check if currently locked out
  if (entry.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) };
  }

  // Reset window if expired
  if (now - entry.windowStart > WINDOW_MS) {
    entry.attempts = 0;
    entry.windowStart = now;
  }

  return { allowed: entry.attempts < MAX_ATTEMPTS, retryAfter: 0 };
}

export function recordAuthAttempt(action: string, success: boolean): void {
  const map = readMap();
  const now = Date.now();
  const entry = map[action] ?? { attempts: 0, windowStart: now, lockedUntil: 0 };

  // Reset window if expired
  if (now - entry.windowStart > WINDOW_MS) {
    entry.attempts = 0;
    entry.windowStart = now;
  }

  if (success) {
    // Successful attempt resets the counter
    entry.attempts = 0;
    entry.lockedUntil = 0;
  } else {
    entry.attempts += 1;
    if (entry.attempts >= MAX_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_MS;
    }
  }

  map[action] = entry;
  writeMap(map);
}

export function clearAuthRateLimit(action: string): void {
  const map = readMap();
  delete map[action];
  writeMap(map);
}
