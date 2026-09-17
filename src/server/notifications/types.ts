/**
 * Notification types — Phase 11.
 *
 * Defines the closed set of business events that trigger notifications,
 * per API_CONTRACTS.md §18 + IMPLEMENTATION_PLAN.md §16 + PRD §15.
 *
 * Each event has a defined:
 *   - recipient (server-derived — never client-supplied)
 *   - subject template
 *   - data shape (the variables interpolated into the email body)
 *
 * NO client-controlled fields are accepted anywhere in this module.
 * Recipients are always looked up from the authenticated profile or
 * the affected business entity (e.g., the landlord who owns a property).
 */
import type { AuthenticatedUser } from "@/lib/auth";

// ── Event type ───────────────────────────────────────────────────────────────

/**
 * Closed enum of notification events. Adding a new event requires:
 *   1. Adding it here.
 *   2. Defining a template in `templates.ts`.
 *   3. Wiring the dispatch call into the relevant Server Action.
 *
 * This is the single source of truth for "what notifications exist".
 */
export type NotificationEvent =
  // Verification decisions → email landlord.
  | "landlord_verification.approved"
  | "landlord_verification.rejected"
  // Property decisions → email landlord.
  | "property.approved"
  | "property.rejected"
  | "property.suspended"
  | "property.suspension_lifted"
  // Payment success → email student + landlord.
  | "payment.success.student"
  | "payment.success.landlord"
  // Booking lifecycle → email student (and landlord on cancel).
  | "booking.cancelled.student"
  | "booking.cancelled.landlord"
  | "booking.expired.student"
  // Report resolved → email reporter.
  | "report.resolved"
  // Review moderation → email author (the student who wrote the review).
  | "review.hidden"
  | "review.unhidden";

// ── Event payload ───────────────────────────────────────────────────────────

/**
 * The shape of a notification dispatch request. The `recipientUserId` is
 * ALWAYS a server-derived UUID — the email address is resolved by the
 * notification module itself by looking up `profiles` via the privileged
 * client. The client NEVER supplies `recipientEmail`.
 *
 * `data` is a per-event payload — its shape is event-specific (see
 * `templates.ts` for the per-event template definitions).
 */
export interface NotificationPayload<D = Record<string, unknown>> {
  event: NotificationEvent;
  recipientUserId: string;
  data: D;
}

// ── Email provider boundary ─────────────────────────────────────────────────

/**
 * Provider-neutral email adapter. Implemented by:
 *   - `ConsoleEmailProvider` — default dev/test impl (logs to console,
 *     never sends a real email). Used when no real provider is configured.
 *   - `HttpEmailProvider` — production impl that calls a generic HTTP API
 *     (e.g., Resend, SendGrid, Postmark) with the EMAIL_PROVIDER_API_KEY.
 *     Provider-specific code is isolated inside this implementation — the
 *     business logic only ever calls `sendEmail()`.
 *
 * Tests inject a `MockEmailProvider` that can be configured to throw
 * on demand — this is how the failure-isolation test forces the
 * notification boundary to fail without affecting the business mutation.
 */
export interface EmailProvider {
  /**
   * Send an email. MUST be idempotent per the contract below — calling
   * twice with the same payload MUST NOT produce two real deliveries.
   *
   * The implementation is responsible for:
   *   - retrying transient failures (best-effort, bounded)
   *   - never blocking the caller indefinitely
   *   - surfacing terminal failures via `throw`
   *
   * The CALLER is responsible for:
   *   - isolating the throw from the already-committed business transaction
   *     (the caller NEVER calls sendEmail inside the DB transaction — see
   *     `dispatchNotification` below).
   *
   * @throws Error on terminal failure (provider unreachable, auth rejected,
   *   hard bounce, etc.). The caller logs and swallows the error — the
   *   business mutation is already committed and is NOT affected.
   */
  sendEmail(params: {
    to: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    reference: string; // unique per (event, recipientUserId, businessEntityId)
  }): Promise<void>;
}

// ── Notification outcome (for logging / observability) ──────────────────────

export type NotificationOutcome =
  | "sent"
  | "provider_error"
  | "no_recipient_email"
  | "unknown_event";

export interface NotificationResult {
  outcome: NotificationOutcome;
  event: NotificationEvent;
  recipientUserId: string;
  // Optional internal context for server-side logging only — never returned
  // to the client. Contains error text on failure, provider response on success.
  internalContext?: unknown;
}

// Re-export AuthenticatedUser type for convenience.
export type { AuthenticatedUser };
