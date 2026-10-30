/**
 * Server-side helper to send an email notification after an in-app
 * notification is created via the create_notification RPC.
 *
 * This is fire-and-forget — it does not throw or block. If the email
 * service is not configured (no RESEND_API_KEY), it silently skips.
 *
 * Usage from server-side code (API routes, webhook handlers):
 *
 *   await sendEmailNotification({
 *     userId, type, title, body, href
 *   });
 *
 * Required env vars (for email to actually send):
 *   RESEND_API_KEY     — API key from resend.com
 *   RESEND_FROM_EMAIL  — Verified sender address
 *   NEXT_PUBLIC_SITE_URL — Used for links in the email
 */

import { getSiteUrl } from "@/lib/config/site";

interface EmailNotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
}

export async function sendEmailNotification(params: EmailNotificationParams): Promise<void> {
  try {
    // Fire-and-forget — don't block the caller
    const baseUrl = getSiteUrl();
    await fetch(`${baseUrl}/api/notifications/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {
    // Non-fatal — the in-app notification is still created
  }
}
