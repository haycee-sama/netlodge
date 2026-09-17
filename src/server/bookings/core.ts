/**
 * Booking core — testable pure functions for reservation operations.
 *
 * Phase 7 — implements `bookings.create`, `bookings.get`, `bookings.listOwn`,
 * `bookings.listForProperty`, `bookings.cancel` per API_CONTRACTS.md §9.
 *
 * CRITICAL CONCURRENCY PROPERTY:
 *   The `createBookingCore` function attempts an INSERT into the bookings
 *   table. The partial unique index `one_active_booking_per_room`
 *   (migration 0007) is THE race-safety mechanism. If two concurrent
 *   requests try to book the same room, PostgreSQL serializes the
 *   inserts — exactly one commits, the other gets a unique-violation
 *   error. This function catches that specific error and returns
 *   `conflict`/`room_unavailable`.
 *
 *   The server-side pre-check (is the room bookable?) is a UX optimization
 *   to return a fast, clean error in the common case — NOT the safety
 *   mechanism. The partial unique index is the safety mechanism.
 *
 * CANCELLATION RULES (per API_CONTRACTS.md §9):
 *   - Student: can cancel own booking if status = 'confirmed'. Reason optional.
 *   - Landlord: can cancel bookings on own properties if status = 'confirmed'. Reason required.
 *   - Admin: can cancel any booking if status = 'confirmed'. Reason required.
 *   - The state-machine trigger enforces: only confirmed → cancelled is allowed
 *     for non-system actors.
 */
import {
  validationError,
  forbiddenError,
  notFoundError,
  conflictError,
  internalError,
} from "@/errors";
import type { AuthenticatedUser } from "@/lib/auth";
import { formatZodError } from "@/validation";
import {
  createBookingSchema,
  getBookingSchema,
  listOwnBookingsSchema,
  listBookingsForPropertySchema,
  cancelBookingSchema,
} from "@/lib/bookings/schemas";
import type {
  BookingResult,
  BookingListResult,
} from "@/lib/bookings/schemas";

// ── Types ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseDbClient = { from(table: string): any };

// ── Hold window configuration ──────────────────────────────────────────────

/**
 * Hold window duration in minutes. Per IMPLEMENTATION_PLAN.md §11:
 * "hold-window length (e.g., 15 minutes) is a configuration value, not
 * fixed by any source document". 15 minutes is the documented default.
 */
const HOLD_WINDOW_MINUTES = 15;

// ── Create booking ─────────────────────────────────────────────────────────

export async function createBookingCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<{ bookingId: string }> {
  if (user.profile.role !== "student") {
    throw forbiddenError("Only students can create bookings.");
  }
  if (user.profile.accountStatus === "suspended") {
    throw forbiddenError("Your account is suspended.");
  }

  const parsed = createBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid booking input.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // 1. Pre-check: room exists + is listed + parent property is approved AND
  // not suspended. This is a UX optimization — the actual safety is the
  // partial unique index. If we skip this check, the INSERT still fails
  // correctly (the student can't book an unlisted room), but the error
  // is less clear.
  //
  // Phase 10 — adds `properties.is_suspended = false` check, since
  // suspended properties are hidden from discovery and unbookable (PRD
  // §19, API_CONTRACTS.md §8). Existing confirmed bookings on a property
  // that gets suspended mid-tenancy remain honored — only NEW bookings
  // are blocked.
  const { data: room, error: roomErr } = await db
    .from("rooms")
    .select(`
      id,
      price,
      is_listed,
      property_id,
      properties!inner (
        id,
        landlord_id,
        status,
        is_suspended
      )
    `)
    .eq("id", input.roomId)
    .maybeSingle();

  if (roomErr) {
    throw internalError("Could not check room availability.", {
      phase: "createBooking.roomCheck",
      error: roomErr,
    });
  }

  if (!room) {
    throw notFoundError("Room not found.");
  }

  // Check room is listed + property is approved AND not suspended.
  if (
    !room.is_listed ||
    room.properties.status !== "approved" ||
    room.properties.is_suspended === true
  ) {
    throw conflictError("This room is not currently available.", "room_unavailable");
  }

  // 2. Attempt the INSERT. The partial unique index will catch races.
  const holdExpiresAt = new Date(
    Date.now() + HOLD_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  const { data, error } = await db
    .from("bookings")
    .insert({
      room_id: input.roomId,
      property_id: room.property_id,
      landlord_id: room.properties.landlord_id,
      student_id: user.id, // ← derived from session, never from input
      status: "reservation_pending",
      reserved_price: parseFloat(room.price), // snapshot of current price
      hold_expires_at: holdExpiresAt,
    })
    .select("id")
    .single();

  if (error) {
    // Check if this is a unique-constraint violation (the race condition).
    const msg = (error.message ?? "").toLowerCase();
    if (
      msg.includes("unique constraint") ||
      msg.includes("duplicate key") ||
      msg.includes("one_active_booking_per_room")
    ) {
      // The room was just reserved by someone else — translate to clean error.
      throw conflictError(
        "This room was just reserved by someone else.",
        "room_unavailable",
      );
    }
    // Other errors — generic internal error.
    throw internalError("Could not create booking.", {
      phase: "createBooking.insert",
      error,
    });
  }

  return { bookingId: data.id };
}

// ── Get booking ─────────────────────────────────────────────────────────────

export async function getBookingCore(
  db: SupabaseDbClient,
  _user: AuthenticatedUser,
  rawInput: unknown,
): Promise<BookingResult> {
  const parsed = getBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid booking request.", formatZodError(parsed.error));
  }

  // RLS will enforce: student sees own, landlord sees own-property, admin sees all.
  const { data, error } = await db
    .from("bookings")
    .select(`
      id, room_id, property_id, student_id, status, reserved_price,
      hold_expires_at, confirmed_at, cancelled_at, cancellation_reason,
      created_at, updated_at
    `)
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (error) {
    throw internalError("Could not retrieve booking.", {
      phase: "getBooking",
      error,
    });
  }

  if (!data) {
    throw notFoundError("Booking not found.");
  }

  return mapBookingRow(data);
}

// ── List own bookings (student) ────────────────────────────────────────────

export async function listOwnBookingsCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<BookingListResult> {
  if (user.profile.role !== "student") {
    throw forbiddenError("Only students can list own bookings.");
  }

  const parsed = listOwnBookingsSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw validationError("Invalid listing parameters.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  let query = db
    .from("bookings")
    .select(`
      id, room_id, property_id, student_id, status, reserved_price,
      hold_expires_at, confirmed_at, cancelled_at, cancellation_reason,
      created_at, updated_at
    `, { count: "exact" })
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .range(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize - 1,
    );

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw internalError("Could not retrieve bookings.", {
      phase: "listOwnBookings",
      error,
    });
  }

  return {
    items: (data ?? []).map(mapBookingRow),
    page: input.page,
    pageSize: input.pageSize,
    totalCount: count ?? 0,
  };
}

// ── List bookings for property (landlord) ──────────────────────────────────

export async function listBookingsForPropertyCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<BookingListResult> {
  if (user.profile.role !== "landlord" && user.profile.role !== "admin") {
    throw forbiddenError("Only landlords or admins can view property bookings.");
  }

  const parsed = listBookingsForPropertySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid listing parameters.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // RLS will enforce: landlord only sees bookings on own properties.
  const { data, error, count } = await db
    .from("bookings")
    .select(`
      id, room_id, property_id, student_id, status, reserved_price,
      hold_expires_at, confirmed_at, cancelled_at, cancellation_reason,
      created_at, updated_at
    `, { count: "exact" })
    .eq("property_id", input.propertyId)
    .order("created_at", { ascending: false })
    .range(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize - 1,
    );

  if (error) {
    throw internalError("Could not retrieve bookings.", {
      phase: "listBookingsForProperty",
      error,
    });
  }

  return {
    items: (data ?? []).map(mapBookingRow),
    page: input.page,
    pageSize: input.pageSize,
    totalCount: count ?? 0,
  };
}

// ── Cancel booking ─────────────────────────────────────────────────────────

export async function cancelBookingCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  const parsed = cancelBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid cancellation request.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // Authorization rules (per API_CONTRACTS.md §9):
  // - Student: can cancel own booking, reason optional.
  // - Landlord: can cancel bookings on own properties, reason required.
  // - Admin: can cancel any booking, reason required.
  //
  // The state-machine trigger enforces: only confirmed → cancelled.
  // RLS enforces: student/landlord can only UPDATE rows they own.

  // For landlord/admin, reason is required.
  if (
    (user.profile.role === "landlord" || user.profile.role === "admin") &&
    !input.reason
  ) {
    throw validationError("Cancellation reason is required.", [
      { field: "reason", issue: "Reason is required for landlord/admin cancellations." },
    ]);
  }

  // Look up the booking to check status (for a better error message).
  const { data: booking, error: bookingErr } = await db
    .from("bookings")
    .select("id, status, student_id, landlord_id")
    .eq("id", input.bookingId)
    .maybeSingle();

  if (bookingErr) {
    throw internalError("Could not retrieve booking.", {
      phase: "cancelBooking.lookup",
      error: bookingErr,
    });
  }

  if (!booking) {
    throw notFoundError("Booking not found.");
  }

  // Check status — only confirmed can be cancelled.
  if (booking.status !== "confirmed") {
    throw conflictError(
      `Cannot cancel a booking with status '${booking.status}'. Only confirmed bookings can be cancelled.`,
      "invalid_state_transition",
    );
  }

  // Perform the cancellation. The state-machine trigger will validate
  // confirmed → cancelled. RLS enforces ownership.
  const { error } = await db
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancellation_reason: input.reason ?? null,
    })
    .eq("id", input.bookingId);

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("status transition") || msg.includes("check_violation")) {
      throw conflictError(
        "Invalid booking status transition.",
        "invalid_state_transition",
      );
    }
    throw internalError("Could not cancel booking.", {
      phase: "cancelBooking.update",
      error,
    });
  }

  // Phase 11 — dispatch cancellation notifications AFTER the cancel commits.
  // Recipients: student + landlord (PRD §15 / IMPLEMENTATION_PLAN.md §16).
  try {
    const { data: cancelled } = await db
      .from("bookings")
      .select(
        `id, student_id, landlord_id,
         rooms ( property_id, properties ( area ) )`,
      )
      .eq("id", input.bookingId)
      .maybeSingle();

    if (cancelled) {
      const b = cancelled as {
        id: string;
        student_id: string;
        landlord_id: string;
        rooms?: { properties?: { area?: string } };
      };
      const propertyArea = b.rooms?.properties?.area ?? "";
      const cancelledByActor =
        user.profile.role === "student"
          ? ("student" as const)
          : user.profile.role === "landlord"
            ? ("landlord" as const)
            : ("admin" as const);

      const [studentProfile, landlordProfile] = await Promise.all([
        db.from("profiles").select("full_name").eq("id", b.student_id).maybeSingle(),
        db.from("profiles").select("full_name").eq("id", b.landlord_id).maybeSingle(),
      ]);

      const { dispatchNotification } = await import("@/server/notifications/core");

      // Student — always notified on cancellation.
      await dispatchNotification({
        event: "booking.cancelled.student",
        recipientUserId: b.student_id,
        data: {
          studentFullName:
            (studentProfile.data as { full_name?: string } | null)?.full_name ??
            "Student",
          propertyArea,
          reason: input.reason ?? null,
          cancelledBy: cancelledByActor,
        },
      });

      // Landlord — notified on cancellation (any actor).
      await dispatchNotification({
        event: "booking.cancelled.landlord",
        recipientUserId: b.landlord_id,
        data: {
          landlordFullName:
            (landlordProfile.data as { full_name?: string } | null)?.full_name ??
            "Landlord",
          studentFullName:
            (studentProfile.data as { full_name?: string } | null)?.full_name ??
            "Student",
          propertyArea,
          reason: input.reason ?? null,
        },
      });
    }
  } catch (err) {
    console.error("[netlodge] post-cancel notification dispatch failed", {
      bookingId: input.bookingId,
      error: err,
    });
  }
}

// ── Helper: map DB row to result ───────────────────────────────────────────

function mapBookingRow(raw: unknown): BookingResult {
  const r = raw as {
    id: string;
    room_id: string;
    property_id: string;
    student_id: string;
    status: string;
    reserved_price: string;
    hold_expires_at: string;
    confirmed_at: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    created_at: string;
    updated_at: string;
  };

  // Convert naira (numeric(12,2)) to kobo (integer).
  const priceKobo = Math.round(parseFloat(r.reserved_price) * 100);

  return {
    id: r.id,
    roomId: r.room_id,
    propertyId: r.property_id,
    studentId: r.student_id,
    status: r.status,
    reservedPriceKobo: priceKobo,
    holdExpiresAt: r.hold_expires_at,
    confirmedAt: r.confirmed_at,
    cancelledAt: r.cancelled_at,
    cancellationReason: r.cancellation_reason,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
