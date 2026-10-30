import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateOrigin } from "@/lib/security/api-security";
import { getSiteUrl } from "@/lib/config/site";

/**
 * POST /api/notifications/send-email
 *
 * Internal endpoint called after a notification is created to send an
 * email if the user has email_enabled = true in their notification
 * preferences.
 *
 * Body: { userId, type, title, body, href }
 *
 * Uses Resend (https://resend.com) — requires RESEND_API_KEY env var.
 * If the key is not set, the endpoint returns 200 silently (email
 * sending is optional — the in-app notification is still created).
 *
 * Required env vars:
 *   RESEND_API_KEY     — API key from resend.com (set this to enable email)
 *   RESEND_FROM_EMAIL  — Verified sender address (defaults to notifications@netlodge.com)
 *   NEXT_PUBLIC_SITE_URL — Used for links in the email body
 */
export async function POST(request: NextRequest) {
  // CSRF protection
  const originError = validateOrigin(request);
  if (originError) return originError;

  try {
    const body = await request.json();
    const { userId, type, title, body: notifBody, href } = body;

    if (!userId || !title) {
      return NextResponse.json({ error: "userId and title are required" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "notifications@netlodge.com";

    // If no API key is configured, silently skip — the in-app notification
    // is still created. This allows the app to work without email.
    if (!apiKey) {
      return NextResponse.json({ success: true, emailSent: false, reason: "RESEND_API_KEY not configured" });
    }

    const supabase = await createClient();

    // Check if the user has email notifications enabled
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("email_enabled")
      .eq("user_id", userId)
      .single();

    // If no prefs row, default to email_enabled = true (the DB default)
    const emailEnabled = prefs?.email_enabled ?? true;
    if (!emailEnabled) {
      return NextResponse.json({ success: true, emailSent: false, reason: "User has email notifications disabled" });
    }

    // Get the user's email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, first_name")
      .eq("id", userId)
      .single();

    if (!profile?.email) {
      return NextResponse.json({ success: true, emailSent: false, reason: "No email address on file" });
    }

    // Send the email via Resend
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const siteUrl = getSiteUrl();
    const link = href ? `${siteUrl}${href}` : siteUrl;

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:#107a57;padding:24px 32px;">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">NetLodge</h1>
            <p style="margin:4px 0 0;color:#dcffea;font-size:13px;">Verified student housing, protected payments</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:18px;">${escapeHtml(title)}</h2>
            <p style="margin:0 0 24px;color:#4a4a4a;font-size:15px;line-height:1.6;">${escapeHtml(notifBody ?? "")}</p>
            <a href="${link}" style="display:inline-block;background:#107a57;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">View on NetLodge</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #eee;">
            <p style="margin:0;color:#999;font-size:12px;text-align:center;">
              You're receiving this email because you have email notifications enabled.<br>
              <a href="${siteUrl}/settings" style="color:#999;">Manage notification preferences</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const { error: sendError } = await resend.emails.send({
      from: `NetLodge <${fromEmail}>`,
      to: profile.email,
      subject: title,
      html,
    });

    if (sendError) {
      console.error("[email] Resend error:", sendError.message);
      return NextResponse.json({ success: true, emailSent: false, reason: sendError.message });
    }

    return NextResponse.json({ success: true, emailSent: true });
  } catch (err) {
    console.error("[email] Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ success: true, emailSent: false, reason: "Internal error" });
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
