/**
 * Email providers — Phase 11 + Phase 13.
 *
 * Three implementations of the `EmailProvider` interface:
 *
 *   1. `ConsoleEmailProvider` — default for dev/test. Logs the email to
 *      console but never sends a real email.
 *
 *   2. `HttpEmailProvider` — calls a generic HTTP API (Resend, SendGrid,
 *      Postmark) with the EMAIL_PROVIDER_API_KEY.
 *
 *   3. `SmtpEmailProvider` — Phase 13 addition. Uses `nodemailer` to send
 *      via any SMTP server (Mailtrap, Amazon SES, Gmail, etc.). Preferred
 *      when SMTP_HOST + SMTP_USER + SMTP_PASS are configured.
 *
 * Tests inject a mock provider — this is the "mocked provider contract
 * behavior" called out in the Phase 11 prompt §32.
 */
import "server-only";
import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import { env } from "@/config/env";
import type { EmailProvider } from "@/server/notifications/types";

// ── ConsoleEmailProvider ────────────────────────────────────────────────────

/**
 * Dev/test provider. Logs to console — never sends a real email.
 *
 * Used as the default when EMAIL_PROVIDER_API_KEY is unset (the dev
 * environment), and as the fallback base for tests that need to observe
 * dispatch attempts.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(params: {
    to: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    reference: string;
  }): Promise<void> {
    // Console logging is intentional — this is the dev/test provider.
    // The reference is logged so tests can assert "the right event
    // was dispatched" without inspecting email contents.
    console.log("[netlodge.email] (console provider)", {
      to: params.to,
      subject: params.subject,
      reference: params.reference,
    });
  }
}

// ── HttpEmailProvider ───────────────────────────────────────────────────────

/**
 * Production provider. Calls a generic HTTP email API.
 *
 * Endpoint + auth are configured via env vars. The implementation is
 * provider-neutral — any provider that accepts `POST /` with
 * `{ to, subject, html, text }` and `Authorization: Bearer <key>`
 * works (Resend, SendGrid v3 with a small adapter, etc.).
 *
 * NEVER bundled into the browser — the `server-only` import guard
 * above enforces this. The EMAIL_PROVIDER_API_KEY is never exposed via
 * a NEXT_PUBLIC_ variable.
 */
export class HttpEmailProvider implements EmailProvider {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly fromAddress: string;

  constructor(opts?: { endpoint?: string; apiKey?: string; fromAddress?: string }) {
    this.endpoint =
      opts?.endpoint ?? process.env.EMAIL_PROVIDER_ENDPOINT ?? "";
    this.apiKey = opts?.apiKey ?? env.EMAIL_PROVIDER_API_KEY;
    this.fromAddress =
      opts?.fromAddress ?? process.env.EMAIL_FROM_ADDRESS ?? "no-reply@netlodge.app";
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    reference: string;
  }): Promise<void> {
    if (!this.endpoint) {
      // No endpoint configured — fall back to console logging rather than
      // crashing. This is the production equivalent of "no email provider
      // configured yet" — the business mutation is already committed
      // (dispatch happens AFTER commit), so this is purely a notification-
      // side failure that gets logged.
      console.warn(
        "[netlodge.email] HttpEmailProvider: no EMAIL_PROVIDER_ENDPOINT configured — falling back to console",
        { reference: params.reference, to: params.to },
      );
      return;
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: [params.to],
        subject: params.subject,
        html: params.htmlBody,
        text: params.textBody,
        // reference is sent as a custom header / metadata so the provider
        // can dedupe on their side (most providers support this).
        tags: [{ name: "reference", value: params.reference }],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Email provider returned ${response.status}: ${text.slice(0, 200)}`,
      );
    }
  }
}

// ── SmtpEmailProvider ────────────────────────────────────────────────────────

/**
 * SMTP-based email provider — Phase 13.
 *
 * Uses `nodemailer` to send via any SMTP server. Compatible with:
 *   - Mailtrap (sandbox testing — catches emails in a mailbox, never delivers)
 *   - Amazon SES (production)
 *   - SendGrid SMTP
 *   - Gmail (not recommended for production)
 *
 * Preferred when SMTP_HOST + SMTP_USER + SMTP_PASS are configured.
 * The `server-only` import guard ensures this module (and therefore the
 * SMTP credentials) never reach the browser bundle.
 */
export class SmtpEmailProvider implements EmailProvider {
  private transporter: Transporter;

  constructor(opts?: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    fromAddress?: string;
  }) {
    const host = opts?.host ?? env.SMTP_HOST;
    const port = opts?.port ?? parseInt(env.SMTP_PORT, 10);
    const user = opts?.user ?? env.SMTP_USER;
    const pass = opts?.pass ?? env.SMTP_PASS;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587/2525
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    reference: string;
  }): Promise<void> {
    const fromAddress = env.SMTP_FROM_ADDRESS;

    await this.transporter.sendMail({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.htmlBody,
      text: params.textBody,
      // headers for dedup / tracking
      headers: {
        "X-NetLodge-Reference": params.reference,
      },
    });
  }
}

// ── Factory: get the default provider for the current environment ────────────

let defaultProvider: EmailProvider | null = null;

/**
 * Returns the default EmailProvider for the current environment.
 *
 * Priority (first match wins):
 *   1. SMTP_HOST + SMTP_USER + SMTP_PASS configured → SmtpEmailProvider
 *   2. EMAIL_PROVIDER_ENDPOINT or EMAIL_PROVIDER_API_KEY → HttpEmailProvider
 *   3. Otherwise → ConsoleEmailProvider (dev/test fallback)
 *
 * The result is cached as a module singleton — provider instantiation is
 * idempotent and safe to reuse across requests.
 */
export function getDefaultEmailProvider(): EmailProvider {
  if (defaultProvider) {
    return defaultProvider;
  }

  // Phase 13 — prefer SMTP when configured (Mailtrap, SES, etc.)
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    defaultProvider = new SmtpEmailProvider();
    return defaultProvider;
  }

  // Fall back to HTTP API provider (Resend, SendGrid, etc.)
  if (process.env.EMAIL_PROVIDER_ENDPOINT || env.EMAIL_PROVIDER_API_KEY) {
    defaultProvider = new HttpEmailProvider();
    return defaultProvider;
  }

  // Dev/test fallback — logs to console, never sends.
  defaultProvider = new ConsoleEmailProvider();
  return defaultProvider;
}

/**
 * Test-only escape hatch: override the default provider. Tests use this
 * to inject a `ThrowingEmailProvider` for the failure-isolation tests.
 *
 * NEVER call this from production code — it's exported only so tests
 * can mock the provider. ESLint's no-restricted-syntax could pin this
 * to test files only in a future hardening pass.
 */
export function _setTestEmailProvider(provider: EmailProvider | null): void {
  defaultProvider = provider;
}
