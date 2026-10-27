"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, DoorOpen, Edit2, Save, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-components";
import { RoomStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { rooms as allRooms, properties as allProperties, floors as allFloors } from "@/lib/data/fixtures";
import { UNIT_TYPE_LABELS, FACILITY_LABELS, RENTAL_PERIOD_LABELS } from "@/lib/types";
import { formatNgn } from "@/lib/utils/format";

export default function LandlordRoomDetailPage() {
  const params = useParams<{ id: string }>();
  const room = allRooms.find((r) => r.id === params.id);
  const property = allProperties.find((p) => p.id === room?.propertyId);
  const floor = allFloors.find((f) => f.id === room?.floorId);
  const [editing, setEditing] = React.useState(false);
  const [annualRentNgn, setAnnualRentNgn] = React.useState(room ? String(room.annualRentKobo / 100) : "");

  if (!room || !property) {
    return <div className="mx-auto max-w-5xl"><p className="text-sm text-muted-foreground">Room not found.</p></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/landlord/properties/${property.id}/rooms`}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Back to rooms
        </Link>
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">Unit {room.identifier}</h1>
            <RoomStatusBadge status={room.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {property.name} · {floor?.label}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)}>
          {editing ? <><Save className="mr-2 h-4 w-4" aria-hidden /> Save</> : <><Edit2 className="mr-2 h-4 w-4" aria-hidden /> Edit</>}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Type</p><p className="font-medium">{UNIT_TYPE_LABELS[room.unitType]}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Capacity</p><p className="font-medium">{room.capacity} {room.capacity === 1 ? "person" : "people"}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Bedrooms</p><p className="font-medium">{room.bedrooms}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Bathrooms</p><p className="font-medium">{room.bathrooms}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {editing ? (
            <div className="space-y-1.5">
              <Label htmlFor="rent">Annual rent (NGN)</Label>
              <Input id="rent" type="number" value={annualRentNgn} onChange={(e) => setAnnualRentNgn(e.target.value)} />
            </div>
          ) : (
            <>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Annual rent</span><span className="font-medium">{formatNgn(room.annualRentKobo)}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Rental period</span><span className="font-medium">{RENTAL_PERIOD_LABELS[room.rentalPeriod]}</span></div>
              {room.cautionDepositKobo && <div className="flex justify-between"><span className="text-sm text-muted-foreground">Caution deposit</span><span className="font-medium">{formatNgn(room.cautionDepositKobo)}</span></div>}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">In-unit facilities</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {room.facilities.map((f) => (
              <Badge key={f} variant="secondary">{FACILITY_LABELS[f]}</Badge>
            ))}
            {room.facilities.length === 0 && <p className="text-sm text-muted-foreground">No in-unit facilities recorded.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Booking terms</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-foreground/90 text-pretty">{room.bookingTerms}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Availability</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><RoomStatusBadge status={room.status} /></div>
          {room.availableFrom && <div className="flex justify-between"><span className="text-muted-foreground">Available from</span><span>{new Date(room.availableFrom).toLocaleDateString("en-NG")}</span></div>}
          {room.activeHoldId && <div className="rounded-md bg-warning/10 p-2 text-xs text-warning-foreground"><AlertCircle className="mr-1 inline h-3 w-3" aria-hidden />This room is currently on hold.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
