/**
 * Server-side property data access for Server Components.
 * Uses the server Supabase client (cookie-based auth).
 */

import { createClient } from "@/lib/supabase/server";

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
    const supabase = await createClient();
    let query = supabase
      .from("properties")
      .select(`*`)
      .in("status", ["verified", "pending_verification"])
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
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch properties",
    };
  }
}
