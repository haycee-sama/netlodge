/**
 * Centralized contact configuration.
 *
 * These values are read from NEXT_PUBLIC_ env vars. If an env var is not
 * set, the corresponding field is null and the UI omits that contact
 * channel rather than displaying an unverified default.
 *
 * Do NOT add fallback defaults here — displaying a fabricated email,
 * phone, or address as operational business contact info would mislead
 * users. The only exception is the support email used in the contact
 * form's error message, which needs a value to be actionable.
 */

export const SUPPORT_EMAIL: string | null =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? null;

export const SUPPORT_PHONE: string | null =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? null;

export const BUSINESS_ADDRESS: string | null =
  process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? null;

/**
 * Email used in the contact form's error message when ticket creation
 * fails for anonymous users. Falls back to support@netlodge.com only
 * because an error message with no email is not actionable. This does
 * NOT appear as a displayed contact detail in the footer or sidebar.
 */
export const FALLBACK_SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@netlodge.com";
