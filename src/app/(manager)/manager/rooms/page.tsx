"use client";

import * as React from "react";
import Link from "next/link";
import { DoorOpen, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { RoomStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { properties as allProperties, floors as allFloors } from "@/lib/data/fixtures";
import type { Property, RentableUnit } from "@/lib/types";
import { UNIT_TYPE_LABELS } from "@/lib/types";
import { formatNgn } from "@/lib/utils/format";

export default function ManagerRoomsPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [rooms, setRooms] = React.useState<RentableUnit[]>([]);
  const [q, setQ] = React.useState("");

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

  const propertyMap = new Map(properties.map((p) => [p.id, p]));
  const floorMap = new Map(allFloors.map((f) => [f.id, f]));
  const filtered = q ? rooms.filter((r) => r.identifier.toLowerCase().includes(q.toLowerCase())) : rooms;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="Inventory" title="All rooms" description="Every rentable unit across your assigned properties." />
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" placeholder="Search by identifier…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={<DoorOpen className="h-5 w-5" aria-hidden />} title="No rooms" description="No rooms match your search." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {filtered.map((r) => (
                <li key={r.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{r.identifier}</p>
                    <p className="text-xs text-muted-foreground">
                      {propertyMap.get(r.propertyId)?.name} · {floorMap.get(r.floorId)?.label} · {UNIT_TYPE_LABELS[r.unitType]}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <RoomStatusBadge status={r.status} />
                    <span className="text-sm font-medium">{formatNgn(r.annualRentKobo)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
