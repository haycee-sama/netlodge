"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, DoorOpen, Building2, CalendarCheck, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, StatCard, EmptyState } from "@/components/shared/page-components";
import { RoomStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { properties as allProperties, getRoomsForProperty, getFloorsForProperty } from "@/lib/data/fixtures";
import { UNIT_TYPE_LABELS } from "@/lib/types";
import { formatNgn } from "@/lib/utils/format";

export default function ManagerPropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const property = allProperties.find((p) => p.id === params.id);
  if (!property) {
    return <div className="mx-auto max-w-5xl"><EmptyState icon={<Building2 className="h-5 w-5" aria-hidden />} title="Property not found" /></div>;
  }
  const floors = getFloorsForProperty(property.id);
  const rooms = getRoomsForProperty(property.id);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/manager/properties"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to assignments</Link>
      </Button>

      <PageHeader eyebrow={property.publicAddressLine} title={property.name} description={property.description.slice(0, 200)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total units" value={property.totalUnits} icon={<DoorOpen className="h-4 w-4" aria-hidden />} />
        <StatCard label="Available" value={property.availableUnits} icon={<Building2 className="h-4 w-4" aria-hidden />} />
        <StatCard label="Floors" value={property.totalFloors} icon={<Layers className="h-4 w-4" aria-hidden />} />
        <StatCard label="Price from" value={formatNgn(property.priceFromKobo)} icon={<CalendarCheck className="h-4 w-4" aria-hidden />} />
      </div>

      <Tabs defaultValue="rooms">
        <TabsList>
          <TabsTrigger value="rooms">Rooms ({rooms.length})</TabsTrigger>
          <TabsTrigger value="floors">Floors ({floors.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="rooms">
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {rooms.map((r) => {
                  const floor = floors.find((f) => f.id === r.floorId);
                  return (
                    <li key={r.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{r.identifier}</p>
                        <p className="text-xs text-muted-foreground">{floor?.label} · {UNIT_TYPE_LABELS[r.unitType]} · sleeps {r.capacity}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <RoomStatusBadge status={r.status} />
                        <Price kobo={r.annualRentKobo} compact period="/yr" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="floors">
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {floors.map((f) => (
                  <li key={f.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.totalUnits} units · {f.availableUnits} available</p>
                    </div>
                    {f.defaultPriceKobo && <Price kobo={f.defaultPriceKobo} compact period="/yr default" />}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
