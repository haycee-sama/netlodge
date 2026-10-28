/**
 * Server-side caching utilities for public pages.
 *
 * Uses Next.js unstable_cache for caching database query results that are:
 * - Public (no user-specific data)
 * - Infrequently changing (universities, verified properties)
 * - Read-heavy (homepage, property listings)
 *
 * Private/user-specific data is NEVER cached.
 */

import { unstable_cache, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Fetch all active universities — cached for 1 hour.
 */
export const getCachedUniversities = unstable_cache(
  async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("universities")
      .select("id, name, short_name, slug, city, state, description")
      .eq("active", true)
      .order("name");
    if (error) return [];
    return data;
  },
  ["public-universities"],
  { revalidate: 3600, tags: ["universities"] }
);

/**
 * Fetch verified properties for the homepage — cached for 5 minutes.
 */
export const getCachedFeaturedProperties = unstable_cache(
  async (limit: number = 6) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("properties")
      .select("id, slug, name, type, status, verification_status, city, state, public_address_line, price_from_kobo, total_units, available_units, description, university_id, neighbourhood_id")
      .eq("status", "verified")
      .eq("verification_status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return data;
  },
  ["public-featured-properties"],
  { revalidate: 300, tags: ["properties"] }
);

/**
 * Fetch neighbourhoods — cached for 1 hour.
 */
export const getCachedNeighbourhoods = unstable_cache(
  async (universityId?: string) => {
    const supabase = await createClient();
    let query = supabase
      .from("neighbourhoods")
      .select("id, name, slug, average_annual_rent_kobo, walking_minutes_to_campus, city, state")
      .eq("active", true);
    if (universityId) query = query.eq("university_id", universityId);
    const { data, error } = await query.order("name");
    if (error) return [];
    return data;
  },
  ["public-neighbourhoods"],
  { revalidate: 3600, tags: ["neighbourhoods"] }
);

/**
 * Revalidate property cache after a mutation.
 * Next.js 16 requires a cache-life profile as the second arg to revalidateTag.
 */
export function revalidatePropertyCache() {
  revalidateTag("properties", "default");
}

export function revalidateUniversityCache() {
  revalidateTag("universities", "default");
  revalidateTag("neighbourhoods", "default");
}
