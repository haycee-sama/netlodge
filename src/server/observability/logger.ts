/**
 * Structured logging — Phase 12 observability module.
 *
 * Per IMPLEMENTATION_PLAN.md §19 + API_CONTRACTS.md §18:
 *
 *   Minimum viable observability:
 *     - unhandled errors (stack trace, server-side only)
 *     - payment failures and webhook processing outcomes (every event)
 *     - booking-creation conflicts (low severity)
 *     - scheduled job execution results (row-count, success/failure)
 *     - authorization failures (abuse-pattern visibility)
 *     - every admin action via `audit_logs` itself (already covered structurally)
 *
 *   NEVER LOGGED:
 *     - passwords (never touch app code)
 *     - verification document contents / live signed URLs (only storage path
 *       references in access-controlled admin-readable tables)
 *     - secrets / API keys
 *     - full payment card details (never reach the app)
 *
 * Architecture:
 *   This module provides a provider-neutral `logEvent()` function. The
 *   default sink is `console` (JSON-line formatted for production log
 *   aggregation: Vercel built-in, Datadog, etc.). Tests can inject a
 *   recording sink for assertions.
 *
 *   This is NOT a dedicated APM/observability platform — per
 *   TECHNICAL_ARCHITECTURE.md §28, MVP scale doesn't justify one.
 */
import "server-only";

// ── Event types ──────────────────────────────────────────────────────────────

export type LogSeverity =
  | "debug"
  | "info"
  | "warn"
  | "error";

export type LogCategory =
  | "auth"
  | "authorization"
  | "payment"
  | "webhook"
  | "booking"
  | "verification"
  | "property"
  | "storage"
  | "notification"
  | "admin"
  | "job"
  | "system";

export interface LogEntry {
  timestamp: string; // ISO 8601
  severity: LogSeverity;
  category: LogCategory;
  event: string;
  message: string;
  // Optional structured context — NEVER include secrets, passwords,
  // verification document contents, payment card data, or full webhook
  // payloads (those belong in `payment_webhook_events.raw_payload`,
  // a separate admin-only-readable table, not the general log stream).
  context?: Record<string, unknown>;
}

// ── Sink interface ──────────────────────────────────────────────────────────

export interface LogSink {
  write(entry: LogEntry): void;
}

// ── Default sink: console (JSON-line formatted) ──────────────────────────────

class ConsoleLogSink implements LogSink {
  write(entry: LogEntry): void {
    // The structured JSON-line format is intentionally compatible with
    // Vercel's built-in log aggregation and most third-party log shippers.
    // We use console.warn/error for severity >= warn so the platform's
    // alerting can route them; info/debug go to console.log.
    const line = JSON.stringify(entry);
    if (entry.severity === "error") {
      console.error(line);
    } else if (entry.severity === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}

// ── Test sink: captures entries for assertions ──────────────────────────────

export class RecordingLogSink implements LogSink {
  public entries: LogEntry[] = [];

  write(entry: LogEntry): void {
    this.entries.push(entry);
  }

  reset(): void {
    this.entries = [];
  }

  filter(category: LogCategory, event?: string): LogEntry[] {
    return this.entries.filter(
      (e) => e.category === category && (!event || e.event === event),
    );
  }
}

// ── Sink management ──────────────────────────────────────────────────────────

let activeSink: LogSink = new ConsoleLogSink();

/**
 * Get the active log sink. Defaults to ConsoleLogSink.
 */
export function getLogSink(): LogSink {
  return activeSink;
}

/**
 * Override the active log sink — used by tests to inject a RecordingLogSink.
 *
 * NEVER call this from production code — exported for test-only use.
 */
export function setLogSink(sink: LogSink | null): void {
  activeSink = sink ?? new ConsoleLogSink();
}

// ── Sensitive-field redaction ─────────────────────────────────────────────────

/**
 * Field names that are NEVER logged, regardless of context. The redaction
 * is applied recursively to nested objects.
 *
 * This is the documented Phase 12 §19 requirement: "Never logged, verified
 * explicitly: passwords, verification document contents or live signed URLs,
 * secrets, full payment card details."
 */
const REDACTED_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
  "serviceRoleKey",
  "paystackSecretKey",
  "paystackWebhookSecret",
  "emailProviderApiKey",
  "supabaseServiceRoleKey",
  "cardNumber",
  "cvv",
  "cardDetails",
  // Verification document contents — only storage path references are OK
  // in admin-readable tables, never in the general log stream.
  "documentContent",
  "documentBody",
  "signedUrl",
]);

function redact(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (REDACTED_KEYS.has(key)) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = redact(val);
    }
  }
  return result;
}

// ── Public logEvent function ─────────────────────────────────────────────────

/**
 * Emit a structured log entry. This is the SINGLE entry point for
 * application logging — all `console.log`/`console.error` calls in
 * application code should be replaced with `logEvent()` over time.
 *
 * The entry is written to the active sink (default: console, JSON-line
 * formatted). Sensitive fields in `context` are automatically redacted.
 *
 * @example
 *   logEvent("warn", "authorization", "forbidden",
 *     "Non-admin attempted admin operation",
 *     { actorId: user.id, operation: "approveVerification" });
 */
export function logEvent(
  severity: LogSeverity,
  category: LogCategory,
  event: string,
  message: string,
  context?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    severity,
    category,
    event,
    message,
    context: context ? (redact(context) as Record<string, unknown>) : undefined,
  };
  activeSink.write(entry);
}

// ── Convenience helpers ──────────────────────────────────────────────────────

export const log = {
  debug(category: LogCategory, event: string, message: string, context?: Record<string, unknown>): void {
    logEvent("debug", category, event, message, context);
  },
  info(category: LogCategory, event: string, message: string, context?: Record<string, unknown>): void {
    logEvent("info", category, event, message, context);
  },
  warn(category: LogCategory, event: string, message: string, context?: Record<string, unknown>): void {
    logEvent("warn", category, event, message, context);
  },
  error(category: LogCategory, event: string, message: string, context?: Record<string, unknown>): void {
    logEvent("error", category, event, message, context);
  },
};
