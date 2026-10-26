"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, DoorOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-components";
import { properties as allProperties, floors as allFloors } from "@/lib/data/fixtures";
import { FACILITY_LABELS, UNIT_TYPE_LABELS, RENTAL_PERIOD_LABELS, type Facility, type RentableUnitType, type RentalPeriod } from "@/lib/types";
import { ngnToKobo, koboToNgn } from "@/lib/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function NewRoomPage() {
  const [propertyId, setPropertyId] = React.useState("");
  const [floorId, setFloorId] = React.useState("");
  const [identifier, setIdentifier] = React.useState("");
  const [unitType, setUnitType] = React.useState<RentableUnitType>("self_contain");
  const [capacity, setCapacity] = React.useState("1");
  const [bedrooms, setBedrooms] = React.useState("1");
  const [bathrooms, setBathrooms] = React.useState("1");
  const [hasBalcony, setHasBalcony] = React.useState(false);
  const [hasWindow, setHasWindow] = React.useState(true);
  const [sizeSqM, setSizeSqM] = React.useState("");
  const [furnishing, setFurnishing] = React.useState<"unfurnished" | "semi_furnished" | "fully_furnished">("semi_furnished");
  const [facilities, setFacilities] = React.useState<Facility[]>([]);
  const [annualRentNgn, setAnnualRentNgn] = React.useState("");
  const [rentalPeriod, setRentalPeriod] = React.useState<RentalPeriod>("annual");
  const [cautionDepositNgn, setCautionDepositNgn] = React.useState("");
  const [bookingTerms, setBookingTerms] = React.useState("Annual lease renewable. Two instalments acceptable with management approval.");
  const [submitting, setSubmitting] = React.useState(false);

  const property = allProperties.find((p) => p.id === propertyId);
  const propertyFloors = allFloors.filter((f) => f.propertyId === propertyId);

  function toggleFacility(f: Facility) {
    setFacilities((arr) => (arr.includes(f) ? arr.filter((x) => x !== f) : [...arr, f]));
  }

  async function submit() {
    if (!propertyId || !floorId || !identifier) {
      toast.error("Property, floor and identifier are required");
      return;
    }
    if (!annualRentNgn) {
      toast.error("Annual rent is required");
      return;
    }
    setSubmitting(true);
    try {
      const { getRepositories } = await import("@/lib/repositories");
      await getRepositories().rooms.create({
        propertyId,
        floorId,
        identifier,
        slug: identifier.toLowerCase(),
        unitType,
        status: "available",
        capacity: Number(capacity),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        hasBalcony,
        hasWindow,
        sizeSqM: sizeSqM ? Number(sizeSqM) : null,
        furnishing,
        facilities,
        images: [],
        representativeImagesOnly: false,
        annualRentKobo: ngnToKobo(Number(annualRentNgn)),
        rentalPeriod,
        cautionDepositKobo: cautionDepositNgn ? ngnToKobo(Number(cautionDepositNgn)) : undefined,
        additionalCharges: [],
        bookingTerms,
      } as never);
      toast.success("Room created", { description: `Unit ${identifier} added.` });
      window.history.back();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/landlord/properties">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Back to properties
        </Link>
      </Button>

      <PageHeader
        eyebrow="New room"
        title="Add a rentable unit"
        description="A room, self-contain, bed space, or entire apartment. Apartments rented as one unit should have multiple bedrooms."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Property</Label>
            <Select value={propertyId} onValueChange={(v) => { setPropertyId(v); setFloorId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
              <SelectContent>
                {allProperties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Floor</Label>
            <Select value={floorId} onValueChange={setFloorId} disabled={!propertyId}>
              <SelectTrigger><SelectValue placeholder="Select floor" /></SelectTrigger>
              <SelectContent>
                {propertyFloors.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.label}{f.defaultPriceKobo && ` (default ₦${koboToNgn(f.defaultPriceKobo).toLocaleString()}/yr)`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="identifier">Room identifier</Label>
            <Input id="identifier" placeholder="e.g. G-101" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            <p className="text-xs text-muted-foreground">Stable identifier shown publicly — letters, numbers, dashes only.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unit details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Unit type</Label>
            <Select value={unitType} onValueChange={(v) => setUnitType(v as RentableUnitType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(UNIT_TYPE_LABELS) as RentableUnitType[]).map((t) => (
                  <SelectItem key={t} value={t}>{UNIT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capacity">Capacity (people)</Label>
            <Input id="capacity" type="number" min={1} max={20} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sizeSqM">Size (m²)</Label>
            <Input id="sizeSqM" type="number" min={0} value={sizeSqM} onChange={(e) => setSizeSqM(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bedrooms">Bedrooms</Label>
            <Input id="bedrooms" type="number" min={0} max={20} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bathrooms">Bathrooms</Label>
            <Input id="bathrooms" type="number" min={0} max={20} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Furnishing</Label>
            <Select value={furnishing} onValueChange={(v) => setFurnishing(v as typeof furnishing)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unfurnished">Unfurnished</SelectItem>
                <SelectItem value="semi_furnished">Semi-furnished</SelectItem>
                <SelectItem value="fully_furnished">Fully furnished</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-6 sm:col-span-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={hasBalcony} onCheckedChange={(v) => setHasBalcony(v === true)} />
              Has balcony
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={hasWindow} onCheckedChange={(v) => setHasWindow(v === true)} />
              Has window
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">In-unit facilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(FACILITY_LABELS) as Facility[]).map((f) => (
              <label key={f} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors", facilities.includes(f) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40")}>
                <Checkbox checked={facilities.includes(f)} onCheckedChange={() => toggleFacility(f)} />
                <span className="flex-1">{FACILITY_LABELS[f]}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="annualRent">Annual rent (NGN)</Label>
            <Input id="annualRent" type="number" min={0} step={50000} value={annualRentNgn} onChange={(e) => setAnnualRentNgn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Rental period</Label>
            <Select value={rentalPeriod} onValueChange={(v) => setRentalPeriod(v as RentalPeriod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(RENTAL_PERIOD_LABELS) as RentalPeriod[]).map((p) => (
                  <SelectItem key={p} value={p}>{RENTAL_PERIOD_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cautionDeposit">Caution deposit (NGN)</Label>
            <Input id="cautionDeposit" type="number" min={0} value={cautionDepositNgn} onChange={(e) => setCautionDepositNgn(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="bookingTerms">Booking terms</Label>
            <Textarea id="bookingTerms" rows={3} value={bookingTerms} onChange={(e) => setBookingTerms(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/landlord/properties">Cancel</Link>
        </Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Creating…</>
          ) : (
            <><Save className="mr-2 h-4 w-4" aria-hidden /> Create room</>
          )}
        </Button>
      </div>
    </div>
  );
}
