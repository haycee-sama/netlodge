/**
 * Client-side cache invalidation helper.
 * Calls the secure /api/admin/cache-invalidate endpoint.
 * Only allowed tags are accepted by the server.
 */
export async function invalidateCache(tags: string[]): Promise<void> {
  try {
    await fetch("/api/admin/cache-invalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tags }),
    });
  } catch {
    // Non-fatal — cache will eventually expire by revalidation timeout
  }
}

export const CACHE_TAGS = {
  PROPERTIES: "properties",
  UNIVERSITIES: "universities",
  NEIGHBOURHOODS: "neighbourhoods",
  UNITS: "units",
} as const;
