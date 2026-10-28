import * as React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { UniversityCard } from "@/components/public/university-card";
import { PageHeader, SectionHeading } from "@/components/shared/page-components";
import { Badge } from "@/components/ui/badge";
import { fetchUniversitiesServer } from "@/lib/supabase/property-server";

export const metadata = {
  title: "Universities — browse accommodation by campus",
  alternates: { canonical: "/universities" },
};

export default async function UniversitiesPage() {
  const { data: universities, error } = await fetchUniversitiesServer();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Browse by campus"
        title="Universities on NetLodge"
        description="Find verified student accommodation around Nigeria's leading universities. Tap a campus to see neighbourhoods and listings."
      />
      {error ? (
        <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Could not load universities. Please try again later.
        </div>
      ) : !universities || universities.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No universities are listed yet. Check back soon.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((u) => (
            <UniversityCard
              key={u.id}
              university={{
                id: u.id,
                name: u.name,
                shortName: u.short_name,
                slug: u.slug,
                city: u.city,
                state: u.state,
                description: u.description ?? "",
                popularNeighbourhoods: [],
                totalListings: 0,
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-16">
        <SectionHeading
          eyebrow="Coming soon"
          title="More campuses, every term"
          description="NetLodge launches with UNILAG and surrounding areas. These universities are next on our roadmap — request yours via the contact form."
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {["UNN", "OAU", "UI", "UNIBEN", "ABU", "UNIPORT", "UNICAL", "BUK"].map((s) => (
            <Badge key={s} variant="outline" className="gap-1.5 py-1.5 pl-2 pr-3">
              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {s}
              <span className="text-xs text-muted-foreground">· soon</span>
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-16 rounded-xl border border-dashed border-border bg-card/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Don't see your campus?{" "}
          <Link href="/contact" className="font-medium text-primary hover:underline">
            Request it
          </Link>{" "}
          — we prioritise campuses with the most requests.
        </p>
      </div>
    </div>
  );
}
