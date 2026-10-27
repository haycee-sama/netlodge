"use client";

import * as React from "react";
import Link from "next/link";
import { Tag, Layers, DoorOpen, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState, SectionHeading } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { properties as allProperties, floors as allFloors, rooms as allRooms } from "@/lib/data/fixtures";
import type { Property, Floor, RentableUnit } from "@/lib/types";
import { ngnToKobo, koboToNgn, formatNgn } from "@/lib/utils/format";
import { toast } from "sonner";

export default function LandlordPricingPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [floors, setFloors] = React.useState<Floor[]>([]);
  const [rooms, setRooms] = React.useState<RentableUnit[]>([]);
  const [floorDefaults, setFloorDefaults] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!session) return;
    getRepositories().properties.listByLandlord(session.userId || "dev_landlord_1").then(async (ps) => {
      setProperties(ps);
      const allF: Floor[] = [];
      const allR: RentableUnit[] = [];
      for (const p of ps) {
        const fs = await getRepositories().floors.listByProperty(p.id);
        const rs = await getRepositories().rooms.listByProperty(p.id);
        allF.push(...fs);
        allR.push(...rs);
      }
      setFloors(allF);
      setRooms(allR);
      const defaults: Record<string, string> = {};
      allF.forEach((f) => {
        if (f.defaultPriceKobo) defaults[f.id] = String(koboToNgn(f.defaultPriceKobo));
      });
      setFloorDefaults(defaults);
    });
  }, [session]);

  async function saveFloorDefault(floorId: string) {
    setSaving(floorId);
    try {
      const ngn = Number(floorDefaults[floorId]);
      if (Number.isNaN(ngn)) {
        toast.error("Enter a valid amount");
        return;
      }
      await getRepositories().floors.update(floorId, { defaultPriceKobo: ngnToKobo(ngn) });
      toast.success("Floor default updated", { description: `New default: ${formatNgn(ngnToKobo(ngn))}/yr` });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Pricing"
        title="Pricing management"
        description="Set default prices per floor, override individual room prices, and see every price in one place."
      />

      {properties.length === 0 ? (
        <EmptyState icon={<Tag className="h-5 w-5" aria-hidden />} title="No properties" description="Add a property to manage pricing." />
      ) : (
        <div className="space-y-8">
          {properties.map((p) => {
            const pFloors = floors.filter((f) => f.propertyId === p.id);
            const pRooms = rooms.filter((r) => r.propertyId === p.id);
            return (
              <section key={p.id}>
                <SectionHeading title={p.name} description={`${pFloors.length} floors · ${pRooms.length} rooms`} />
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {/* Floor defaults */}
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Layers className="h-4 w-4 text-primary" aria-hidden /> Floor default prices</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {pFloors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No floors yet.</p>
                      ) : (
                        pFloors.map((f) => (
                          <div key={f.id} className="flex items-center gap-2">
                            <Label htmlFor={`f-${f.id}`} className="w-32 text-sm">{f.label}</Label>
                            <Input
                              id={`f-${f.id}`}
                              type="number"
                              min={0}
                              step={50000}
                              value={floorDefaults[f.id] ?? ""}
                              onChange={(e) => setFloorDefaults((d) => ({ ...d, [f.id]: e.target.value }))}
                              className="flex-1"
                            />
                            <Button size="sm" variant="outline" onClick={() => saveFloorDefault(f.id)} disabled={saving === f.id}>
                              {saving === f.id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Save className="h-3 w-3" aria-hidden />}
                            </Button>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Room overrides */}
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><DoorOpen className="h-4 w-4 text-primary" aria-hidden /> Individual room prices</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                        {pRooms.map((r) => {
                          const f = pFloors.find((x) => x.id === r.floorId);
                          const isOverridden = f?.defaultPriceKobo && r.annualRentKobo !== f.defaultPriceKobo;
                          return (
                            <li key={r.id} className="flex items-center justify-between p-3 text-sm">
                              <div>
                                <p className="font-medium">{r.identifier}</p>
                                <p className="text-xs text-muted-foreground">{f?.label}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{formatNgn(r.annualRentKobo)}</span>
                                {isOverridden && <Badge variant="outline" className="text-xs">Override</Badge>}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
