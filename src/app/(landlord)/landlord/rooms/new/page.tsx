"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createRoom } from "@/lib/supabase/landlord-service";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { invalidateCache, CACHE_TAGS } from "@/lib/cache/invalidate-client";

const UNIT_TYPES = [
  { value: "self_contain", label: "Self-contain" },
  { value: "single_room", label: "Single room" },
  { value: "shared_room", label: "Shared room" },
  { value: "bed_space", label: "Bed space" },
  { value: "apartment", label: "Apartment" },
  { value: "studio", label: "Studio" },
];

const FURNISHING_LEVELS = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi_furnished", label: "Semi-furnished" },
  { value: "fully_furnished", label: "Fully furnished" },
];

export default function NewRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = searchParams.get("propertyId") ?? "";
  const { session } = useAuth();
  const isSupabaseAuth = session?.authenticated === true;
  const [saving, setSaving] = React.useState(false);
  const [floors, setFloors] = React.useState<any[]>([]);

  const [identifier, setIdentifier] = React.useState("");
  const [unitType, setUnitType] = React.useState("single_room");
  const [capacity, setCapacity] = React.useState("1");
  const [bedrooms, setBedrooms] = React.useState("0");
  const [bathrooms, setBathrooms] = React.useState("1");
  const [furnishing, setFurnishing] = React.useState("unfurnished");
  const [annualRent, setAnnualRent] = React.useState("");
  const [periodRent, setPeriodRent] = React.useState("");
  const [rentalPeriod, setRentalPeriod] = React.useState("annual");
  const [cautionDeposit, setCautionDeposit] = React.useState("");
  const [floorId, setFloorId] = React.useState("");
  const [hasWindow, setHasWindow] = React.useState(true);
  const [hasBalcony, setHasBalcony] = React.useState(false);
  const [bookingTerms, setBookingTerms] = React.useState("");

  React.useEffect(() => {
    if (!isSupabaseAuth || !propertyId) return;
    const supabase = createClient();
    supabase.from("floors").select("id, label, level").eq("property_id", propertyId).order("level").then(({ data }) => {
      setFloors(data ?? []);
    });
  }, [isSupabaseAuth, propertyId]);

  async function handleSave() {
    if (!propertyId) { toast.error("Property ID is required"); return; }
    if (!identifier.trim()) { toast.error("Unit identifier is required"); return; }
    const rent = Number(annualRent);
    if (!rent || rent <= 0) { toast.error("Valid annual rent is required"); return; }
    // For non-annual periods, the period rent is required. For annual, it
    // defaults to the annual rent.
    const pRent = periodRent ? Number(periodRent) : rent;
    if (rentalPeriod !== "annual" && (!pRent || pRent <= 0)) {
      toast.error(`Valid ${rentalPeriod} rent is required`);
      return;
    }

    setSaving(true);
    const result = await createRoom({
      propertyId,
      floorId: floorId || undefined,
      identifier: identifier.trim(),
      unitType,
      capacity: Number(capacity) || 1,
      bedrooms: Number(bedrooms) || 0,
      bathrooms: Number(bathrooms) || 0,
      furnishing,
      annualRentKobo: rent,
      periodRentKobo: pRent,
      rentalPeriod,
      cautionDepositKobo: cautionDeposit ? Number(cautionDeposit) : undefined,
      hasWindow,
      hasBalcony,
      bookingTerms: bookingTerms.trim() || undefined,
    });

    if (result.error) {
      toast.error("Failed to create room", { description: result.error });
    } else if (result.data) {
      toast.success("Room created");
      await invalidateCache([CACHE_TAGS.PROPERTIES, CACHE_TAGS.UNITS]);
      router.push(`/landlord/properties/${propertyId}/rooms`);
    }
    setSaving(false);
  }

  if (!isSupabaseAuth) return <div className="mx-auto max-w-3xl"><PageHeader title="New room" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href={propertyId ? `/landlord/properties/${propertyId}/rooms` : "/landlord/properties"}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
      <PageHeader eyebrow="New room" title="Add a rentable unit" description="Create a room, self-contain, or apartment unit for this property." />

      <Card>
        <CardHeader><CardTitle className="text-base">Unit details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label htmlFor="identifier">Unit identifier *</Label><Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="e.g. G-101" /></div>
            <div className="space-y-1"><Label htmlFor="unitType">Unit type</Label><Select value={unitType} onValueChange={setUnitType}><SelectTrigger id="unitType"><SelectValue /></SelectTrigger><SelectContent>{UNIT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          {floors.length > 0 && (
            <div className="space-y-1"><Label htmlFor="floor">Floor</Label><Select value={floorId} onValueChange={setFloorId}><SelectTrigger id="floor"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="">None</SelectItem>{floors.map((f) => <SelectItem key={f.id} value={f.id}>{f.label} (Level {f.level})</SelectItem>)}</SelectContent></Select></div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label htmlFor="capacity">Capacity</Label><Input id="capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="bedrooms">Bedrooms</Label><Input id="bedrooms" type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="bathrooms">Bathrooms</Label><Input id="bathrooms" type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label htmlFor="furnishing">Furnishing</Label><Select value={furnishing} onValueChange={setFurnishing}><SelectTrigger id="furnishing"><SelectValue /></SelectTrigger><SelectContent>{FURNISHING_LEVELS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label htmlFor="rentalPeriod">Rental period</Label><Select value={rentalPeriod} onValueChange={setRentalPeriod}><SelectTrigger id="rentalPeriod"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="annual">Annual (365 days)</SelectItem><SelectItem value="quarterly">Quarterly (91 days)</SelectItem><SelectItem value="semester">Per semester (152 days)</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label htmlFor="annualRent">Annual rent (kobo) *</Label><Input id="annualRent" type="number" min={0} value={annualRent} onChange={(e) => setAnnualRent(e.target.value)} placeholder="e.g. 45000000" /></div>
            <div className="space-y-1"><Label htmlFor="periodRent">{rentalPeriod === "annual" ? "Period rent (kobo)" : `${rentalPeriod.charAt(0).toUpperCase() + rentalPeriod.slice(1)} rent (kobo) *`}</Label><Input id="periodRent" type="number" min={0} value={periodRent} onChange={(e) => setPeriodRent(e.target.value)} placeholder={rentalPeriod === "annual" ? "Defaults to annual rent" : `e.g. ${rentalPeriod === "quarterly" ? "12500000" : "20000000"}`} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label htmlFor="cautionDeposit">Caution deposit (kobo)</Label><Input id="cautionDeposit" type="number" min={0} value={cautionDeposit} onChange={(e) => setCautionDeposit(e.target.value)} placeholder="Optional" /></div>
            <div className="flex items-end text-xs text-muted-foreground pb-2">Students book one {rentalPeriod} period at a time. Duration: {rentalPeriod === "annual" ? "365 days" : rentalPeriod === "quarterly" ? "91 days (~3 months)" : "152 days (~5 months)"}.</div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasWindow} onChange={(e) => setHasWindow(e.target.checked)} /> Has window</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasBalcony} onChange={(e) => setHasBalcony(e.target.checked)} /> Has balcony</label>
          </div>
          <div className="space-y-1"><Label htmlFor="bookingTerms">Booking terms</Label><Textarea id="bookingTerms" value={bookingTerms} onChange={(e) => setBookingTerms(e.target.value)} rows={2} placeholder="Optional" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" asChild><Link href={propertyId ? `/landlord/properties/${propertyId}/rooms` : "/landlord/properties"}>Cancel</Link></Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</> : <><Save className="mr-2 h-4 w-4" /> Create room</>}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
