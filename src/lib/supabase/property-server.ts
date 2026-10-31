/**
 * Server-side property data access for Server Components.
 * Uses the admin (service-role) client to bypass anon GRANT restrictions
 * (F-10 fix blocks anon SELECT on properties). Sensitive columns are
 * stripped from the response before returning to the client.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Columns to strip from public-facing responses (F-10/F-14 fix). */
const SENSITIVE_COLS = [
  "private_address_line", "landlord_id", "latitude", "longitude",
  "available_units", "occupied_units", "held_units",
];

/** Remove sensitive columns from a property object. */
function stripSensitive<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row };
  for (const col of SENSITIVE_COLS) delete out[col];
  return out;
}

/**
 * Server-side caching wrapper for homepage stats.
 * Uses Next.js fetch-level caching with revalidate=300 (5 minutes).
 *
 * Note: unstable_cache was removed because it runs outside the request
 * context, breaking the cookies() call inside createClient(). The
 * server client needs cookies for RLS-aware queries. Instead, we rely
 * on Next.js's default fetch caching + revalidate.
 */
export async function fetchHomepageStatsServer(): Promise<{
  data: HomepageStats | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const [
      { count: verifiedProperties },
      { count: universities },
      { count: neighbourhoods },
      { count: availableRooms },
      { count: totalBookings },
    ] = await Promise.all([
      supabase.from("public_properties").select("*", { count: "exact", head: true }).eq("status", "verified").eq("verification_status", "approved"),
      supabase.from("universities").select("*", { count: "exact", head: true }).eq("active", true),
      supabase.from("neighbourhoods").select("*", { count: "exact", head: true }).eq("active", true),
      supabase.from("rentable_units").select("*", { count: "exact", head: true }).eq("status", "available"),
      supabase.from("bookings").select("*", { count: "exact", head: true }).in("status", ["confirmed", "active", "completed"]),
    ]);

    return {
      data: {
        verifiedProperties: verifiedProperties ?? 0,
        universities: universities ?? 0,
        neighbourhoods: neighbourhoods ?? 0,
        availableRooms: availableRooms ?? 0,
        totalBookings: totalBookings ?? 0,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch homepage stats" };
  }
}

export interface UniversitySummary {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  city: string;
  state: string;
  description: string | null;
}

export async function fetchUniversitiesServer(): Promise<{
  data: UniversitySummary[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("universities")
      .select("id, name, short_name, slug, city, state, description")
      .eq("active", true)
      .order("name");

    if (error) return { data: null, error: error.message };
    return { data: data as UniversitySummary[], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch universities",
    };
  }
}

export interface NeighbourhoodSummary {
  id: string;
  name: string;
  slug: string;
  average_annual_rent_kobo: number | null;
  walking_minutes_to_campus: number | null;
  city: string;
  state: string;
}

export async function fetchNeighbourhoodsServer(
  universityId?: string,
): Promise<{ data: NeighbourhoodSummary[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("neighbourhoods")
      .select("id, name, slug, average_annual_rent_kobo, walking_minutes_to_campus, city, state")
      .eq("active", true);

    if (universityId) {
      query = query.eq("university_id", universityId);
    }

    const { data, error } = await query.order("name");
    if (error) return { data: null, error: error.message };
    return { data: data as NeighbourhoodSummary[], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch neighbourhoods",
    };
  }
}

export interface PropertySummary {
  id: string;
  slug: string;
  name: string;
  type: string;
  status: string;
  verification_status: string;
  city: string;
  state: string;
  public_address_line: string;
  price_from_kobo: number;
  total_units: number;
  available_units: number;
  description: string;
  university_id: string | null;
}

export async function fetchPropertiesServer(params: {
  universityId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const admin = createAdminClient();
    let query = admin
      .from("properties")
      .select(`*, property_images(id, storage_path, public_url, alt_text, position), property_facilities(facility), universities(id, name, short_name, slug), neighbourhoods(id, name, slug)`)
      .eq("status", "verified")
      .eq("verification_status", "approved")
      .order("created_at", { ascending: false });

    if (params.universityId) {
      query = query.eq("university_id", params.universityId);
    }

    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map(stripSensitive), error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch properties",
    };
  }
}

/**
 * Fetch a single verified property by slug for server-side rendering
 * (used by generateMetadata on /properties/[slug]).
 * Returns only public fields — no landlord PII.
 */
export async function fetchPropertyBySlugServer(
  slug: string,
): Promise<{ data: { name: string; slug: string; city: string; state: string; public_address_line: string; description: string | null; type: string | null } | null; error: string | null }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("properties")
      .select("name, slug, city, state, public_address_line, description, type")
      .eq("slug", slug)
      .eq("status", "verified")
      .eq("verification_status", "approved")
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as any, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch property",
    };
  }
}

// ---------------------------------------------------------------------------
// Homepage stats — real numbers from the database, never fabricated.
// ---------------------------------------------------------------------------

export interface HomepageStats {
  /** Count of verified, approved properties. */
  verifiedProperties: number;
  /** Count of active universities. */
  universities: number;
  /** Count of active neighbourhoods. */
  neighbourhoods: number;
  /** Count of available rentable units across all verified properties. */
  availableRooms: number;
  /** Count of confirmed bookings (all-time). */
  totalBookings: number;
}

// ---------------------------------------------------------------------------
// Testimonials — admin-managed, only approved + published shown publicly.
// ---------------------------------------------------------------------------

export interface Testimonial {
  id: string;
  authorName: string;
  authorRole: string;
  authorUniversity: string | null;
  authorLevel: string | null;
  quote: string;
  rating: number | null;
  displayOrder: number;
  createdAt: string;
}

/**
 * Fetch approved + published testimonials for the public homepage.
 * Ordered by display_order ASC, then created_at DESC.
 * Limited to `limit` results (default 6).
 */
export async function fetchPublishedTestimonialsServer(limit: number = 6): Promise<{
  data: Testimonial[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("testimonials")
      .select("id, author_name, author_role, author_university, author_level, quote, rating, display_order, created_at")
      .eq("status", "approved")
      .eq("published", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: error.message };

    const testimonials = (data ?? []).map((t: any) => ({
      id: t.id,
      authorName: t.author_name,
      authorRole: t.author_role,
      authorUniversity: t.author_university,
      authorLevel: t.author_level,
      quote: t.quote,
      rating: t.rating,
      displayOrder: t.display_order,
      createdAt: t.created_at,
    }));

    return { data: testimonials, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch testimonials",
    };
  }
}
