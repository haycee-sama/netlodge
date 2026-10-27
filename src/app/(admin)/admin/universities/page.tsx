"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { getRepositories } from "@/lib/repositories";
import type { University } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { Plus, Edit2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminUniversitiesPage() {
  const [universities, setUniversities] = React.useState<University[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getRepositories().universities.list().then((u) => { setUniversities(u); setLoading(false); });
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Configuration"
        title="Universities"
        description="Manage the universities NetLodge serves. New universities appear in the public directory and search."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Universities" }]}
        actions={<Button><Plus className="mr-2 h-4 w-4" aria-hidden /> Add university</Button>}
      />
      <DemoModeBanner />

      {loading ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((u) => (
            <Card key={u.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.shortName} · {u.city}, {u.state}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info("Edit", { description: "University edit form in production." })}><Edit2 className="h-3.5 w-3.5" aria-hidden /></Button>
                </div>
                <Badge variant="outline" className="text-xs">{u.totalListings} listings</Badge>
                <p className="text-xs text-muted-foreground">Popular: {u.popularNeighbourhoods.join(", ")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
