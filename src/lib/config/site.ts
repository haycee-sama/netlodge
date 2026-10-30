/**
 * Resolves the production site URL, rejecting the known scaffold/template
 * placeholder "your-vercel-domain.vercel.app" that was left in the Vercel
 * environment variables.
 *
 * The NEXT_PUBLIC_SITE_URL env var is embedded at BUILD TIME. If the Vercel
 * project has it set to the placeholder, every robots.txt, sitemap.xml,
 * canonical URL, email link, and CSRF origin check inherits the wrong value.
 * This helper catches that and falls back to the correct production URL.
 *
 * Used by: robots.ts, sitemap.ts, layout.tsx, property detail canonical,
 * email notifications, referral links, admin integrations status, and
 * CSRF origin validation.
 */
export function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (!env || env.includes("your-vercel-domain") || env.includes("example.com") || env.includes("localhost")) {
    return "https://netlodge.vercel.app";
  }
  return env;
}
