/**
 * Server-only Reviews Server Actions — Phase 11.
 *
 * Thin Next.js Server Action wrappers around the pure functions in
 * `./core.ts`. Creates real Supabase clients and delegates to the core.
 *
 * The `server-only` import guard at the top of this file makes it
 * impossible to import these actions from a Client Component at build time.
 */
import "server-only";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { requireAuthenticated, requireAccountActive } from "@/server/auth/authorize";
import {
  createReviewCore,
  listReviewsForRoomCore,
  updateOwnReviewCore,
  deleteOwnReviewCore,
  hideReviewCore,
  unhideReviewCore,
  listReviewsAdminCore,
} from "@/server/reviews/core";
import type { ReviewListResult } from "@/lib/reviews/schemas";

// ── Student: create review ───────────────────────────────────────────────────

export async function createReview(input: unknown): Promise<{ reviewId: string }> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return createReviewCore(db, user, input);
}

// ── Public: list reviews for room ────────────────────────────────────────────

export async function listReviewsForRoom(input: unknown): Promise<ReviewListResult> {
  const db = await createSessionClient();
  return listReviewsForRoomCore(db, input);
}

// ── Student: update own review ───────────────────────────────────────────────

export async function updateOwnReview(input: unknown): Promise<void> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return updateOwnReviewCore(db, user, input);
}

// ── Student: delete own review ───────────────────────────────────────────────

export async function deleteOwnReview(input: unknown): Promise<void> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return deleteOwnReviewCore(db, user, input);
}

// ── Admin: hide / unhide review ──────────────────────────────────────────────

export async function hideReview(input: unknown): Promise<void> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return hideReviewCore(db, user, input);
}

export async function unhideReview(input: unknown): Promise<void> {
  const user = await requireAccountActive();
  const db = await createSessionClient();
  return unhideReviewCore(db, user, input);
}

// ── Admin: list all reviews (including hidden) ──────────────────────────────

export async function listReviewsAdmin(input: unknown): Promise<ReviewListResult> {
  const user = await requireAuthenticated();
  const db = await createSessionClient();
  return listReviewsAdminCore(db, user, input);
}
