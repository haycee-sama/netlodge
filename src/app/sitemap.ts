import type { MetadataRoute } from "next";
import { universities, properties } from "@/lib/data/fixtures";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://netlodge.example";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/universities`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/properties`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/how-it-works`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/safety`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/help`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/cookies`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/register`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
  ];

  const universityPages: MetadataRoute.Sitemap = universities.map((u) => ({
    url: `${SITE_URL}/universities/${u.slug}`,
    lastModified: new Date(u.lastModified ?? Date.now()),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const propertyPages: MetadataRoute.Sitemap = properties
    .filter((p) => p.status === "verified")
    .map((p) => ({
      url: `${SITE_URL}/properties/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  const roomPages: MetadataRoute.Sitemap = properties
    .filter((p) => p.status === "verified")
    .flatMap((p) => {
      // Only public room pages for verified properties with available rooms
      return [{
        url: `${SITE_URL}/properties/${p.slug}#rooms`,
        lastModified: new Date(p.updatedAt),
        changeFrequency: "weekly",
        priority: 0.6,
      }];
    });

  return [...staticPages, ...universityPages, ...propertyPages, ...roomPages];
}
