"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type SupabaseClient = ReturnType<typeof createClient>;

export interface PropertyWithRelations {
  id: string;
  slug: string;
  landlord_id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  verification_status: string;
  city: string;
  state: string;
  neighbourhood_id: string | null;
  university_id: string | null;
  public_address_line: string;
  private_address_line: string;
  latitude: number | null;
  longitude: number | null;
  total_floors: number;
  total_units: number;
  available_units: number;
  occupied_units: number;
  held_units: number;
  price_from_kobo: number;
  created_at: string;
  updated_at: string;
  property_images?: { id: string; public_url: string | null; storage_path: string; alt_text: string; position: number }[];
  property_facilities?: { facility: string }[];
  universities?: { id: string; name: string; short_name: string; slug: string } | null;
  neighbourhoods?: { id: string; name: string; slug: string } | null;
}

export interface RentableUnitWithRelations {
  id: string;
  identifier: string;
  slug: string | null;
  property_id: string;
  floor_id: string | null;
  unit_type: string;
  status: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  has_balcony: boolean;
  has_window: boolean;
  size_sqm: number | null;
  furnishing: string;
  representative_images_only: boolean;
  annual_rent_kobo: number;
  rental_period: string;
  caution_deposit_kobo: number | null;
  available_from: string | null;
  available_to: string | null;
  booking_terms: string | null;
  created_at: string;
  updated_at: string;
  unit_facilities?: { facility: string }[];
  unit_images?: { id: string; public_url: string | null; storage_path: string; alt_text: string; position: number }[];
  additional_charges?: { id: string; label: string; amount_kobo: number; frequency: string }[];
  floors?: { id: string; label: string; level: number } | null;
}

export interface FloorWithCounts {
  id: string;
  property_id: string;
  label: string;
  level: number;
  description: string | null;
  default_price_kobo: number | null;
  position: number;
  created_at: string;
  updated_at: string;
  room_count?: number;
  available_count?: number;
}

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Fetch published/verified properties with images, facilities, university and neighbourhood.
 * Supports search, university filter, neighbourhood filter, price range, and pagination.
 */
export async function fetchProperties(params: {
  q?: string;
  universityId?: string;
  neighbourhoodId?: string;
  minPriceKobo?: number;
  maxPriceKobo?: number;
  unitTypes?: string[];
  page?: number;
  pageSize?: number;
}): Promise<ServiceResult<{ items: PropertyWithRelations[]; total: number }>> {
  try {
    const supabase = createClient();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 12;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("properties")
      .select(`
        *,
        property_images(*),
        property_facilities(facility),
        universities(id, name, short_name, slug),
        neighbourhoods(id, name, slug)
      `, { count: "exact" })
      .in("status", ["verified", "pending_verification"])
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.q) {
      query = query.or(`name.ilike.%${params.q}%,description.ilike.%${params.q}%,public_address_line.ilike.%${params.q}%,city.ilike.%${params.q}%`);
    }
    if (params.universityId) {
      query = query.eq("university_id", params.universityId);
    }
    if (params.neighbourhoodId) {
      query = query.eq("neighbourhood_id", params.neighbourhoodId);
    }
    if (params.minPriceKobo !== undefined) {
      query = query.gte("price_from_kobo", params.minPriceKobo);
    }
    if (params.maxPriceKobo !== undefined) {
      query = query.lte("price_from_kobo", params.maxPriceKobo);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { items: data as PropertyWithRelations[], total: count ?? 0 }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch properties" };
  }
}

/**
 * Fetch a single property by slug with full details.
 */
export async function fetchPropertyBySlug(slug: string): Promise<ServiceResult<PropertyWithRelations>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("properties")
      .select(`
        *,
        property_images(*),
        property_facilities(facility),
        universities(id, name, short_name, slug),
        neighbourhoods(id, name, slug)
      `)
      .eq("slug", slug)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as PropertyWithRelations, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch property" };
  }
}

/**
 * Fetch floors for a property.
 */
export async function fetchFloors(propertyId: string): Promise<ServiceResult<FloorWithCounts[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("floors")
      .select("*")
      .eq("property_id", propertyId)
      .order("level", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    // Get room counts per floor
    const floors = data as FloorWithCounts[];
    for (const floor of floors) {
      const { count: total } = await supabase
        .from("rentable_units")
        .select("*", { count: "exact", head: true })
        .eq("floor_id", floor.id);
      const { count: available } = await supabase
        .from("rentable_units")
        .select("*", { count: "exact", head: true })
        .eq("floor_id", floor.id)
        .eq("status", "available");
      floor.room_count = total ?? 0;
      floor.available_count = available ?? 0;
    }

    return { data: floors, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch floors" };
  }
}

/**
 * Fetch rentable units for a property (optionally filtered by floor).
 */
export async function fetchRentableUnits(params: {
  propertyId: string;
  floorId?: string;
  status?: string;
}): Promise<ServiceResult<RentableUnitWithRelations[]>> {
  try {
    const supabase = createClient();
    let query = supabase
      .from("rentable_units")
      .select(`
        *,
        unit_facilities(facility),
        unit_images(*),
        additional_charges(*),
        floors(id, label, level)
      `)
      .eq("property_id", params.propertyId)
      .order("identifier", { ascending: true });

    if (params.floorId) {
      query = query.eq("floor_id", params.floorId);
    }
    if (params.status) {
      query = query.eq("status", params.status);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as RentableUnitWithRelations[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch rooms" };
  }
}

/**
 * Fetch a single rentable unit by ID with full details.
 */
export async function fetchRentableUnitById(id: string): Promise<ServiceResult<RentableUnitWithRelations>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("rentable_units")
      .select(`
        *,
        unit_facilities(facility),
        unit_images(*),
        additional_charges(*),
        floors(id, label, level)
      `)
      .eq("id", id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as RentableUnitWithRelations, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch room" };
  }
}

/**
 * Fetch universities for dropdowns/filters.
 */
export async function fetchUniversities(): Promise<ServiceResult<{ id: string; name: string; short_name: string; slug: string; city: string; state: string }[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("universities")
      .select("id, name, short_name, slug, city, state")
      .eq("active", true)
      .order("name");

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch universities" };
  }
}

/**
 * Fetch neighbourhoods for a university.
 */
export async function fetchNeighbourhoods(universityId?: string): Promise<ServiceResult<{ id: string; name: string; slug: string; average_annual_rent_kobo: number | null }[]>> {
  try {
    const supabase = createClient();
    let query = supabase
      .from("neighbourhoods")
      .select("id, name, slug, average_annual_rent_kobo")
      .eq("active", true)
      .order("name");

    if (universityId) {
      query = query.eq("university_id", universityId);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch neighbourhoods" };
  }
}

/**
 * Create a booking using the authoritative create_booking() database function.
 *
 * This calls the SECURITY DEFINER function which:
 * - Locks the room row (FOR UPDATE) to prevent concurrent bookings
 * - Checks room availability
 * - Checks for overlapping bookings
 * - Creates the booking with 'pending_payment' status
 * - Marks the room as 'held'
 * - Records status history
 *
 * The student_id is passed from the authenticated session — the caller
 * must derive it from the session, not from user input.
 */
export async function createBooking(params: {
  studentId: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  rentalPeriod: string;
  baseRentKobo: number;
  additionalChargesKobo: number;
  cautionDepositKobo: number;
  serviceFeeKobo: number;
  totalKobo: number;
}): Promise<ServiceResult<{ bookingId: string }>> {
  try {
    const supabase = createClient();

    // Call the database function via RPC
    const { data, error } = await supabase.rpc("create_booking", {
      p_student_id: params.studentId,
      p_unit_id: params.unitId,
      p_check_in: params.checkIn,
      p_check_out: params.checkOut,
      p_rental_period: params.rentalPeriod,
      p_base_rent_kobo: params.baseRentKobo,
      p_additional_charges_kobo: params.additionalChargesKobo,
      p_caution_deposit_kobo: params.cautionDepositKobo,
      p_service_fee_kobo: params.serviceFeeKobo,
      p_total_kobo: params.totalKobo,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    // The function returns the booking UUID
    if (!data) {
      return { data: null, error: "Booking creation returned no result" };
    }

    return { data: { bookingId: data as string }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to create booking" };
  }
}

/**
 * Fetch bookings for the current authenticated student.
 */
export async function fetchStudentBookings(studentId: string): Promise<ServiceResult<any[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        rentable_units(id, identifier, unit_type, annual_rent_kobo),
        properties(id, name, slug, public_address_line)
      `)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch bookings" };
  }
}

/**
 * Cancel a booking using the cancel_booking() database function.
 * Only allowed for bookings in 'pending_payment' or 'payment_initiated' status.
 */
export async function cancelBooking(bookingId: string, reason: string): Promise<ServiceResult<null>> {
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc("cancel_booking", {
      p_booking_id: bookingId,
      p_reason: reason,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to cancel booking" };
  }
}
