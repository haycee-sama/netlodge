"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { neighbourhoods, universities } from "@/lib/data/fixtures";
import { formatNgnCompact } from "@/lib/utils/format";

export default function AdminLocationsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Configuration"
        title="Locations & neighbourhoods"
        description="Manage neighbourhoods around each university. Each neighbourhood has its own average rent and walking distance."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Locations" }]}
      />
      <DemoModeBanner />
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {neighbourhoods.map((n) => {
              const uni = universities.find((u) => u.id === n.universityId);
              return (
                <li key={n.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{n.name}</p>
                    <p className="text-xs text-muted-foreground">{n.city}, {n.state} · {uni?.shortName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {n.averageAnnualRentKobo && <span className="text-xs text-muted-foreground">avg {formatNgnCompact(n.averageAnnualRentKobo)}/yr</span>}
                    {n.walkingMinutesToCampus && <Badge variant="outline" className="text-xs">~{n.walkingMinutesToCampus} min walk</Badge>}
                    <Badge variant="outline" className="text-xs">{n.totalListings} listings</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
