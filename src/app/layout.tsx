import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Root layout for NetLodge.
 *
 * Phase 0 baseline — establishes:
 *   - semantic document structure (<html lang>, <body>, skip-link)
 *   - mobile-first responsive viewport
 *   - sensible default metadata
 *   - accessible name for screen readers
 *
 * No global header/footer/nav yet — those belong to a later phase that defines
 * their content. Adding an empty <header> placeholder would be worse than
 * none at all (it would mislead assistive tech into expecting navigation).
 */
export const metadata: Metadata = {
  title: {
    default: "NetLodge",
    template: "%s · NetLodge",
  },
  description:
    "Verified off-campus student accommodation near Nigerian universities. Discover, compare, and reserve a real room — without gambling on an anonymous listing.",
  applicationName: "NetLodge",
  authors: [{ name: "NetLodge" }],
  // Public listing pages are intended to be crawlable for SEO (MVP_SCOPE §14).
  // Default open; route segments that need stricter rules can override locally.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/* Skip-link — first focusable element on every page for keyboard /
         * screen-reader users. The target anchor `#main-content` is rendered
         * by the page itself (or by the first content layout). */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
