"use client";

import * as React from "react";
import { CalendarDays, DoorOpen, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState, SectionHeading } from "@/components/shared/page-components";
import { RoomStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import type { Property, RentableUnit } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";

export default function ManagerAvailabilityPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [rooms, setRooms] = React.useState<RentableUnit[]>([]);

  React.useEffect(() => {
    if (!session) return;
    getRepositories().properties.listByManager(session.userId || "dev_manager_1").then(async (ps) => {
      setProperties(ps);
      const allR: RentableUnit[] = [];
      for (const p of ps) {
        const rs = await getRepositories().rooms.listByProperty(p.id);
        allR.push(...rs);
      }
      setRooms(allR);
    });
  }, [session]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="Calendar" title="Availability management" description="Mark rooms as available, on hold, or in maintenance. Holds initiated by students are backend-controlled." />
      {properties.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-5 w-5" aria-hidden />} title="No assignments" />
      ) : (
        properties.map((p) => {
          const pRooms = rooms.filter((r) => r.propertyId === p.id);
          return (
            <section key={p.id}>
              <SectionHeading title={p.name} />
              <Card className="mt-3">
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {pRooms.map((r) => (
                      <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2"><p className="font-medium">Unit {r.identifier}</p><RoomStatusBadge status={r.status} /></div>
                          <p className="text-xs text-muted-foreground">{r.availableFrom && `Available from ${formatDate(r.availableFrom)}`}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.status === "available" && <Button size="sm" variant="outline"><Lock className="mr-1 h-3 w-3" aria-hidden />Mark held</Button>}
                          {r.status === "maintenance" && <Button size="sm" variant="outline">Mark available</Button>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          );
        })
      )}
    </div>
  );
}
