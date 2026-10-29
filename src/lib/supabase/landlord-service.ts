"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

// ============================================================
// PROPERTY MANAGEMENT
// ============================================================

/**
 * Fetch all properties owned by the authenticated landlord.
 * RLS ensures only the landlord's own properties are returned.
 */
export async function fetchLandlordProperties(): Promise<ServiceResult<any[]>> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("properties")
      .select(`
        *,
        property_images(*),
        property_facilities(facility),
        universities(id, name, short_name),
        neighbourhoods(id, name)
      `)
      .eq("landlord_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch properties" };
  }
}

/**
 * Fetch a single property by ID (RLS ensures ownership).
 */
export async function fetchLandlordProperty(propertyId: string): Promise<ServiceResult<any>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("properties")
      .select(`
        *,
        property_images(*),
        property_facilities(facility),
        property_rules(*),
        universities(id, name, short_name, slug),
        neighbourhoods(id, name, slug)
      `)
      .eq("id", propertyId)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch property" };
  }
}

/**
 * Create a new property. The landlord_id is derived from the authenticated
 * session — never from user input.
 */
export async function createProperty(input: {
  name: string;
  description: string;
  type: string;
  city: string;
  state: string;
  neighbourhoodId?: string;
  universityId?: string;
  publicAddressLine: string;
  privateAddressLine: string;
  latitude?: number;
  longitude?: number;
  facilities?: string[];
  rules?: { label: string; category: string }[];
}): Promise<ServiceResult<{ id: string; slug: string }>> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    // Generate slug from name
    const slug = input.name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);

    // Insert property — landlord_id derived from session
    const { data, error } = await supabase
      .from("properties")
      .insert({
        slug,
        landlord_id: user.id,
        name: input.name,
        description: input.description,
        type: input.type,
        status: "draft",
        verification_status: "not_submitted",
        city: input.city,
        state: input.state,
        neighbourhood_id: input.neighbourhoodId || null,
        university_id: input.universityId || null,
        public_address_line: input.publicAddressLine,
        private_address_line: input.privateAddressLine,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
      })
      .select("id, slug")
      .single();

    if (error) return { data: null, error: error.message };

    // Insert facilities
    if (input.facilities && input.facilities.length > 0) {
      const facilityRows = input.facilities.map(f => ({
        property_id: data.id,
        facility: f,
      }));
      await supabase.from("property_facilities").insert(facilityRows);
    }

    // Insert rules
    if (input.rules && input.rules.length > 0) {
      const ruleRows = input.rules.map(r => ({
        property_id: data.id,
        label: r.label,
        category: r.category,
      }));
      await supabase.from("property_rules").insert(ruleRows);
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to create property" };
  }
}

/**
 * Update a property. RLS ensures only the owner can update.
 */
export async function updateProperty(propertyId: string, patch: {
  name?: string;
  description?: string;
  type?: string;
  city?: string;
  state?: string;
  neighbourhoodId?: string;
  universityId?: string;
  publicAddressLine?: string;
  privateAddressLine?: string;
  latitude?: number;
  longitude?: number;
}): Promise<ServiceResult<null>> {
  try {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {};
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.description !== undefined) updateData.description = patch.description;
    if (patch.type !== undefined) updateData.type = patch.type;
    if (patch.city !== undefined) updateData.city = patch.city;
    if (patch.state !== undefined) updateData.state = patch.state;
    if (patch.neighbourhoodId !== undefined) updateData.neighbourhood_id = patch.neighbourhoodId || null;
    if (patch.universityId !== undefined) updateData.university_id = patch.universityId || null;
    if (patch.publicAddressLine !== undefined) updateData.public_address_line = patch.publicAddressLine;
    if (patch.privateAddressLine !== undefined) updateData.private_address_line = patch.privateAddressLine;
    if (patch.latitude !== undefined) updateData.latitude = patch.latitude;
    if (patch.longitude !== undefined) updateData.longitude = patch.longitude;

    const { error } = await supabase
      .from("properties")
      .update(updateData)
      .eq("id", propertyId);

    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to update property" };
  }
}

/**
 * Submit a property for verification.
 * Changes status from 'draft' to 'pending_verification' and
 * verification_status from 'not_submitted' to 'pending'.
 */
export async function submitPropertyForVerification(propertyId: string): Promise<ServiceResult<null>> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("properties")
      .update({
        status: "pending_verification",
        verification_status: "pending",
      })
      .eq("id", propertyId)
      .in("status", ["draft", "rejected"]); // Only allow from draft or rejected

    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to submit property" };
  }
}

// ============================================================
// FLOOR MANAGEMENT
// ============================================================

/**
 * Fetch floors for a property (RLS ensures ownership).
 */
export async function fetchFloors(propertyId: string): Promise<ServiceResult<any[]>> {
  try {
    const supabase = createClient();
    const { data: floors, error } = await supabase
      .from("floors")
      .select("*")
      .eq("property_id", propertyId)
      .order("level", { ascending: true });

    if (error) return { data: null, error: error.message };

    // Get room counts per floor
    const floorsWithCounts = await Promise.all(
      (floors || []).map(async (floor) => {
        const { count: total } = await supabase
          .from("rentable_units")
          .select("*", { count: "exact", head: true })
          .eq("floor_id", floor.id);
        const { count: available } = await supabase
          .from("rentable_units")
          .select("*", { count: "exact", head: true })
          .eq("floor_id", floor.id)
          .eq("status", "available");
        return { ...floor, room_count: total ?? 0, available_count: available ?? 0 };
      })
    );

    return { data: floorsWithCounts, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch floors" };
  }
}

/**
 * Create a new floor.
 */
export async function createFloor(input: {
  propertyId: string;
  label: string;
  level: number;
  defaultPriceKobo?: number;
  description?: string;
}): Promise<ServiceResult<{ id: string }>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("floors")
      .insert({
        property_id: input.propertyId,
        label: input.label,
        level: input.level,
        default_price_kobo: input.defaultPriceKobo || null,
        description: input.description || null,
        position: input.level,
      })
      .select("id")
      .single();

    if (error) return { data: null, error: error.message };
    return { data: { id: data.id }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to create floor" };
  }
}

/**
 * Update a floor.
 */
export async function updateFloor(floorId: string, patch: {
  label?: string;
  level?: number;
  defaultPriceKobo?: number;
  description?: string;
}): Promise<ServiceResult<null>> {
  try {
    const supabase = createClient();
    const updateData: Record<string, unknown> = {};
    if (patch.label !== undefined) updateData.label = patch.label;
    if (patch.level !== undefined) updateData.level = patch.level;
    if (patch.defaultPriceKobo !== undefined) updateData.default_price_kobo = patch.defaultPriceKobo;
    if (patch.description !== undefined) updateData.description = patch.description;

    const { error } = await supabase.from("floors").update(updateData).eq("id", floorId);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to update floor" };
  }
}

/**
 * Delete a floor. Checks for associated rooms first.
 */
export async function deleteFloor(floorId: string): Promise<ServiceResult<null>> {
  try {
    const supabase = createClient();

    // Check for rooms on this floor
    const { count } = await supabase
      .from("rentable_units")
      .select("*", { count: "exact", head: true })
      .eq("floor_id", floorId);

    if (count && count > 0) {
      return { data: null, error: `Cannot delete floor with ${count} rooms. Move or delete the rooms first.` };
    }

    const { error } = await supabase.from("floors").delete().eq("id", floorId);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to delete floor" };
  }
}

// ============================================================
// ROOM MANAGEMENT
// ============================================================

/**
 * Fetch rentable units for a property.
 */
export async function fetchRooms(propertyId: string, floorId?: string): Promise<ServiceResult<any[]>> {
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
      .eq("property_id", propertyId)
      .order("identifier", { ascending: true });

    if (floorId) {
      query = query.eq("floor_id", floorId);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch rooms" };
  }
}

/**
 * Supported rental periods for landlord configuration.
 * 'biannual' and 'monthly' exist in the DB enum for backward compatibility
 * but are NOT offered to landlords (not in the product requirement).
 */
export const SUPPORTED_RENTAL_PERIODS = ["annual", "quarterly", "semester"] as const;
export type SupportedRentalPeriod = typeof SUPPORTED_RENTAL_PERIODS[number];

/**
 * Create a new rentable unit.
 *
 * The landlord configures the rental period (annual/quarterly/semester) and
 * the period rent (periodRentKobo). For 'annual' units, periodRentKobo equals
 * annualRentKobo. For 'quarterly'/'semester' units, periodRentKobo is the
 * per-period rent. annualRentKobo is preserved for backward compatibility
 * and the price-from display.
 */
export async function createRoom(input: {
  propertyId: string;
  floorId?: string;
  identifier: string;
  unitType: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  hasBalcony: boolean;
  hasWindow: boolean;
  furnishing: string;
  annualRentKobo: number;
  periodRentKobo?: number;
  rentalPeriod: string;
  cautionDepositKobo?: number;
  bookingTerms?: string;
  facilities?: string[];
}): Promise<ServiceResult<{ id: string }>> {
  try {
    // Validate inputs
    if (!input.identifier?.trim()) return { data: null, error: "Unit identifier is required" };
    if (input.annualRentKobo <= 0) return { data: null, error: "Annual rent must be positive" };
    if (input.capacity < 1) return { data: null, error: "Capacity must be at least 1" };
    if (input.cautionDepositKobo !== undefined && input.cautionDepositKobo < 0) {
      return { data: null, error: "Caution deposit cannot be negative" };
    }
    // Validate rental period is one of the supported options
    if (!SUPPORTED_RENTAL_PERIODS.includes(input.rentalPeriod as SupportedRentalPeriod)) {
      return { data: null, error: `Rental period must be one of: ${SUPPORTED_RENTAL_PERIODS.join(", ")}` };
    }
    // periodRentKobo defaults to annualRentKobo for 'annual' units
    const periodRent = input.periodRentKobo ?? input.annualRentKobo;
    if (periodRent <= 0) {
      return { data: null, error: "Period rent must be positive" };
    }

    const supabase = createClient();

    // Verify the floor belongs to this property (RLS will also enforce this)
    const { data: floor } = await supabase
      .from("floors")
      .select("property_id")
      .eq("id", input.floorId)
      .single();

    if (!floor || floor.property_id !== input.propertyId) {
      return { data: null, error: "Floor does not belong to this property" };
    }

    const slug = input.identifier.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const { data, error } = await supabase
      .from("rentable_units")
      .insert({
        identifier: input.identifier,
        slug,
        property_id: input.propertyId,
        floor_id: input.floorId,
        unit_type: input.unitType,
        status: "available",
        capacity: input.capacity,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        has_balcony: input.hasBalcony,
        has_window: input.hasWindow,
        furnishing: input.furnishing,
        annual_rent_kobo: input.annualRentKobo,
        period_rent_kobo: periodRent,
        rental_period: input.rentalPeriod,
        caution_deposit_kobo: input.cautionDepositKobo || null,
        booking_terms: input.bookingTerms || null,
        available_from: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();

    if (error) return { data: null, error: error.message };

    // Insert unit facilities
    if (input.facilities && input.facilities.length > 0) {
      const facilityRows = input.facilities.map(f => ({
        unit_id: data.id,
        facility: f,
      }));
      await supabase.from("unit_facilities").insert(facilityRows);
    }

    return { data: { id: data.id }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to create room" };
  }
}

/**
 * Update a rentable unit.
 *
 * If rentalPeriod is changed, periodRentKobo should also be provided (the
 * rent for one period of the new type). If rentalPeriod is changed without
 * periodRentKobo, the existing period_rent_kobo is preserved (the landlord
 * should update it separately).
 */
export async function updateRoom(roomId: string, patch: {
  identifier?: string;
  unitType?: string;
  capacity?: number;
  bedrooms?: number;
  bathrooms?: number;
  hasBalcony?: boolean;
  hasWindow?: boolean;
  furnishing?: string;
  annualRentKobo?: number;
  periodRentKobo?: number;
  rentalPeriod?: string;
  cautionDepositKobo?: number;
  bookingTerms?: string;
  status?: string;
}): Promise<ServiceResult<null>> {
  try {
    // Validate rental period if provided
    if (patch.rentalPeriod !== undefined && !SUPPORTED_RENTAL_PERIODS.includes(patch.rentalPeriod as SupportedRentalPeriod)) {
      return { data: null, error: `Rental period must be one of: ${SUPPORTED_RENTAL_PERIODS.join(", ")}` };
    }
    if (patch.periodRentKobo !== undefined && patch.periodRentKobo <= 0) {
      return { data: null, error: "Period rent must be positive" };
    }

    const supabase = createClient();

    // If trying to change status, check for active bookings
    if (patch.status) {
      const { data: room } = await supabase
        .from("rentable_units")
        .select("status, active_hold_id, active_booking_id")
        .eq("id", roomId)
        .single();

      if (room) {
        // Cannot set to available if there's an active hold or booking
        if (patch.status === "available" && (room.active_hold_id || room.active_booking_id)) {
          return { data: null, error: "Cannot set to available while there is an active hold or booking" };
        }
        // Cannot set to maintenance if there's an active booking
        if (patch.status === "maintenance" && room.active_booking_id) {
          return { data: null, error: "Cannot set to maintenance while there is an active booking" };
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (patch.identifier !== undefined) updateData.identifier = patch.identifier;
    if (patch.unitType !== undefined) updateData.unit_type = patch.unitType;
    if (patch.capacity !== undefined) updateData.capacity = patch.capacity;
    if (patch.bedrooms !== undefined) updateData.bedrooms = patch.bedrooms;
    if (patch.bathrooms !== undefined) updateData.bathrooms = patch.bathrooms;
    if (patch.hasBalcony !== undefined) updateData.has_balcony = patch.hasBalcony;
    if (patch.hasWindow !== undefined) updateData.has_window = patch.hasWindow;
    if (patch.furnishing !== undefined) updateData.furnishing = patch.furnishing;
    if (patch.annualRentKobo !== undefined) updateData.annual_rent_kobo = patch.annualRentKobo;
    if (patch.periodRentKobo !== undefined) updateData.period_rent_kobo = patch.periodRentKobo;
    if (patch.rentalPeriod !== undefined) updateData.rental_period = patch.rentalPeriod;
    if (patch.cautionDepositKobo !== undefined) updateData.caution_deposit_kobo = patch.cautionDepositKobo;
    if (patch.bookingTerms !== undefined) updateData.booking_terms = patch.bookingTerms;
    if (patch.status !== undefined) updateData.status = patch.status;

    const { error } = await supabase.from("rentable_units").update(updateData).eq("id", roomId);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to update room" };
  }
}

/**
 * Delete a rentable unit. Checks for active bookings first.
 */
export async function deleteRoom(roomId: string): Promise<ServiceResult<null>> {
  try {
    const supabase = createClient();

    // Check for active bookings
    const { data: room } = await supabase
      .from("rentable_units")
      .select("status, active_hold_id, active_booking_id")
      .eq("id", roomId)
      .single();

    if (room && (room.active_hold_id || room.active_booking_id)) {
      return { data: null, error: "Cannot delete a room with an active hold or booking" };
    }

    const { error } = await supabase.from("rentable_units").delete().eq("id", roomId);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to delete room" };
  }
}

/**
 * Bulk create rooms with sequential identifiers.
 */
export async function bulkCreateRooms(input: {
  propertyId: string;
  floorId: string;
  prefix: string;
  startIndex: number;
  count: number;
  unitType: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  furnishing: string;
  annualRentKobo: number;
  rentalPeriod: string;
  applyFloorDefault: boolean;
}): Promise<ServiceResult<{ created: number }>> {
  try {
    const supabase = createClient();

    // Get floor default price if requested
    let priceKobo = input.annualRentKobo;
    if (input.applyFloorDefault) {
      const { data: floor } = await supabase
        .from("floors")
        .select("default_price_kobo")
        .eq("id", input.floorId)
        .single();
      if (floor?.default_price_kobo) {
        priceKobo = floor.default_price_kobo;
      }
    }

    const rooms: Array<Record<string, unknown>> = [];
    for (let i = 0; i < input.count; i++) {
      const num = input.startIndex + i;
      const identifier = `${input.prefix}-${String(num).padStart(3, "0")}`;
      const slug = identifier.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      rooms.push({
        identifier,
        slug,
        property_id: input.propertyId,
        floor_id: input.floorId,
        unit_type: input.unitType,
        status: "available",
        capacity: input.capacity,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        has_window: true,
        furnishing: input.furnishing,
        annual_rent_kobo: priceKobo,
        period_rent_kobo: priceKobo,
        rental_period: input.rentalPeriod,
        available_from: new Date().toISOString().slice(0, 10),
      });
    }

    const { error } = await supabase.from("rentable_units").insert(rooms);
    if (error) return { data: null, error: error.message };

    return { data: { created: input.count }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to bulk create rooms" };
  }
}

// ============================================================
// BOOKING MANAGEMENT (Landlord view)
// ============================================================

/**
 * Fetch bookings for the landlord's properties.
 */
export async function fetchLandlordBookings(): Promise<ServiceResult<any[]>> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    // RLS will filter to only the landlord's properties' bookings
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        rentable_units(id, identifier, unit_type),
        properties(id, name, slug)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch bookings" };
  }
}

// ============================================================
// VERIFICATION STATUS
// ============================================================

/**
 * Fetch verification cases for the landlord's properties.
 */
export async function fetchLandlordVerificationCases(): Promise<ServiceResult<any[]>> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    // Get properties for this landlord
    const { data: properties } = await supabase
      .from("properties")
      .select("id, name, verification_status, status")
      .eq("landlord_id", user.id);

    return { data: properties || [], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch verification status" };
  }
}
