/**
 * Shared, non-generated type re-exports.
 *
 * Phase 0 keeps this minimal. Domain-specific types (Booking, Property, Room,
 * etc.) are added in the relevant later phase alongside the schema migration
 * that defines them — never invent a type for an entity whose database shape
 * is not yet finalized.
 *
 * The single Phase 0 type is the standardized error shape, re-exported here
 * so consumers don't have to import directly from `src/errors`.
 */
export type {
  AppErrorShape,
  ErrorCode,
  SerializedError,
} from "@/errors";

export type { Database } from "./database.generated";
