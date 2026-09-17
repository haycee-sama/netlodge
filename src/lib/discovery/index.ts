/**
 * Discovery shared types + re-exports.
 *
 * Phase 6 — public type surface for the discovery domain.
 */
export type {
  DiscoverySort,
  SearchRoomsInput,
  GetPropertyDetailInput,
  SearchResultRoom,
  SearchRoomsResult,
  PropertyDetailRoom,
  PropertyDetailImage,
  PropertyDetailResult,
} from "./schemas";

export {
  discoverySortSchema,
  searchRoomsSchema,
  getPropertyDetailSchema,
  isVerificationCurrentlyValid,
} from "./schemas";
