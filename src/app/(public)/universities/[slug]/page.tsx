import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Building2, ArrowRight, GraduationCap } from "lucide-react";
import { PropertyCardAdapter } from "@/components/public/property-card-adapter";
import { PageHeader, SectionHeading, EmptyState } from "@/components/shared/page-components";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Price } from "@/components/shared/price";
import {
  fetchUniversitiesServer,
  fetchNeighbourhoodsServer,
  fetchPropertiesServer,
} from "@/lib/supabase/property-server";

export async function generateStaticParams() {
  const { data } = await fetchUniversitiesServer();
  return (data ?? []).map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: unis } = await fetchUniversitiesServer();
  const uni = unis?.find((u) => u.slug === slug);
  if (!uni) return {};
  return {
    title: `${uni.name} — student accommodation`,
    description: `Verified student accommodation around ${uni.name} (${uni.short_name}), ${uni.city}. Browse rooms, self-contain units, and apartments.`,
    alternates: { canonical: `/universities/${uni.slug}` },
  };
}

export default async function UniversityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: unis, error: uniErr } = await fetchUniversitiesServer();
  if (uniErr || !unis) notFound();

  const uni = unis.find((u) => u.slug === slug);
  if (!uni) notFound();

  const { data: allNeighbourhoods } = await fetchNeighbourhoodsServer(uni.id);
  const uniNeighbourhoods = allNeighbourhoods ?? [];

  const { data: uniProperties, error: propErr } = await fetchPropertiesServer({
    universityId: uni.id,
    page: 1,
    pageSize: 100,
  });

  const { data: allUnis } = await fetchUniversitiesServer();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={`${uni.short_name} · ${uni.city}, ${uni.state}`}
        title={uni.name}
        actions={
          <Badge variant="outline" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            {uniProperties?.length ?? 0} listings
          </Badge>
        }
      />

      {/* Neighbourhoods */}
      <section className="mt-10">
        <SectionHeading
          eyebrow="Popular neighbourhoods"
          title={`Where students live around ${uni.short_name}`}
          description="Each neighbourhood has its own character, price range and walking distance to campus."
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {uniNeighbourhoods.length === 0 ? (
            <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
              No neighbourhoods listed yet.
            </p>
          ) : (
            uniNeighbourhoods.map((n) => (
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
                      {n.average_annual_rent_kobo ? (
                        <Price kobo={n.average_annual_rent_kobo} compact period="/yr typical" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Price varies</span>
                      )}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Properties */}
      <section className="mt-12">
        <SectionHeading
          eyebrow="Verified listings"
          title={`Accommodation around ${uni.short_name}`}
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
          {uniProperties && uniProperties.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {uniProperties.map((p) => (
                <PropertyCardAdapter key={p.id} property={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Building2 className="h-5 w-5" aria-hidden />}
              title="No verified listings yet"
              description={`We're onboarding landlords around ${uni.short_name}. Check back soon or sign up to be notified.`}
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
          {(allUnis ?? [])
            .filter((u) => u.id !== uni.id)
            .map((u) => (
              <Link key={u.id} href={`/universities/${u.slug}`}>
                <Badge variant="outline" className="gap-1.5 py-1.5 pl-2 pr-3 hover:bg-muted">
                  <GraduationCap className="h-3.5 w-3.5" aria-hidden />
                  {u.short_name}
                </Badge>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
