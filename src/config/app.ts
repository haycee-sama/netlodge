/**
 * Public, application-wide runtime configuration constants.
 *
 * Phase 0 baseline. Add to this file only for genuinely global constants —
 * domain-specific configuration (Paystack timeouts, file-size limits, hold
 * windows) belongs to the domain module that owns it, not here.
 *
 * Per TECHNICAL_ARCHITECTURE §11, §7, §41: hold-window duration, file-size
 * ceilings, and rate-limit thresholds are implementation-detail configuration
 * values decided during the relevant later phase. They are NOT set here yet —
 * setting placeholder numbers would create the false impression they are
 * authoritative.
 */
export const APP_NAME = "NetLodge" as const;

/**
 * Default page size for paginated listing queries (TECHNICAL_ARCHITECTURE §27).
 * Routes may override locally for a justified reason (e.g., admin tables with
 * denser rows), but this is the default.
 */
export const DEFAULT_PAGE_SIZE = 20 as const;
