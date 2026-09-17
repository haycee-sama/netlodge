/**
 * Server-only booking boundary — public API.
 * Phase 7 — re-exports the core + Server Actions.
 */
import "server-only";

export type { SupabaseDbClient } from "./core";

export {
  createBookingCore,
  getBookingCore,
  listOwnBookingsCore,
  listBookingsForPropertyCore,
  cancelBookingCore,
} from "./core";

export {
  createBooking,
  getBooking,
  listOwnBookings,
  listBookingsForProperty,
  cancelBooking,
} from "./actions";
