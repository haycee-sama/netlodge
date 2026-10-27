import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Building2, ArrowRight, GraduationCap } from "lucide-react";
import { universities, neighbourhoods, properties } from "@/lib/data/fixtures";
import { PropertyCard } from "@/components/public/property-card";
import { PageHeader, SectionHeading, EmptyState } from "@/components/shared/page-components";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Price } from "@/components/shared/price";
import { formatNgnCompact } from "@/lib/utils/format";

export async function generateStaticParams() {
  return universities.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const uni = universities.find((u) => u.slug === slug);
  if (!uni) return {};
  return {
    title: `${uni.name} — student accommodation`,
    description: `Verified student accommodation around ${uni.name} (${uni.shortName}), ${uni.city}. Browse rooms, self-contain units, and apartments.`,
    alternates: { canonical: `/universities/${uni.slug}` },
  };
}

export default async function UniversityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const uni = universities.find((u) => u.slug === slug);
  if (!uni) notFound();

  const uniNeighbourhoods = neighbourhoods.filter((n) => n.universityId === uni.id);
  const uniProperties = properties.filter((p) => p.universityId === uni.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={`${uni.shortName} · ${uni.city}, ${uni.state}`}
        title={uni.name}
        description={uni.description}
        actions={
          <Badge variant="outline" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            {uni.totalListings} listings
          </Badge>
        }
      />

      {/* Neighbourhoods */}
      <section className="mt-10">
        <SectionHeading
          eyebrow="Popular neighbourhoods"
          title={`Where students live around ${uni.shortName}`}
          description="Each neighbourhood has its own character, price range and walking distance to campus."
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {uniNeighbourhoods.map((n) => (
            <Card key={n.id} className="overflow-hidden p-0">
              <Link
                href={`/search?universityId=${uni.id}&neighbourhoodId=${n.id}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="aspect-[5/3] bg-gradient-to-br from-primary/15 via-card to-accent/20" />
                <CardContent className="space-y-1.5 p-4">
                  <p className="font-display font-semibold">{n.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" aria-hidden />
                    {n.city}, {n.state}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    {n.averageAnnualRentKobo && (
                      <Price kobo={n.averageAnnualRentKobo} compact period="/yr typical" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {n.totalListings} listings
                    </span>
                  </div>
                  {n.walkingMinutesToCampus && (
                    <p className="pt-1 text-xs text-muted-foreground">
                      ~{n.walkingMinutesToCampus} min walk to campus
                    </p>
                  )}
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Properties */}
      <section className="mt-12">
        <SectionHeading
          eyebrow="Verified listings"
          title={`Accommodation around ${uni.shortName}`}
          action={
            <Link
              href={`/search?universityId=${uni.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          }
        />
        <div className="mt-5">
          {uniProperties.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {uniProperties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Building2 className="h-5 w-5" aria-hidden />}
              title="No verified listings yet"
              description={`We're onboarding landlords around ${uni.shortName}. Check back soon or sign up to be notified.`}
              action={
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Get notified
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              }
            />
          )}
        </div>
      </section>

      {/* Related universities */}
      <section className="mt-16">
        <SectionHeading eyebrow="Explore" title="Other universities" />
        <div className="mt-4 flex flex-wrap gap-2">
          {universities
            .filter((u) => u.id !== uni.id)
            .map((u) => (
              <Link key={u.id} href={`/universities/${u.slug}`}>
                <Badge variant="outline" className="gap-1.5 py-1.5 pl-2 pr-3 hover:bg-muted">
                  <GraduationCap className="h-3.5 w-3.5" aria-hidden />
                  {u.shortName}
                </Badge>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
