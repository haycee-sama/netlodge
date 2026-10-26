"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Plus, Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { PropertyStatusBadge, VerificationBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import type { Property } from "@/lib/types";

export default function LandlordPropertiesPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    if (!session) return;
    getRepositories()
      .properties.listByLandlord(session.userId || "dev_landlord_1")
      .then((p) => {
        setProperties(p);
        setLoading(false);
      });
  }, [session]);

  const filtered = q
    ? properties.filter((p) => `${p.name} ${p.publicAddressLine}`.toLowerCase().includes(q.toLowerCase()))
    : properties;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Portfolio"
        title="Your properties"
        description="All properties you've listed or are preparing to list on NetLodge."
        actions={
          <Button asChild>
            <Link href="/landlord/properties/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Add property
            </Link>
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          placeholder="Search properties…"
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" aria-hidden />}
          title={q ? "No matches" : "No properties yet"}
          description={q ? "Try a different search." : "Add your first property to start listing rooms."}
          action={
            !q && (
              <Button asChild>
                <Link href="/landlord/properties/new">
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  Add property
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {filtered.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/landlord/properties/${p.id}`}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{p.name}</p>
                        <PropertyStatusBadge status={p.status} />
                        <VerificationBadge status={p.verificationStatus} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.publicAddressLine}, {p.city}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{p.totalUnits} units</span>
                        <span>·</span>
                        <span>{p.availableUnits} available</span>
                        <span>·</span>
                        <span>{p.totalFloors} floors</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Price kobo={p.priceFromKobo} fromLabel period="/yr" />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
