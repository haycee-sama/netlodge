"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, Building2, ArrowRight, GraduationCap } from "lucide-react";
import { PropertyCardAdapter } from "@/components/public/property-card-adapter";
import { PageHeader, SectionHeading, EmptyState } from "@/components/shared/page-components";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Price } from "@/components/shared/price";
import { useI18n } from "@/lib/i18n/context";
import type { PropertyWithRelations } from "@/lib/supabase/property-service";

type Neighbourhood = {
  id: string;
  name: string;
  city: string;
  state: string;
  average_annual_rent_kobo: number | null;
};

type University = {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  city: string;
  state: string;
};

type RelatedUniversity = University;

interface UniversityDetailContentProps {
  university: University;
  neighbourhoods: Neighbourhood[];
  properties: PropertyWithRelations[];
  relatedUniversities: RelatedUniversity[];
}

export function UniversityDetailContent({
  university,
  neighbourhoods,
  properties,
  relatedUniversities,
}: UniversityDetailContentProps) {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={`${university.short_name} · ${university.city}, ${university.state}`}
        title={university.name}
        actions={
          <Badge variant="outline" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            {t("universityDetail.listingsCount", { n: properties.length })}
          </Badge>
        }
      />

      {/* Neighbourhoods */}
      <section className="mt-10">
        <SectionHeading
          eyebrow={t("universityDetail.neighbourhoods.eyebrow")}
          title={`Where students live around ${university.short_name}`}
          description={t("universityDetail.neighbourhoods.description")}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {neighbourhoods.length === 0 ? (
            <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
              {t("universityDetail.neighbourhoods.empty")}
            </p>
          ) : (
            neighbourhoods.map((n) => (
              <Card key={n.id} className="overflow-hidden p-0">
                <Link
                  href={`/search?universityId=${university.id}&neighbourhoodId=${n.id}`}
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
                        <Price kobo={n.average_annual_rent_kobo} compact period={t("universityDetail.neighbourhoods.typicalPerYear")} />
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("universityDetail.neighbourhoods.priceVaries")}</span>
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
          eyebrow={t("universityDetail.properties.eyebrow")}
          title={`Accommodation around ${university.short_name}`}
          action={
            <Link
              href={`/search?universityId=${university.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t("universityDetail.properties.viewAll")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          }
        />
        <div className="mt-5">
          {properties.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => (
                <PropertyCardAdapter key={p.id} property={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Building2 className="h-5 w-5" aria-hidden />}
              title={t("universityDetail.properties.empty.title")}
              description={`We're onboarding landlords around ${university.short_name}. Check back soon or sign up to be notified.`}
              action={
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {t("universityDetail.properties.empty.action")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              }
            />
          )}
        </div>
      </section>

      {/* Related universities */}
      <section className="mt-16">
        <SectionHeading eyebrow={t("universityDetail.related.eyebrow")} title={t("universityDetail.related.title")} />
        <div className="mt-4 flex flex-wrap gap-2">
          {relatedUniversities.map((u) => (
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
