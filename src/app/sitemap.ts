import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/config/site";

const SITE_URL = getSiteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
  ];

  try {
    const supabase = await createClient();

    const { data: universities } = await supabase
      .from("universities")
      .select("slug, name")
      .eq("active", true);

    const { data: properties } = await supabase
      .from("properties")
      .select("slug, name, updated_at")
      .eq("status", "verified")
      .eq("verification_status", "approved");

    // Fetch available rooms in verified properties for individual room pages
    const { data: rooms } = await supabase
      .from("rentable_units")
      .select("id, properties!inner(status, verification_status)")
      .eq("status", "available")
      .eq("properties.status", "verified")
      .eq("properties.verification_status", "approved");

    const universityPages: MetadataRoute.Sitemap = (universities ?? []).map((u) => ({
      url: `${SITE_URL}/universities/${u.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    const propertyPages: MetadataRoute.Sitemap = (properties ?? []).map((p) => ({
      url: `${SITE_URL}/properties/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    const roomPages: MetadataRoute.Sitemap = (rooms ?? []).map((r: any) => ({
      url: `${SITE_URL}/rooms/${r.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [...staticPages, ...universityPages, ...propertyPages, ...roomPages];
  } catch {
    return staticPages;
  }
}
