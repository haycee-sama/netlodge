import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  // Suppress the X-Powered-By header (F-06)
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "z-cdn.chatglm.cn" },
      // Allow Supabase Storage URLs for property images
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn"],
  // Security headers — applied to all responses
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HSTS — only effective over HTTPS (Vercel enforces HTTPS by default)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          // Content-Security-Policy (F-01) — restricts script/object/img/connect
          // sources. 'unsafe-inline' for scripts is required for Next.js
          // hydration; 'unsafe-eval' is only needed in development (HMR).
          // Production drops 'unsafe-eval' for stricter script execution.
          { key: "Content-Security-Policy", value: process.env.NODE_ENV === "production"
            ? "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://js.paystack.co https://widget.cloudinary.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://api.paystack.co https://liberal-thrush-242079.upstash.io; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self'"
            : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://js.paystack.co https://widget.cloudinary.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://api.paystack.co https://liberal-thrush-242079.upstash.io; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self'" },
          // Cross-origin isolation headers (F-07)
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      // API routes + dashboard pages — no caching for personalized data
      {
        source: "/(api|student|landlord|manager|agent|admin)/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
