/**
 * Server-only discovery boundary — public API.
 * Phase 6 — re-exports the core + Server Actions.
 */
import "server-only";

export type { SupabaseDbClient } from "./core";

export {
  searchRoomsCore,
  getPropertyDetailCore,
  listUniversitiesCore,
} from "./core";

export {
  searchRooms,
  getPropertyDetail,
  listUniversities,
} from "./actions";
