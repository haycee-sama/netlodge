"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { PropertyStatusBadge, VerificationBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import type { Property } from "@/lib/types";

export default function ManagerPropertiesPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!session) return;
    getRepositories().properties.listByManager(session.userId || "dev_manager_1").then((p) => {
      setProperties(p);
      setLoading(false);
    });
  }, [session]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="Assignments" title="Assigned properties" description="Properties your landlord has assigned you to operate." />
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden /></div>
      ) : properties.length === 0 ? (
        <EmptyState icon={<Building2 className="h-5 w-5" aria-hidden />} title="No assignments" description="Your landlord hasn't assigned you to any properties yet." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3 p-5">
                <Link href={`/manager/properties/${p.id}`}>
                  <p className="font-medium leading-tight hover:text-primary">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.publicAddressLine}</p>
                </Link>
                <div className="flex items-center gap-2">
                  <PropertyStatusBadge status={p.status} />
                  <VerificationBadge status={p.verificationStatus} />
                </div>
                <Price kobo={p.priceFromKobo} fromLabel period="/yr" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
