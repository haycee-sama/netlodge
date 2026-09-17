/**
 * Reviews core — testable pure functions for student reviews.
 *
 * Phase 11 — implements `reviews.create`, `reviews.listForRoom`,
 * `reviews.updateOwn`, `reviews.deleteOwn` per API_CONTRACTS.md §14 +
 * DATABASE_SCHEMA.md §16 + PRD §17.
 *
 * CRITICAL SECURITY PROPERTIES:
 *
 *   1. Student identity is ALWAYS derived from the authenticated session
 *      (`AuthenticatedUser.id`) — NEVER from the request body. The Zod
 *      schemas use `.strict()` so a payload with `studentId` is rejected
 *      at the validation layer.
 *
 *   2. Review eligibility is enforced at the DB level via the
 *      `reviews_check_booking_completed` trigger (migration 0010):
 *      - the referenced booking must exist
 *      - the booking's student_id MUST match the review's student_id
 *      - the booking's status MUST be 'completed'
 *      This trigger fires BEFORE INSERT and rejects with `check_violation`
 *      on any failure. The application layer additionally checks this
 *      upfront (for a better error message), but the trigger is the
 *      actual safety guarantee.
 *
 *   3. One review per booking — enforced by `UNIQUE(booking_id)` constraint
 *      (migration 0010). A second INSERT for the same booking fails with
 *      a unique-violation, surfaced as `conflict`/`already_reviewed`.
 *
 *   4. Author-only mutation — `reviews.updateOwn` and `reviews.deleteOwn`
 *      use the session-scoped client + RLS to enforce ownership.
 *      `reviews.RLS` (migration 0010) only allows `student_id = auth.uid()`
 *      for INSERT/UPDATE/DELETE.
 *
 *   5. Hidden columns are admin-only — `is_hidden` + `hidden_reason` are
 *      guarded by the `guard_reviews_hidden_columns` trigger. A student
 *      editing their own review cannot set `is_hidden` (the column-guard
 *      trigger raises `check_violation`).
 *
 *   6. Public visibility — `reviews.listForRoom` returns only non-hidden
 *      reviews. RLS enforces this via the `reviews_public_read` policy.
 *      Hidden reviews are invisible to anon/authenticated-public; only
 *      the author and admins can see them.
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
  createReviewSchema,
  listReviewsForRoomSchema,
  updateOwnReviewSchema,
  deleteOwnReviewSchema,
  adminListReviewsSchema,
} from "@/lib/reviews/schemas";
import type {
  ReviewRow,
  ReviewListResult,
} from "@/lib/reviews/schemas";

export type SupabaseDbClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(fn: string, params?: Record<string, unknown>): any;
};

// ── Create review ────────────────────────────────────────────────────────────

export async function createReviewCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<{ reviewId: string }> {
  // 1. Authorization — students only (PRD §17: only a student with a
  //    completed booking may review).
  if (user.profile.role !== "student") {
    throw forbiddenError("Only students can create reviews.");
  }
  if (user.profile.accountStatus === "suspended") {
    throw forbiddenError("Your account is suspended.");
  }

  // 2. Validate input.
  const parsed = createReviewSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid review.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // 3. Pre-check: booking exists, owned by caller, status = completed.
  //    This is a UX optimization — the actual safety is the DB trigger.
  const { data: booking, error: bookingErr } = await db
    .from("bookings")
    .select("id, status, room_id, student_id")
    .eq("id", input.bookingId)
    .maybeSingle();

  if (bookingErr) {
    throw internalError("Could not verify booking eligibility.", {
      phase: "createReview.bookingLookup",
      error: bookingErr,
    });
  }

  if (!booking) {
    throw notFoundError("Booking not found.");
  }

  // Ownership check (the DB trigger also enforces this).
  if (booking.student_id !== user.id) {
    throw forbiddenError("You can only review your own bookings.");
  }

  // Completed-status check (the DB trigger also enforces this).
  if (booking.status !== "completed") {
    throw conflictError(
      `Cannot review a booking in status '${booking.status}'. Only completed bookings can be reviewed.`,
      "invalid_state_transition",
    );
  }

  // 4. Attempt the INSERT. The DB trigger validates completed-status +
  //    ownership; the UNIQUE(booking_id) constraint catches duplicates.
  const { data, error } = await db
    .from("reviews")
    .insert({
      booking_id: input.bookingId,
      student_id: user.id, // ← derived from session, never from input
      room_id: booking.room_id, // ← denormalized from the booking
      rating: input.rating,
      content: input.content,
    })
    .select("id")
    .single();

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("unique constraint") || msg.includes("duplicate key")) {
      throw conflictError(
        "You have already reviewed this booking.",
        "already_reviewed",
      );
    }
    if (msg.includes("check_violation") || msg.includes("cannot review")) {
      throw conflictError(
        "This booking is not eligible for review.",
        "invalid_state_transition",
      );
    }
    throw internalError("Could not create review.", {
      phase: "createReview.insert",
      error,
    });
  }

  return { reviewId: data.id };
}

// ── List reviews for room (public, non-hidden only) ─────────────────────────

export async function listReviewsForRoomCore(
  db: SupabaseDbClient,
  rawInput: unknown,
): Promise<ReviewListResult> {
  const parsed = listReviewsForRoomSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid list request.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // RLS enforces: only non-hidden reviews visible to anon/authenticated.
  // No actor checks needed — this is a public read.
  const { data, error, count } = await db
    .from("reviews")
    .select("id, booking_id, room_id, rating, content, created_at, updated_at", {
      count: "exact",
    })
    .eq("room_id", input.roomId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .range(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize - 1,
    );

  if (error) {
    throw internalError("Could not retrieve reviews.", {
      phase: "listReviewsForRoom",
      error,
    });
  }

  return {
    items: (data ?? []).map((raw: unknown) => {
      const r = raw as {
        id: string;
        booking_id: string;
        room_id: string;
        rating: number;
        content: string;
        created_at: string;
        updated_at: string;
      };
      return {
        id: r.id,
        bookingId: r.booking_id,
        roomId: r.room_id,
        rating: r.rating,
        content: r.content,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    }),
    page: input.page,
    pageSize: input.pageSize,
    totalCount: count ?? 0,
  };
}

// ── Update own review (student author only) ──────────────────────────────────

export async function updateOwnReviewCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "student") {
    throw forbiddenError("Only students can edit their own reviews.");
  }
  if (user.profile.accountStatus === "suspended") {
    throw forbiddenError("Your account is suspended.");
  }

  const parsed = updateOwnReviewSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid update.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // RLS enforces student_id = auth.uid() — the UPDATE only succeeds if the
  // caller owns the review. The column-guard trigger blocks attempts to
  // change is_hidden/hidden_reason (admin-only).
  const { error } = await db
    .from("reviews")
    .update({
      rating: input.rating,
      content: input.content,
    })
    .eq("id", input.reviewId);

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("check_violation") || msg.includes("only admins")) {
      throw forbiddenError("You cannot modify moderation fields.");
    }
    throw internalError("Could not update review.", {
      phase: "updateOwnReview",
      error,
    });
  }
}

// ── Delete own review (student author only — hard delete) ────────────────────

export async function deleteOwnReviewCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "student") {
    throw forbiddenError("Only students can delete their own reviews.");
  }
  if (user.profile.accountStatus === "suspended") {
    throw forbiddenError("Your account is suspended.");
  }

  const parsed = deleteOwnReviewSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid delete request.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  // RLS enforces ownership. Hard delete acceptable per DATABASE_SCHEMA.md §20.
  const { error } = await db
    .from("reviews")
    .delete()
    .eq("id", input.reviewId);

  if (error) {
    throw internalError("Could not delete review.", {
      phase: "deleteOwnReview",
      error,
    });
  }
}

// ── Admin: hide review (atomic, audited) ─────────────────────────────────────

export async function hideReviewCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can hide reviews.");
  }

  const parsed = zHideSchemaSafeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid hide request.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  const { error } = await db.rpc("admin_hide_review", {
    p_review_id: input.reviewId,
    p_reason: input.reason,
  });

  if (error) {
    translateReviewRpcError(error, "Could not hide review.", "hideReview");
  }

  // Phase 11 — dispatch review-hidden notification AFTER the RPC commits.
  try {
    const { data: review } = await db
      .from("reviews")
      .select("student_id")
      .eq("id", input.reviewId)
      .maybeSingle();
    const { data: studentProfile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", review?.student_id ?? "")
      .maybeSingle();

    if (review?.student_id) {
      const { dispatchNotification } = await import("@/server/notifications/core");
      await dispatchNotification({
        event: "review.hidden",
        recipientUserId: review.student_id,
        data: {
          studentFullName: studentProfile?.full_name ?? "Student",
          reason: input.reason,
        },
      }, { db });
    }
  } catch (err) {
    console.error("[netlodge] post-hide-review notification dispatch failed", {
      reviewId: input.reviewId,
      error: err,
    });
  }
}

// ── Admin: unhide review ─────────────────────────────────────────────────────

export async function unhideReviewCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<void> {
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can unhide reviews.");
  }

  const parsed = zUnhideSchemaSafeParse(rawInput);
  if (!parsed.success) {
    throw validationError("Invalid unhide request.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  const { error } = await db.rpc("admin_unhide_review", {
    p_review_id: input.reviewId,
    p_reason: input.reason,
  });

  if (error) {
    translateReviewRpcError(error, "Could not unhide review.", "unhideReview");
  }

  // Phase 11 — dispatch review-unhidden notification AFTER the RPC commits.
  try {
    const { data: review } = await db
      .from("reviews")
      .select("student_id")
      .eq("id", input.reviewId)
      .maybeSingle();
    const { data: studentProfile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", review?.student_id ?? "")
      .maybeSingle();

    if (review?.student_id) {
      const { dispatchNotification } = await import("@/server/notifications/core");
      await dispatchNotification({
        event: "review.unhidden",
        recipientUserId: review.student_id,
        data: {
          studentFullName: studentProfile?.full_name ?? "Student",
          reason: input.reason,
        },
      }, { db });
    }
  } catch (err) {
    console.error("[netlodge] post-unhide-review notification dispatch failed", {
      reviewId: input.reviewId,
      error: err,
    });
  }
}

// ── Admin: list all reviews (including hidden) ──────────────────────────────

export async function listReviewsAdminCore(
  db: SupabaseDbClient,
  user: AuthenticatedUser,
  rawInput: unknown,
): Promise<ReviewListResult> {
  if (user.profile.role !== "admin") {
    throw forbiddenError("Only admins can list all reviews.");
  }

  const parsed = adminListReviewsSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw validationError("Invalid admin list request.", formatZodError(parsed.error));
  }
  const input = parsed.data;

  let query = db
    .from("reviews")
    .select(
      "id, booking_id, room_id, rating, content, is_hidden, hidden_reason, created_at, updated_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize - 1,
    );

  if (input.roomId) {
    query = query.eq("room_id", input.roomId);
  }
  if (input.studentId) {
    query = query.eq("student_id", input.studentId);
  }
  if (input.hiddenOnly) {
    query = query.eq("is_hidden", true);
  }

  const { data, error, count } = await query;

  if (error) {
    throw internalError("Could not retrieve reviews.", {
      phase: "listReviewsAdmin",
      error,
    });
  }

  return {
    items: (data ?? []).map((raw: unknown) => {
      const r = raw as {
        id: string;
        booking_id: string;
        room_id: string;
        rating: number;
        content: string;
        is_hidden: boolean;
        hidden_reason: string | null;
        created_at: string;
        updated_at: string;
      };
      return {
        id: r.id,
        bookingId: r.booking_id,
        roomId: r.room_id,
        rating: r.rating,
        content: r.content,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    }),
    page: input.page,
    pageSize: input.pageSize,
    totalCount: count ?? 0,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Local wrappers — avoid circular import with the schema module.
import {
  hideReviewSchema as _hideSchema,
  unhideReviewSchema as _unhideSchema,
} from "@/lib/reviews/schemas";

function zHideSchemaSafeParse(raw: unknown) {
  return _hideSchema.safeParse(raw);
}
function zUnhideSchemaSafeParse(raw: unknown) {
  return _unhideSchema.safeParse(raw);
}

function translateReviewRpcError(
  err: { message?: string; code?: string } | undefined,
  fallbackMessage: string,
  fallbackPhase: string,
): never {
  if (!err) {
    throw internalError(fallbackMessage, { phase: fallbackPhase });
  }
  const msg = err.message ?? "";
  const code = err.code ?? "";

  if (code === "42501" || msg.includes("insufficient_privilege") || msg.includes("Only active admins")) {
    throw forbiddenError("You do not have permission to do this.");
  }
  if (msg.includes("reason is required") || msg.includes("2000 characters")) {
    throw validationError("Invalid reason.", [
      { field: "reason", issue: msg },
    ]);
  }
  if (code === "23514" || msg.includes("check_violation") || msg.includes("already hidden") || msg.includes("not currently hidden")) {
    throw conflictError(msg || "Invalid state transition.", "invalid_state_transition");
  }
  if (code === "23503" || msg.includes("not found")) {
    throw notFoundError("Review not found.");
  }
  throw internalError(fallbackMessage, { phase: fallbackPhase, error: err });
}

export type { ReviewRow, ReviewListResult };
