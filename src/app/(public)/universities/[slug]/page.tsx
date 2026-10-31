import * as React from "react";
import { notFound } from "next/navigation";
import { UniversityDetailContent } from "@/components/public/university-detail-content";
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
  const uniNeighbourhoods = (allNeighbourhoods ?? []).map((n) => ({
    id: n.id,
    name: n.name,
    city: n.city,
    state: n.state,
    average_annual_rent_kobo: (n as any).average_annual_rent_kobo ?? null,
  }));

  const { data: uniProperties } = await fetchPropertiesServer({
    universityId: uni.id,
    page: 1,
    pageSize: 100,
  });

  const { data: allUnis } = await fetchUniversitiesServer();
  const relatedUniversities = (allUnis ?? [])
    .filter((u) => u.id !== uni.id)
    .map((u) => ({
      id: u.id,
      name: u.name,
      short_name: u.short_name,
      slug: u.slug,
      city: u.city,
      state: u.state,
    }));

  return (
    <UniversityDetailContent
      university={{
        id: uni.id,
        name: uni.name,
        short_name: uni.short_name,
        slug: uni.slug,
        city: uni.city,
        state: uni.state,
      }}
      neighbourhoods={uniNeighbourhoods}
      properties={uniProperties ?? []}
      relatedUniversities={relatedUniversities}
    />
  );
}
