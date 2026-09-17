/**
 * Notification dispatch core — Phase 11.
 *
 * This module is the SINGLE entry point for sending notifications from
 * application code. It enforces the critical safety property per
 * IMPLEMENTATION_PLAN.md §16:
 *
 *   "Notification failure must not break the underlying business transaction."
 *
 * ARCHITECTURE:
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │  Server Action (e.g., approveVerification)                       │
 *   │                                                                  │
 *   │  1. RPC call (DB transaction begins, mutates + audit_logs)      │
 *   │  2. RPC commits (business state + audit row durable)             │
 *   │  3. await dispatchNotification({...})   ← this module             │
 *   │     ↓                                                            │
 *   │     a. Lookup recipient's email from `profiles` (server-derived) │
 *   │     b. Render template                                            │
 *   │     c. await provider.sendEmail(...)                              │
 *   │     d. Catch any throw → log, set outcome='provider_error'        │
 *   │     e. Return NotificationResult                                  │
 *   │                                                                  │
 *   │  The Server Action NEVER throws because of dispatchNotification.  │
 *   │  Even if the email provider is unreachable, the business state   │
 *   │  (committed in step 2) is unaffected.                              │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * CRITICAL RULES:
 *
 *   1. `dispatchNotification` MUST be called AFTER the DB transaction
 *      commits — never inside it. The caller is responsible for the
 *      ordering (the Server Action wrappers enforce this).
 *
 *   2. `dispatchNotification` NEVER rethrows provider errors. The result
 *      shape includes `outcome: 'provider_error'` for observability, but
 *      the caller sees a Promise<NotificationResult> that resolves, never
 *      rejects.
 *
 *   3. Recipient identity is ALWAYS server-derived — `recipientUserId`
 *      is a UUID passed in by the Server Action (which derived it from
 *      the authenticated session or the affected business entity). The
 *      notification module looks up the email address from `profiles`
 *      via the privileged Supabase client — never accepts `recipientEmail`
 *      from the client.
 *
 *   4. `reference` is a deterministic per-event identifier (event +
 *      recipientUserId + businessEntityId) — used for provider-side
 *      deduplication if the provider supports it. NOTE: NetLodge does
 *      NOT do its own deduplication at this phase (notification delivery
 *      is best-effort per PRD §15 + API_CONTRACTS.md §18); the `reference`
 *      is sent to the provider for their own deduplication.
 */
import "server-only";
import type { EmailProvider, NotificationEvent, NotificationResult } from "@/server/notifications/types";
import { getDefaultEmailProvider } from "@/server/notifications/providers";
import { createPrivilegedClient } from "@/server/supabase/privileged";
import * as templates from "@/server/notifications/templates";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseDbClient = { from(table: string): any };

// ── Dispatch ────────────────────────────────────────────────────────────────

/**
 * Dispatch a single notification. Resolves (never rejects) with a
 * `NotificationResult` describing the outcome.
 *
 * The caller is the Server Action — it has already committed the
 * business mutation and is now dispatching the notification as a
 * post-commit side effect.
 *
 * @param payload.event — one of the closed NotificationEvent set.
 * @param payload.recipientUserId — server-derived UUID; the module
 *   looks up the email address from `profiles` via the privileged client.
 *   NEVER accepts `recipientEmail` from the client.
 * @param payload.data — event-specific payload (see templates.ts).
 * @param opts.provider — optional injected provider (used by tests to
 *   force failure). If not provided, the default provider is used.
 * @param opts.db — optional injected Supabase client (used by tests
 *   to avoid hitting the real Supabase project). If not provided, the
 *   privileged client is used.
 */
export async function dispatchNotification(
  payload: {
    event: NotificationEvent;
    recipientUserId: string;
    data: Record<string, unknown>;
  },
  opts?: {
    provider?: EmailProvider;
    db?: SupabaseDbClient;
  },
): Promise<NotificationResult> {
  const provider = opts?.provider ?? getDefaultEmailProvider();
  const db = opts?.db ?? createPrivilegedClient();

  // 1. Render the template FIRST — if the event is unknown, we skip the
  //    recipient lookup entirely (avoids unnecessary DB work for an
  //    invalid event).
  const template = renderTemplate(payload.event, payload.data);
  if (!template) {
    return {
      outcome: "unknown_event",
      event: payload.event,
      recipientUserId: payload.recipientUserId,
      internalContext: { reason: "no template registered for event" },
    };
  }

  // 2. Look up the recipient's email from auth.users.
  //    The recipientUserId is server-derived — the lookup is the
  //    authoritative source of the email address. A client NEVER supplies
  //    the email; only the UUID, and only via the Server Action.
  //
  //    In a real Supabase deployment, this would use
  //    `supabase.auth.admin.getUserById(recipientUserId)` to fetch the
  //    email. For pglite tests, the auth-stub exposes `auth.users.email`.
  //    The `profiles` table does NOT have an `email` column (per Phase 1
  //    migration 0002) — email is on `auth.users`, not `profiles`.
  let recipientEmail: string | null = null;
  try {
    const { data, error } = await db
      .from("auth.users")
      .select("email")
      .eq("id", payload.recipientUserId)
      .maybeSingle();

    if (error) {
      console.error("[netlodge.notifications] recipient lookup failed", {
        recipientUserId: payload.recipientUserId,
        error,
      });
    } else if (data) {
      recipientEmail = (data as { email?: string | null }).email ?? null;
    }
  } catch (err) {
    console.error("[netlodge.notifications] recipient lookup threw", {
      recipientUserId: payload.recipientUserId,
      error: err,
    });
  }

  if (!recipientEmail) {
    return {
      outcome: "no_recipient_email",
      event: payload.event,
      recipientUserId: payload.recipientUserId,
      internalContext: { reason: "profile lookup returned no email" },
    };
  }

  // 3. Compose the unique reference. Provider uses this for its own dedup.
  // Format: <event>:<recipientUserId>:<businessEntityId-or-timestamp>
  const businessEntityId =
    (payload.data.bookingId as string | undefined) ??
    (payload.data.propertyId as string | undefined) ??
    (payload.data.verificationId as string | undefined) ??
    (payload.data.reportId as string | undefined) ??
    (payload.data.reviewId as string | undefined) ??
    "no-entity";
  const reference = `${payload.event}:${payload.recipientUserId}:${businessEntityId}`;

  // 4. Send the email. CRITICAL: any throw from the provider is caught
  //    here and surfaced as outcome='provider_error'. The caller never
  //    sees the throw — the business mutation committed BEFORE this
  //    function was called.
  try {
    await provider.sendEmail({
      to: recipientEmail,
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody,
      reference,
    });
    return {
      outcome: "sent",
      event: payload.event,
      recipientUserId: payload.recipientUserId,
      internalContext: { reference },
    };
  } catch (err) {
    // CRITICAL: do NOT rethrow. Log server-side, return outcome.
    console.error("[netlodge.notifications] email provider failed", {
      event: payload.event,
      recipientUserId: payload.recipientUserId,
      reference,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      outcome: "provider_error",
      event: payload.event,
      recipientUserId: payload.recipientUserId,
      internalContext: {
        reference,
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

// ── Template dispatch ───────────────────────────────────────────────────────

function renderTemplate(
  event: NotificationEvent,
  data: Record<string, unknown>,
): { subject: string; htmlBody: string; textBody: string } | null {
  switch (event) {
    case "landlord_verification.approved":
      return templates.landlordVerificationApprovedEmail(
        data as { landlordFullName: string; validUntil: string | null },
      );
    case "landlord_verification.rejected":
      return templates.landlordVerificationRejectedEmail(
        data as { landlordFullName: string; reason: string },
      );
    case "property.approved":
      return templates.propertyApprovedEmail(
        data as { landlordFullName: string; propertyArea: string },
      );
    case "property.rejected":
      return templates.propertyRejectedEmail(
        data as { landlordFullName: string; propertyArea: string; reason: string },
      );
    case "property.suspended":
      return templates.propertySuspendedEmail(
        data as { landlordFullName: string; propertyArea: string; reason: string },
      );
    case "property.suspension_lifted":
      return templates.propertySuspensionLiftedEmail(
        data as { landlordFullName: string; propertyArea: string; reason: string },
      );
    case "payment.success.student":
      return templates.paymentSuccessStudentEmail(
        data as {
          studentFullName: string;
          amountNaira: string;
          propertyArea: string;
          bookingId: string;
        },
      );
    case "payment.success.landlord":
      return templates.paymentSuccessLandlordEmail(
        data as {
          landlordFullName: string;
          studentFullName: string;
          amountNaira: string;
          propertyArea: string;
          bookingId: string;
        },
      );
    case "booking.cancelled.student":
      return templates.bookingCancelledStudentEmail(
        data as {
          studentFullName: string;
          propertyArea: string;
          reason: string | null;
          cancelledBy: "student" | "landlord" | "admin";
        },
      );
    case "booking.cancelled.landlord":
      return templates.bookingCancelledLandlordEmail(
        data as {
          landlordFullName: string;
          studentFullName: string;
          propertyArea: string;
          reason: string | null;
        },
      );
    case "booking.expired.student":
      return templates.bookingExpiredStudentEmail(
        data as { studentFullName: string; propertyArea: string },
      );
    case "report.resolved":
      return templates.reportResolvedEmail(
        data as {
          reporterFullName: string;
          outcome: "action_taken" | "no_action" | "other";
          resolutionNotes: string;
        },
      );
    case "review.hidden":
      return templates.reviewHiddenEmail(
        data as { studentFullName: string; reason: string },
      );
    case "review.unhidden":
      return templates.reviewUnhiddenEmail(
        data as { studentFullName: string; reason: string },
      );
    default:
      // Exhaustiveness check — TypeScript will flag any new NotificationEvent
      // that's not handled here.
      return null;
  }
}

// ── Batch dispatch (multiple recipients, same event) ─────────────────────────

/**
 * Convenience wrapper for "send the same notification to multiple recipients".
 * Each recipient is dispatched independently — a failure for one recipient
 * does NOT affect the others.
 *
 * Returns one NotificationResult per recipient.
 */
export async function dispatchNotifications(
  event: NotificationEvent,
  recipients: Array<{ recipientUserId: string; data: Record<string, unknown> }>,
  opts?: { provider?: EmailProvider; db?: SupabaseDbClient },
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];
  for (const r of recipients) {
    // Sequential — emails aren't expected to be high-volume at MVP scale.
    // If concurrency becomes necessary, this can be Promise.all'd.
    const result = await dispatchNotification(
      { event, recipientUserId: r.recipientUserId, data: r.data },
      opts,
    );
    results.push(result);
  }
  return results;
}
