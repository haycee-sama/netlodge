"use client";

import * as React from "react";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { RoomStatusBadge } from "@/components/shared/status-badges";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rooms as allRooms, floors as allFloors, properties as allProperties } from "@/lib/data/fixtures";
import { UNIT_TYPE_LABELS } from "@/lib/types";
import { formatNgn } from "@/lib/utils/format";

export default function AdminRoomsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Marketplace oversight"
        title="Rooms & units"
        description="Platform-wide view of every rentable unit. The bookable entity is the room — not the building."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Rooms" }]}
      />
      <DemoModeBanner />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{allRooms.length}</p><p className="text-xs text-muted-foreground">Total units</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-success">{allRooms.filter((r) => r.status === "available").length}</p><p className="text-xs text-muted-foreground">Available</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-info">{allRooms.filter((r) => r.status === "occupied").length}</p><p className="text-xs text-muted-foreground">Occupied</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-warning-foreground">{allRooms.filter((r) => r.status === "held").length}</p><p className="text-xs text-muted-foreground">On hold</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Identifier</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Property</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Annual rent</th>
                </tr>
              </thead>
              <tbody>
                {allRooms.map((r) => {
                  const floor = allFloors.find((f) => f.id === r.floorId);
                  const property = allProperties.find((p) => p.id === r.propertyId);
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{r.identifier}</td>
                      <td className="px-4 py-3 text-xs">{property?.name} · {floor?.label}</td>
                      <td className="px-4 py-3 text-xs">{UNIT_TYPE_LABELS[r.unitType]}</td>
                      <td className="px-4 py-3"><RoomStatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-right text-xs font-medium">{formatNgn(r.annualRentKobo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
