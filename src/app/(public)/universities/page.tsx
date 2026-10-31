import * as React from "react";
import { UniversitiesListContent } from "@/components/public/universities-list-content";
import { fetchUniversitiesServer } from "@/lib/supabase/property-server";

export const metadata = {
  title: "Universities — browse accommodation by campus",
  alternates: { canonical: "/universities" },
};

export default async function UniversitiesPage() {
  const { data: universities, error } = await fetchUniversitiesServer();

  return (
    <UniversitiesListContent
      universities={(universities ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        short_name: u.short_name,
        slug: u.slug,
        city: u.city,
        state: u.state,
        description: u.description,
        totalListings: (u as any).totalListings ?? 0,
      }))}
      error={error}
    />
  );
}
