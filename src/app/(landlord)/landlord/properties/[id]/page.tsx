"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, DoorOpen, Layers, Home, Loader2, Edit2, Settings, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, StatCard, EmptyState } from "@/components/shared/page-components";
import { PropertyStatusBadge, VerificationBadge, RoomStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchLandlordProperty, fetchFloors, fetchRooms } from "@/lib/supabase/landlord-service";
import { UNIT_TYPE_LABELS } from "@/lib/types";
import { formatNgn } from "@/lib/utils/format";

const FACILITY_LABELS: Record<string, string> = {
  wifi: "Wi-Fi", power_backup: "Power backup", water_borehole: "Borehole water",
  cctv: "CCTV", security_guard: "Security guard", parking: "Parking",
  kitchen_shared: "Shared kitchen", kitchen_private: "Private kitchen",
  laundry: "Laundry", study_room: "Study room", gym: "Gym",
  common_room: "Common room", generator: "Generator", solar_power: "Solar power",
  waste_disposal: "Waste disposal", furnished: "Furnished", wardrobe: "Wardrobe",
  bed_mattress: "Bed & mattress", desk_chair: "Desk & chair", ac: "Air conditioning",
  fan: "Ceiling fan", ensuite_bathroom: "Ensuite bathroom", shared_bathroom: "Shared bathroom",
  balcony: "Balcony", window: "Window",
};

export default function LandlordPropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth();
  const [property, setProperty] = React.useState<any>(null);
  const [floors, setFloors] = React.useState<any[]>([]);
  const [rooms, setRooms] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!params.id || !isSupabaseAuth) { setLoading(false); return; }
    Promise.all([
      fetchLandlordProperty(params.id),
      fetchFloors(params.id),
      fetchRooms(params.id),
    ]).then(([propRes, floorsRes, roomsRes]) => {
      if (propRes.data) setProperty(propRes.data);
      if (propRes.error) setError(propRes.error);
      if (floorsRes.data) setFloors(floorsRes.data);
      if (roomsRes.data) setRooms(roomsRes.data);
      setLoading(false);
    });
  }, [params.id, isSupabaseAuth]);

  if (loading) {
    return <div className="mx-auto max-w-5xl"><div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden /></div></div>;
  }

  if (error || !property) {
    return (
      <div className="mx-auto max-w-5xl">
        <EmptyState icon={<Building2 className="h-5 w-5" aria-hidden />} title="Property not found" description={error ?? "This property may not exist or you don't have access."} />
        <Button asChild variant="outline"><Link href="/landlord/properties">Back to properties</Link></Button>
      </div>
    );
  }

  const facilities = (property.property_facilities ?? []).map((f: any) => f.facility);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/landlord/properties"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to properties</Link></Button>

      <PageHeader
        eyebrow={property.public_address_line}
        title={property.name}
        description={property.description?.slice(0, 200)}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link href={`/landlord/properties/${property.id}/edit`}><Edit2 className="mr-2 h-4 w-4" aria-hidden />Edit</Link></Button>
            <Button asChild size="sm"><Link href={`/landlord/properties/${property.id}/rooms`}><DoorOpen className="mr-2 h-4 w-4" aria-hidden />Manage rooms</Link></Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <PropertyStatusBadge status={property.status} />
        <VerificationBadge status={property.verification_status} />
        <Badge variant="outline" className="capitalize">{property.type?.replace(/_/g, " ")}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total units" value={property.total_units} icon={<DoorOpen className="h-4 w-4" aria-hidden />} />
        <StatCard label="Available" value={property.available_units} icon={<Home className="h-4 w-4" aria-hidden />} />
        <StatCard label="Floors" value={property.total_floors} icon={<Layers className="h-4 w-4" aria-hidden />} />
        <StatCard label="Price from" value={formatNgn(property.price_from_kobo)} icon={<Building2 className="h-4 w-4" aria-hidden />} />
      </div>

      <Tabs defaultValue="rooms">
        <TabsList>
          <TabsTrigger value="rooms">Rooms ({rooms.length})</TabsTrigger>
          <TabsTrigger value="floors">Floors ({floors.length})</TabsTrigger>
          <TabsTrigger value="facilities">Facilities ({facilities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{rooms.filter((r) => r.status === "available").length} of {rooms.length} rooms available</p>
            <Button asChild size="sm"><Link href={`/landlord/properties/${property.id}/rooms`}><DoorOpen className="mr-2 h-4 w-4" aria-hidden />Manage rooms</Link></Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {rooms.slice(0, 10).map((r) => (
                  <li key={r.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">Unit {r.identifier}</p>
                      <p className="text-xs text-muted-foreground">{(UNIT_TYPE_LABELS as any)[r.unit_type] ?? r.unit_type} · sleeps {r.capacity}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <RoomStatusBadge status={r.status} />
                      <span className="text-sm font-medium">{formatNgn(r.annual_rent_kobo)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="floors" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{floors.length} floors</p>
            <Button asChild size="sm"><Link href={`/landlord/properties/${property.id}/floors`}><Layers className="mr-2 h-4 w-4" aria-hidden />Manage floors</Link></Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {floors.map((f) => (
                  <li key={f.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{f.label}</p>
                      <p className="text-xs text-muted-foreground">Level {f.level} · {f.room_count} rooms · {f.available_count} available</p>
                    </div>
                    {f.default_price_kobo && <span className="text-sm text-muted-foreground">{formatNgn(f.default_price_kobo)}/yr default</span>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facilities">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {facilities.map((f: string) => (
                  <Badge key={f} variant="secondary">{FACILITY_LABELS[f] ?? f.replace(/_/g, " ")}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
