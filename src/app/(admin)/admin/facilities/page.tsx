"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { FACILITY_LABELS, type Facility } from "@/lib/types";
import { Plus } from "lucide-react";

export default function AdminFacilitiesPage() {
  const facilities = Object.keys(FACILITY_LABELS) as Facility[];
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        eyebrow="Configuration"
        title="Facilities & amenities"
        description="Manage the list of facilities that can be associated with properties and rooms."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Facilities" }]}
        actions={<Button><Plus className="mr-2 h-4 w-4" aria-hidden /> Add facility</Button>}
      />
      <DemoModeBanner />
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {facilities.map((f) => (
              <Badge key={f} variant="secondary" className="py-1.5">{FACILITY_LABELS[f]}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
