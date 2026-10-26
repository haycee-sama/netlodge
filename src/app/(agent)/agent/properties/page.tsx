"use client";

import * as React from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { VerificationBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import type { Property } from "@/lib/types";

export default function AgentPropertiesPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<Property[]>([]);

  React.useEffect(() => {
    if (!session) return;
    getRepositories().properties.listByAgent(session.userId || "dev_agent_1").then(setProperties);
  }, [session]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="Properties" title="Properties you can represent" description="Browse and share listings with prospective students." />
      {properties.length === 0 ? (
        <EmptyState icon={<Building2 className="h-5 w-5" aria-hidden />} title="No properties" description="No properties have been assigned to you yet." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3 p-5">
                <Link href={`/properties/${p.slug}`}>
                  <p className="font-medium leading-tight hover:text-primary">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.publicAddressLine}</p>
                </Link>
                <VerificationBadge status={p.verificationStatus} />
                <Price kobo={p.priceFromKobo} fromLabel period="/yr" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
