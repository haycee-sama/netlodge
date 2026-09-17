/**
 * Discovery validation schemas (Zod) — Phase 6.
 *
 * Per API_CONTRACTS.md §4 + §2 conventions:
 *   - universityId is REQUIRED for search
 *   - area is free-text (ilike match)
 *   - minPrice/maxPrice are in kobo (minor units)
 *   - roomType is text (DATABASE_SCHEMA.md §26: constrained text, not enum)
 *   - sort is a single string from an allow-list: price_asc, price_desc, newest
 *   - pagination is offset/limit
 *
 * All schemas use `.strict()` to reject unknown fields.
 */
import { z } from "zod";
import { uuidSchema, moneyMinorUnitsSchema } from "@/validation";

// ── Sort allow-list ─────────────────────────────────────────────────────────

export const discoverySortSchema = z.enum(["price_asc", "price_desc", "newest"]);
export type DiscoverySort = z.infer<typeof discoverySortSchema>;

// ── Search rooms ────────────────────────────────────────────────────────────

/**
 * `properties.search` — API_CONTRACTS.md §4.
 *
 * Returns ROOMS (not properties) where the parent property status = 'approved'
 * AND the room is_listed = true.
 *
 * universityId is REQUIRED — it's the primary segmentation unit for the
 * entire launch strategy (PRODUCT_BRIEF §9).
 *
 * area is free-text (ilike match on properties.area).
 * minPrice/maxPrice are in kobo (minor units) — the API layer converts
 * to/from naira at the boundary (API_CONTRACTS.md §2).
 * roomType is text (constrained text, not enum — DATABASE_SCHEMA.md §26).
 */
export const searchRoomsSchema = z
  .object({
    universityId: uuidSchema,
    area: z.string().trim().max(200).optional(),
    minPrice: moneyMinorUnitsSchema.optional(),
    maxPrice: moneyMinorUnitsSchema.optional(),
    roomType: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sort: discoverySortSchema.default("newest"),
  })
  .strict()
  .refine(
    (data) => {
      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        return data.minPrice <= data.maxPrice;
      }
      return true;
    },
    { message: "minPrice must not exceed maxPrice." },
  );

export type SearchRoomsInput = z.infer<typeof searchRoomsSchema>;

// ── Property detail ─────────────────────────────────────────────────────────

/**
 * `properties.get` — API_CONTRACTS.md §4.
 *
 * Returns full property detail + its bookable rooms + images + verification
 * badge (computed from landlords.verification_valid_until > now()).
 *
 * Only returns the property if its status = 'approved' (publication
 * visibility). A direct URL to an unapproved property must NOT reveal it.
 */
export const getPropertyDetailSchema = z
  .object({
    propertyId: uuidSchema,
  })
  .strict();

export type GetPropertyDetailInput = z.infer<typeof getPropertyDetailSchema>;

// ── Result types ────────────────────────────────────────────────────────────

export interface SearchResultRoom {
  roomId: string;
  propertyId: string;
  area: string;
  description: string;
  roomType: string;
  priceKobo: number;
  occupancy: number;
  amenities: string[];
  universityId: string;
  hasPrimaryImage: boolean;
  primaryImagePath: string | null;
}

export interface SearchRoomsResult {
  items: SearchResultRoom[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface PropertyDetailRoom {
  id: string;
  roomType: string;
  priceKobo: number;
  occupancy: number;
  amenities: string[];
}

export interface PropertyDetailImage {
  id: string;
  storagePath: string;
  position: number;
  isPrimary: boolean;
}

export interface PropertyDetailResult {
  id: string;
  universityId: string;
  area: string;
  description: string;
  landlordFirstName: string | null;
  rooms: PropertyDetailRoom[];
  images: PropertyDetailImage[];
  isVerified: boolean;
}

// ── Verified badge computation ─────────────────────────────────────────────

/**
 * Compute whether a landlord's verification is currently valid.
 *
 * Per IMPLEMENTATION_PLAN.md §9 + API_CONTRACTS.md §4:
 *   "badge only shown while verificationValidUntil > now()"
 *
 * This is a SERVER-SIDE computation — never trust a client-provided
 * `verified` boolean. The `verification_valid_until` timestamp comes
 * from the database (set on approval, 6 months out — PRODUCT_BRIEF §9).
 *
 * Returns true only if:
 *   - verification_valid_until IS NOT NULL (never approved → null → false)
 *   - verification_valid_until > now() (expired → false)
 *
 * Note: per the strict `>` comparison, a timestamp exactly equal to
 * now() is NOT valid — the badge disappears at the exact moment of
 * expiry, not one second after.
 */
export function isVerificationCurrentlyValid(
  verificationValidUntil: string | null,
): boolean {
  if (!verificationValidUntil) return false;
  const expiry = new Date(verificationValidUntil);
  const now = new Date();
  return expiry.getTime() > now.getTime();
}
