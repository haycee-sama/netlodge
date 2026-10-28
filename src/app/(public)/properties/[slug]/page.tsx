import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPropertyBySlugServer } from "@/lib/supabase/property-server";
import { PropertyDetailPage } from "./property-detail-page";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://netlodge.vercel.app";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { data: property } = await fetchPropertyBySlugServer(slug);

  if (!property) {
    return {
      title: "Property not found",
      robots: { index: false, follow: false },
    };
  }

  const title = `${property.name} — Student accommodation in ${property.city}`;
  const description =
    property.description ??
    `${property.name} is a verified student accommodation property in ${property.public_address_line}, ${property.city}, ${property.state}. Browse individual rooms and book on NetLodge.`;

  return {
    title,
    description,
    alternates: { canonical: `/properties/${property.slug}` },
    openGraph: {
      title,
      description,
      url: `/properties/${property.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const { data: property } = await fetchPropertyBySlugServer(slug);

  // JSON-LD structured data — only real, verified fields. No fabricated
  // ratings, reviews, or prices (per Phase 34 constraint).
  const jsonLd = property
    ? {
        "@context": "https://schema.org",
        "@type": "LodgingBusiness",
        name: property.name,
        description: property.description ?? undefined,
        address: {
          "@type": "PostalAddress",
          addressLocality: property.city,
          addressRegion: property.state,
          streetAddress: property.public_address_line,
          addressCountry: "NG",
        },
        url: `${SITE_URL}/properties/${property.slug}`,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PropertyDetailPage />
    </>
  );
}
