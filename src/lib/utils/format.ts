/**
 * Currency and money helpers.
 *
 * Backend-facing monetary values are integer kobo. Display helpers convert
 * kobo to NGN strings for the UI. We never use floating-point math for money.
 */

/** Format an integer kobo value as a NGN string for display. */
export function formatNgn(kobo: number, options?: { withSymbol?: boolean }): string {
  const ngn = Math.round(kobo) / 100;
  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(ngn);
  const withSymbol = options?.withSymbol ?? true;
  return withSymbol ? `₦${formatted}` : formatted;
}

/** Compact format for large numbers, e.g. ₦1.2M, ₦450K. */
export function formatNgnCompact(kobo: number): string {
  const ngn = Math.round(kobo) / 100;
  if (ngn >= 1_000_000) {
    return `₦${(ngn / 1_000_000).toFixed(ngn % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (ngn >= 1_000) {
    return `₦${Math.round(ngn / 1_000)}K`;
  }
  return `₦${Math.round(ngn)}`;
}

/** Convert a NGN amount (number) entered in a form to kobo (integer). */
export function ngnToKobo(ngn: number): number {
  return Math.round(ngn * 100);
}

/** Convert kobo back to NGN for form display. */
export function koboToNgn(kobo: number): number {
  return kobo / 100;
}

/** Format a date string (ISO) in a friendly en-NG format. */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-NG", options).format(d);
}

/** Format a date with time. */
export function formatDateTime(date: string | Date): string {
  return formatDate(date, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Relative-time formatter (e.g. "3 days ago"). */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 60) return "just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  if (day < 30) return `${Math.round(day / 7)} week${day < 14 ? "" : "s"} ago`;
  return formatDate(d);
}

/** Generate a URL-friendly slug from arbitrary text. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Generate a pseudo-random ID — for client-side optimistic UI only. */
export function generateId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Generate a human-readable reference like NLG-BKG-7XQK4L. */
export function generateReference(prefix = "NLG"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${s}`;
}

/** Initials helper for avatars. */
export function initials(first?: string, last?: string): string {
  const f = (first ?? "").trim().charAt(0).toUpperCase();
  const l = (last ?? "").trim().charAt(0).toUpperCase();
  return `${f}${l}` || "U";
}

/** Truncate text to a maximum length, adding an ellipsis. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

/** Format a phone number in the common Nigerian style. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 13 && digits.startsWith("234")) {
    return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return phone;
}
