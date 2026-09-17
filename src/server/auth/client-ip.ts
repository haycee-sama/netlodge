/**
 * Client IP extraction — Phase 12.
 *
 * Reads the client IP from the standard `x-forwarded-for` header (set by
 * Vercel, proxies, and load balancers). Falls back to `x-real-ip` if
 * present. Returns "unknown" if neither header is present (e.g., in
 * tests or local dev without a proxy).
 *
 * Used by rate-limiting Server Actions to derive the IP-based rate-limit
 * key per API_CONTRACTS.md §22.
 */
import "server-only";
import { headers } from "next/headers";

export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    // `x-forwarded-for` can be a comma-separated list (client, proxy1, proxy2).
    // The first entry is the original client IP.
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
