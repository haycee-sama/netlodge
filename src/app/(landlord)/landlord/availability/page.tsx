"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, DoorOpen, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState, SectionHeading } from "@/components/shared/page-components";
import { RoomStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { properties as allProperties, rooms as allRooms } from "@/lib/data/fixtures";
import type { Property, RentableUnit } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";

export default function LandlordAvailabilityPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [rooms, setRooms] = React.useState<RentableUnit[]>([]);

  React.useEffect(() => {
    if (!session) return;
    getRepositories().properties.listByLandlord(session.userId || "dev_landlord_1").then(async (ps) => {
      setProperties(ps);
      const allRooms: RentableUnit[] = [];
      for (const p of ps) {
        const rs = await getRepositories().rooms.listByProperty(p.id);
        allRooms.push(...rs);
      }
      setRooms(allRooms);
    });
  }, [session]);

  const grouped = properties.map((p) => ({
    property: p,
    rooms: rooms.filter((r) => r.propertyId === p.id),
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Calendar"
        title="Availability management"
        description="Set when each unit is available, on hold, or off the market. Holds are backend-controlled."
      />

      {properties.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-5 w-5" aria-hidden />} title="No properties" description="Add a property to manage availability." />
      ) : (
        <div className="space-y-6">
          {grouped.map(({ property, rooms: pRooms }) => (
            <section key={property.id}>
              <SectionHeading title={property.name} />
              <Card className="mt-3">
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {pRooms.map((r) => (
                      <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Link href={`/landlord/rooms/${r.id}`} className="font-medium hover:text-primary">Unit {r.identifier}</Link>
                            <RoomStatusBadge status={r.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {r.availableFrom && `Available from ${formatDate(r.availableFrom)}`}
                            {r.availableTo && ` to ${formatDate(r.availableTo)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.status === "available" && <Button size="sm" variant="outline"><Lock className="mr-1 h-3 w-3" aria-hidden />Mark held</Button>}
                          {r.status === "held" && <Button size="sm" variant="outline">Release hold</Button>}
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/landlord/rooms/${r.id}/edit`}>Edit</Link>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Holds:</strong> When a student places a hold, the backend
          flips the room status to <code>held</code> with a 24-hour expiry. You cannot override
          active holds from this page.
        </CardContent>
      </Card>
    </div>
  );
}
