"use client";

import * as React from "react";
import Link from "next/link";
import { Briefcase, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { VerificationBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import type { Property } from "@/lib/types";

export default function AgentAssignmentsPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!session) return;
    getRepositories().properties.listByAgent(session.userId || "dev_agent_1").then((p) => {
      setProperties(p);
      setLoading(false);
    });
  }, [session]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="Assignments" title="Your property assignments" description="Properties your landlord has authorised you to represent." />
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden /></div>
      ) : properties.length === 0 ? (
        <EmptyState icon={<Briefcase className="h-5 w-5" aria-hidden />} title="No assignments" description="Your landlord hasn't assigned you to any properties yet." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3 p-5">
                <Link href={`/agent/properties`}>
                  <p className="font-medium leading-tight hover:text-primary">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.publicAddressLine}</p>
                </Link>
                <div className="flex items-center gap-2">
                  <VerificationBadge status={p.verificationStatus} />
                  <Badge variant="outline">{p.availableUnits} available</Badge>
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
