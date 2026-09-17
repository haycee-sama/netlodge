/**
 * Server-only Booking Server Actions — Phase 7.
 */
import "server-only";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { requireAuthenticated, requireAccountActive } from "@/server/auth/authorize";
import { assertRateLimit } from "@/server/ratelimit";
import { getClientIp } from "@/server/auth/client-ip";
import {
  createBookingCore,
  getBookingCore,
  listOwnBookingsCore,
  listBookingsForPropertyCore,
  cancelBookingCore,
} from "@/server/bookings/core";
import type {
  BookingResult,
  BookingListResult,
} from "@/lib/bookings/schemas";

export async function createBooking(input: unknown): Promise<{ bookingId: string }> {
  // Phase 12 — rate-limit bookings.create per API_CONTRACTS.md §22
  // (prevent scripted room-hoarding/availability-exhaustion attempts).
  // IP-based limit: 20 per minute per IP.
  // Account-based limit: 5 per minute per authenticated student.
  const clientIp = await getClientIp();
  await assertRateLimit("bookings.create", `ip:${clientIp}`, 20, 60_000);

  const user = await requireAccountActive();
  await assertRateLimit("bookings.create", `account:${user.id}`, 5, 60_000);

  const db = await createSessionClient();
  return createBookingCore(db, user, input);
}

export async function getBooking(input: unknown): Promise<BookingResult> {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return getBookingCore(db, user, input);
}

export async function listOwnBookings(input: unknown): Promise<BookingListResult> {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return listOwnBookingsCore(db, user, input);
}

export async function listBookingsForProperty(input: unknown): Promise<BookingListResult> {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return listBookingsForPropertyCore(db, user, input);
}

export async function cancelBooking(input: unknown): Promise<void> {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return cancelBookingCore(db, user, input);
}
