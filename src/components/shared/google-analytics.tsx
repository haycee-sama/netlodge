"use client";

import * as React from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * Google Analytics 4 integration.
 *
 * - Only loads when NEXT_PUBLIC_GA_MEASUREMENT_ID is set
 * - Tracks page views on route changes (App Router)
 * - Excludes admin/auth/private routes from tracking
 * - Never sends PII (names, emails, user IDs, booking IDs, payment refs)
 *
 * The Measurement ID is a public identifier (not a secret). It's safe to
 * expose in the browser. Set it via:
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 *
 * If not set, no tracking occurs.
 */

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Routes excluded from tracking (auth, admin, account dashboards)
const EXCLUDED_PREFIXES = [
  "/admin",
  "/student",
  "/landlord",
  "/manager",
  "/agent",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/",
  "/api/",
];

function shouldTrack(pathname: string): boolean {
  return !EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const trackable = shouldTrack(pathname);

  // Track page views on route changes
  React.useEffect(() => {
    if (!GA_MEASUREMENT_ID || !trackable) return;
    if (typeof window.gtag === "function") {
      window.gtag("config", GA_MEASUREMENT_ID, { page_path: pathname });
    }
  }, [pathname, trackable]);

  // F-08: Do not load GA scripts at all on auth/private routes. This
  // prevents the gtag.js library and init script from firing on /login,
  // /register, /auth/callback, and dashboard pages — not just the page-
  // view event.
  if (!GA_MEASUREMENT_ID || !trackable) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            send_page_view: true
          });
        `}
      </Script>
    </>
  );
}

// Type declaration for gtag
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

/**
 * Track a custom event (for booking/payment funnel events).
 * Only call this from client components on public routes.
 * Never pass PII as event parameters.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>,
) {
  if (!GA_MEASUREMENT_ID) return;
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}

// Event taxonomy constants
export const GA_EVENTS = {
  VIEW_ITEM_LIST: "view_item_list",
  VIEW_ITEM: "view_item",
  SEARCH: "search",
  BEGIN_BOOKING: "begin_booking",
  BOOKING_ATTEMPT: "booking_attempt",
  BOOKING_CREATED: "booking_created",
  BEGIN_CHECKOUT: "begin_checkout",
  PAYMENT_SUCCESS: "payment_success",
  SIGN_UP: "sign_up",
  LOGIN: "login",
} as const;
