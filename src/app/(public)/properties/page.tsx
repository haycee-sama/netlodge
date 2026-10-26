import * as React from "react";
import { Building2 } from "lucide-react";
import { properties } from "@/lib/data/fixtures";
import { PropertyCard } from "@/components/public/property-card";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
  title: "Properties — browse verified listings",
  alternates: { canonical: "/properties" },
};

export default function PropertiesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Property directory"
        title="All verified properties"
        description="Every property below has passed identity, address and ownership verification. Each one contains individual bookable rooms, self-contain units or apartments."
      />
      {properties.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" aria-hidden />}
          title="No properties yet"
          description="We're onboarding landlords. Check back soon."
        />
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
      <div className="mt-12 rounded-xl border border-dashed border-border bg-card/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Are you a landlord with rooms to fill?{" "}
          <Button asChild variant="link" className="h-auto p-0 text-primary">
            <Link href="/register">List your property</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
