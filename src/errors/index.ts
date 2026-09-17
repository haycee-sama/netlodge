/**
 * Standardized error model for NetLodge.
 *
 * Implements API_CONTRACTS §19 — every contract returns errors in this exact
 * shape. Phase 0 defines the type and the constructor; specific error codes
 * are used by Server Actions and Route Handlers in later phases.
 *
 *   {
 *     "error": {
 *       "code": "string (machine-readable, stable)",
 *       "message": "string (human-readable, safe to display)",
 *       "details": [ { "field": "string", "issue": "string" } ]   // validation only
 *     }
 *   }
 *
 * Never exposed in `message` or `details`:
 *   - database error text
 *   - stack traces
 *   - internal file/module paths
 *   - Supabase/Paystack raw error payloads
 *   - secrets
 *   - any detail that distinguishes "exists but unauthorized" from "doesn't exist"
 */
import type { ValidationErrorDetail } from "@/validation";

export type ErrorCode =
  | "validation_error"
  | "unauthenticated"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "expired_reservation"
  | "room_unavailable"
  | "invalid_state_transition"
  | "payment_failed"
  | "rate_limited"
  | "internal_error"
  // Internal-only — never returned to a browser client. Logged server-side.
  | "webhook_verification_failed"
  // Phase 0 only — used by stubs not yet implemented.
  | "not_implemented";

export type HttpEquivalentStatus =
  | 400
  | 401
  | 402
  | 403
  | 404
  | 409
  | 429
  | 500
  | 501;

export const ERROR_CODE_TO_STATUS: Record<ErrorCode, HttpEquivalentStatus> = {
  validation_error: 400,
  unauthenticated: 401,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  expired_reservation: 409,
  room_unavailable: 409,
  invalid_state_transition: 409,
  payment_failed: 402,
  rate_limited: 429,
  internal_error: 500,
  not_implemented: 501,
  webhook_verification_failed: 500, // never client-facing
};

export interface AppErrorShape {
  code: ErrorCode;
  message: string;
  details?: ValidationErrorDetail[];
  // Optional `reason` sub-code for `conflict` (API_CONTRACTS §19).
  reason?: string;
}

export interface SerializedError {
  error: AppErrorShape;
}

/**
 * `AppError` is thrown from Server Actions / Route Handlers and is caught by
 * the closest error boundary or handler wrapper. It serializes into the
 * standardized response shape — never leaks internal details.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: HttpEquivalentStatus;
  readonly details?: ValidationErrorDetail[];
  readonly reason?: string;

  constructor(params: {
    code: ErrorCode;
    message: string;
    details?: ValidationErrorDetail[];
    reason?: string;
    // Optional internal-only context for server-side logging — never serialized
    // into the client response. Use sparingly; for unhandled errors only.
    internalContext?: unknown;
  }) {
    super(params.message);
    this.name = "AppError";
    this.code = params.code;
    this.httpStatus = ERROR_CODE_TO_STATUS[params.code];
    this.details = params.details;
    this.reason = params.reason;
    // Capture internal context for server-side logging without exposing it.
    // The field is intentionally not enumerable on the serialized response.
    Object.defineProperty(this, "internalContext", {
      value: params.internalContext,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }

  serialize(): SerializedError {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
        ...(this.reason ? { reason: this.reason } : {}),
      },
    };
  }
}

/**
 * Convenience constructors — keep Server Action code readable.
 */
export const validationError = (
  message: string,
  details: ValidationErrorDetail[],
): AppError =>
  new AppError({
    code: "validation_error",
    message,
    details,
  });

export const forbiddenError = (message = "You do not have permission to do this."): AppError =>
  new AppError({ code: "forbidden", message });

export const unauthenticatedError = (
  message = "You need to be signed in to do this.",
): AppError => new AppError({ code: "unauthenticated", message });

export const notFoundError = (message = "Not found."): AppError =>
  new AppError({ code: "not_found", message });

export const conflictError = (
  message: string,
  reason?: string,
): AppError => new AppError({ code: "conflict", message, reason });

export const internalError = (
  message = "Something went wrong. Please try again shortly.",
  internalContext?: unknown,
): AppError =>
  new AppError({
    code: "internal_error",
    message,
    internalContext,
  });

export const notImplementedError = (
  message = "This capability is not yet implemented.",
): AppError => new AppError({ code: "not_implemented", message });
