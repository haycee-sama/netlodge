/**
 * Discovery core — testable pure functions for student discovery.
 *
 * Phase 6 — implements `properties.search` and `properties.get` per
 * API_CONTRACTS.md §4.
 *
 * CRITICAL SECURITY PROPERTIES:
 *
 *   1. Publication visibility is enforced at the QUERY level — the
 *      Supabase query selects from rooms + properties with explicit
 *      `.eq("p.status", "approved")` + `.eq("r.is_listed", true)` filters.
 *      RLS also enforces this (Phase 5 migration 0006), but the query
 *      is explicit so that even if RLS were somehow bypassed, the
 *      query itself wouldn't return non-public records.
 *
 *   2. The verified-property badge is computed from
 *      `landlords.verification_valid_until > now()` — never from a
 *      stored flag or client input. An expired verification badge is
 *      never returned as active.
 *
 *   3. `properties.address` is NEVER returned in discovery results —
 *      only `area` is public per API_CONTRACTS.md §4.
 *
 *   4. Landlord identity is limited to first name — no email, phone,
 *      or full name beyond the first word.
 *
 *   5. Price is returned in kobo (minor units) per API_CONTRACTS.md §2.
 *      The DB stores numeric(12,2) in naira; the API layer converts.
 */
import {
  validationError,
  notFoundError,
  internalError,
} from "@/errors";
import { formatZodError } from "@/validation";
import {
  searchRoomsSchema,
  getPropertyDetailSchema,
  isVerificationCurrentlyValid,
} from "@/lib/discovery/schemas";
import type {
  SearchRoomsResult,
  SearchResultRoom,
  PropertyDetailResult,
  PropertyDetailRoom,
  PropertyDetailImage,
} from "@/lib/discovery/schemas";

// ── Types: Supabase DB client ───────────────────────────────────────────────

/**
 * Loose-typed Supabase client (same pattern as Phase 2/4/5 — strict
 * PostgrestBuilder typing causes TS2589 infinite recursion).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseDbClient = { from(table: string): any };

// ── Search rooms ─────────────────────────────────────────────────────────────

/**
 * `properties.search` — API_CONTRACTS.md §4.
 *
 * Returns ROOMS (not properties) where:
 *   - parent property status = 'approved'
 *   - room is_listed = true
 *
 * Filters (all applied at the DB query level):
 *   - universityId (required) — on the parent property
 *   - area (optional) — ilike match on properties.area
 *   - minPrice/maxPrice (optional, kobo) — on rooms.price (converted to naira)
 *   - roomType (optional) — exact match on rooms.room_type
 *
 * Sort (explicit allow-list, never raw column/direction):
 *   - price_asc — rooms.price ASC, rooms.created_at ASC (stable secondary)
 *   - price_desc — rooms.price DESC, rooms.created_at ASC (stable secondary)
 *   - newest — rooms.created_at DESC (stable by id)
 *
 * Pagination: offset/limit with totalCount.
 *
 * Never exposes: properties.address, landlord identity beyond first name,
 * internal status fields, images.uploadedBy, review data.
 */
export async function searchRoomsCore(
  db: SupabaseDbClient,
  rawInput: unknown,
): Promise<SearchRoomsResult> {
  const parsed = searchRoomsSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError(
      "Invalid search parameters.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  // Build the query joining rooms + properties.
  // RLS on both tables will also enforce visibility (approved + listed +
  // not suspended), but we add explicit filters for defense-in-depth +
  // correct filtering.
  //
  // Phase 10 — adds `properties.is_suspended = false` filter. The RLS
  // `properties_public_read` policy (migration 0009) also excludes
  // suspended properties, so even if this explicit filter were missing,
  // suspended properties would be invisible to anon/authenticated queries.
  // The explicit filter is here so that even with a service-role client
  // (which bypasses RLS) the discovery function returns the correct
  // public set — defensive against accidental privilege misuse.
  let query = db
    .from("rooms")
    .select(
      `
      id,
      room_type,
      price,
      occupancy,
      amenities,
      created_at,
      property_id,
      properties!inner (
        id,
        area,
        description,
        university_id,
        status,
        is_suspended,
        landlord_id
      )
      `,
      { count: "exact" },
    )
    .eq("is_listed", true)
    .eq("properties.status", "approved")
    .eq("properties.is_suspended", false)
    .eq("properties.university_id", input.universityId);

  // Area filter — ilike (case-insensitive substring match).
  if (input.area) {
    query = query.ilike("properties.area", `%${input.area}%`);
  }

  // Price filters — convert kobo to naira (numeric(12,2) in DB).
  if (input.minPrice !== undefined) {
    query = query.gte("price", input.minPrice / 100);
  }
  if (input.maxPrice !== undefined) {
    query = query.lte("price", input.maxPrice / 100);
  }

  // Room type filter — exact match.
  if (input.roomType) {
    query = query.eq("room_type", input.roomType);
  }

  // Sorting — explicit allow-list, never raw column/direction.
  // Use a stable secondary sort to ensure deterministic pagination.
  switch (input.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true }).order("created_at", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false }).order("created_at", { ascending: true });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
      break;
  }

  // Pagination.
  const offset = (input.page - 1) * input.pageSize;
  query = query.range(offset, offset + input.pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw internalError("Could not retrieve search results.", {
      phase: "searchRooms",
      error,
    });
  }

  // Map DB rows to result shape — convert price from naira to kobo.
  const items: SearchResultRoom[] = (data ?? []).map(
    (raw: unknown) => {
      const r = raw as {
        id: string;
        room_type: string;
        price: string;
        occupancy: number;
        amenities: string[];
        created_at: string;
        property_id: string;
        properties: {
          id: string;
          area: string;
          description: string;
          university_id: string;
          status: string;
          landlord_id: string;
        };
      };
      // Convert naira (numeric(12,2)) to kobo (integer).
      const priceNaira = parseFloat(r.price);
      const priceKobo = Math.round(priceNaira * 100);

      return {
        roomId: r.id,
        propertyId: r.property_id,
        area: r.properties.area,
        description: r.properties.description,
        roomType: r.room_type,
        priceKobo,
        occupancy: r.occupancy,
        amenities: r.amenities ?? [],
        universityId: r.properties.university_id,
        hasPrimaryImage: false, // Set below via batch query
        primaryImagePath: null,
      };
    },
  );

  // Batch fetch primary images for the returned rooms' properties.
  if (items.length > 0) {
    const propertyIds = [...new Set(items.map((i) => i.propertyId))];
    const { data: imgData, error: imgErr } = await db
      .from("property_images")
      .select("property_id, storage_path, is_primary")
      .in("property_id", propertyIds)
      .eq("is_primary", true);

    if (!imgErr && imgData) {
      const primaryMap = new Map<string, string>();
      for (const img of imgData as Array<{ property_id: string; storage_path: string; is_primary: boolean }>) {
        if (img.is_primary && !primaryMap.has(img.property_id)) {
          primaryMap.set(img.property_id, img.storage_path);
        }
      }
      for (const item of items) {
        const path = primaryMap.get(item.propertyId);
        if (path) {
          item.hasPrimaryImage = true;
          item.primaryImagePath = path;
        }
      }
    }
  }

  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    totalCount: count ?? 0,
  };
}

// ── Property detail ─────────────────────────────────────────────────────────

/**
 * `properties.get` — API_CONTRACTS.md §4.
 *
 * Returns full property detail + its bookable rooms (listed only) + images +
 * verification badge (computed from landlords.verification_valid_until > now()).
 *
 * Only returns the property if its status = 'approved' (publication
 * visibility). A direct URL to an unapproved property returns `not_found`
 * (never reveals whether the property exists but is unauthorized vs truly
 * absent — per API_CONTRACTS.md §2/§19).
 *
 * Never exposes: properties.address, landlord email/phone/full identity,
 * internal review fields, images.uploadedBy, payment/bookings data.
 */
export async function getPropertyDetailCore(
  db: SupabaseDbClient,
  rawInput: unknown,
): Promise<PropertyDetailResult> {
  const parsed = getPropertyDetailSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError(
      "Invalid property detail request.",
      formatZodError(parsed.error),
    );
  }
  const input = parsed.data;

  // Fetch the property — RLS will only return it if status = 'approved'
  // AND is_suspended = false (Phase 10 tightened policy in migration 0009).
  // We also explicitly filter by status + is_suspended for defense-in-depth.
  const { data: prop, error: propErr } = await db
    .from("properties")
    .select(
      `
      id,
      university_id,
      area,
      description,
      status,
      is_suspended,
      landlord_id,
      landlords (
        verification_valid_until,
        profiles (
          full_name
        )
      )
      `,
    )
    .eq("id", input.propertyId)
    .eq("status", "approved")
    .eq("is_suspended", false)
    .maybeSingle();

  if (propErr) {
    throw internalError("Could not retrieve property.", {
      phase: "getPropertyDetail",
      error: propErr,
    });
  }

  // If the property doesn't exist OR isn't approved, return not_found.
  // Per API_CONTRACTS.md §2/§19: never reveal whether it exists but is
  // unauthorized vs truly absent.
  if (!prop) {
    throw notFoundError("Property not found.");
  }

  // Fetch listed rooms for this property.
  const { data: rooms, error: roomsErr } = await db
    .from("rooms")
    .select("id, room_type, price, occupancy, amenities")
    .eq("property_id", input.propertyId)
    .eq("is_listed", true)
    .order("price", { ascending: true });

  if (roomsErr) {
    throw internalError("Could not retrieve rooms.", {
      phase: "getPropertyDetail.rooms",
      error: roomsErr,
    });
  }

  // Fetch property images (ordered by position).
  const { data: images, error: imgErr } = await db
    .from("property_images")
    .select("id, storage_path, position, is_primary")
    .eq("property_id", input.propertyId)
    .order("position", { ascending: true });

  if (imgErr) {
    throw internalError("Could not retrieve images.", {
      phase: "getPropertyDetail.images",
      error: imgErr,
    });
  }

  // Extract landlord data from the joined query.
  const landlordData = prop.landlords as {
    verification_valid_until: string | null;
    profiles: { full_name: string } | null;
  } | null;

  const verificationValidUntil = landlordData?.verification_valid_until ?? null;
  const landlordFullName = landlordData?.profiles?.full_name ?? null;

  // Compute verified badge — server-side, from authoritative DB data.
  const isVerified = isVerificationCurrentlyValid(verificationValidUntil);

  // Extract landlord first name (first word of full_name, per API_CONTRACTS.md §4).
  const landlordFirstName = landlordFullName
    ? landlordFullName.split(" ")[0]!
    : null;

  // Map rooms — convert price from naira to kobo.
  const detailRooms: PropertyDetailRoom[] = (rooms ?? []).map(
    (r: { id: string; room_type: string; price: string; occupancy: number; amenities: string[] }) => ({
      id: r.id,
      roomType: r.room_type,
      priceKobo: Math.round(parseFloat(r.price) * 100),
      occupancy: r.occupancy,
      amenities: r.amenities ?? [],
    }),
  );

  // Map images — never expose uploaded_by.
  const detailImages: PropertyDetailImage[] = (images ?? []).map(
    (img: { id: string; storage_path: string; position: number; is_primary: boolean }) => ({
      id: img.id,
      storagePath: img.storage_path,
      position: img.position,
      isPrimary: img.is_primary,
    }),
  );

  return {
    id: prop.id,
    universityId: prop.university_id,
    area: prop.area,
    description: prop.description,
    landlordFirstName,
    rooms: detailRooms,
    images: detailImages,
    isVerified,
  };
}

// ── Universities list (public) ─────────────────────────────────────────────

/**
 * `universities.list` — API_CONTRACTS.md §4.
 *
 * Returns id, name, city, state for isActive = true universities only.
 * Public — no authentication required.
 */
export async function listUniversitiesCore(
  db: SupabaseDbClient,
): Promise<{
  universities: Array<{ id: string; name: string; city: string; state: string }>;
}> {
  const { data, error } = await db
    .from("universities")
    .select("id, name, city, state")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw internalError("Could not retrieve universities.", {
      phase: "listUniversities",
      error,
    });
  }

  return { universities: (data ?? []) as Array<{ id: string; name: string; city: string; state: string }> };
}
