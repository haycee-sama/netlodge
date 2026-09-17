/**
 * Server-only Discovery Server Actions — Phase 6.
 *
 * Thin Next.js Server Action wrapper around the pure functions in
 * `./core.ts`. Creates real Supabase clients and delegates to the core.
 *
 * The `server-only` import guard prevents client-side usage.
 */
import "server-only";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import {
  searchRoomsCore,
  getPropertyDetailCore,
  listUniversitiesCore,
} from "@/server/discovery/core";
import type {
  SearchRoomsResult,
  PropertyDetailResult,
} from "@/lib/discovery/schemas";

/**
 * `properties.search` — API_CONTRACTS.md §4.
 *
 * Public — no authentication required (RLS allows anon read of approved
 * properties + listed rooms). Uses the session-scoped server client so
 * RLS policies apply.
 */
export async function searchRooms(
  input: unknown,
): Promise<SearchRoomsResult> {
  const db = await createSessionClient();
  return searchRoomsCore(db, input);
}

/**
 * `properties.get` — API_CONTRACTS.md §4.
 *
 * Public — no authentication required.
 */
export async function getPropertyDetail(
  input: unknown,
): Promise<PropertyDetailResult> {
  const db = await createSessionClient();
  return getPropertyDetailCore(db, input);
}

/**
 * `universities.list` — API_CONTRACTS.md §4.
 *
 * Public — no authentication required.
 */
export async function listUniversities(): Promise<{
  universities: Array<{ id: string; name: string; city: string; state: string }>;
}> {
  const db = await createSessionClient();
  return listUniversitiesCore(db);
}
