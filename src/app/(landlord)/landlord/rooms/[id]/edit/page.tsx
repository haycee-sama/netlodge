"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
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
import { updateRoom } from "@/lib/supabase/landlord-service";
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

const RENTAL_PERIODS = [
  { value: "annual", label: "Annual" },
  { value: "biannual", label: "Biannual" },
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
];

export default function EditRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [room, setRoom] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  // Form state
  const [identifier, setIdentifier] = React.useState("");
  const [unitType, setUnitType] = React.useState("single_room");
  const [capacity, setCapacity] = React.useState("1");
  const [bedrooms, setBedrooms] = React.useState("0");
  const [bathrooms, setBathrooms] = React.useState("1");
  const [furnishing, setFurnishing] = React.useState("unfurnished");
  const [annualRent, setAnnualRent] = React.useState("");
  const [rentalPeriod, setRentalPeriod] = React.useState("annual");
  const [cautionDeposit, setCautionDeposit] = React.useState("");
  const [hasWindow, setHasWindow] = React.useState(true);
  const [hasBalcony, setHasBalcony] = React.useState(false);
  const [bookingTerms, setBookingTerms] = React.useState("");

  React.useEffect(() => {
    if (!isSupabaseAuth || !params.id) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("rentable_units").select("*").eq("id", params.id).single().then(({ data, error }) => {
      if (error) setError(error.message);
      else {
        setRoom(data);
        setIdentifier(data.identifier ?? "");
        setUnitType(data.unit_type ?? "single_room");
        setCapacity(String(data.capacity ?? 1));
        setBedrooms(String(data.bedrooms ?? 0));
        setBathrooms(String(data.bathrooms ?? 1));
        setFurnishing(data.furnishing ?? "unfurnished");
        setAnnualRent(String(data.annual_rent_kobo ?? ""));
        setRentalPeriod(data.rental_period ?? "annual");
        setCautionDeposit(String(data.caution_deposit_kobo ?? ""));
        setHasWindow(data.has_window ?? true);
        setHasBalcony(data.has_balcony ?? false);
        setBookingTerms(data.booking_terms ?? "");
      }
      setLoading(false);
    });
  }, [isSupabaseAuth, params.id]);

  async function handleSave() {
    if (!room) return;
    if (!identifier.trim()) { toast.error("Unit identifier is required"); return; }
    const rent = Number(annualRent);
    if (!rent || rent <= 0) { toast.error("Valid annual rent is required"); return; }

    setSaving(true);
    const result = await updateRoom(room.id, {
      identifier: identifier.trim(),
      unitType,
      capacity: Number(capacity) || 1,
      bedrooms: Number(bedrooms) || 0,
      bathrooms: Number(bathrooms) || 0,
      furnishing,
      annualRentKobo: rent,
      rentalPeriod,
      cautionDepositKobo: cautionDeposit ? Number(cautionDeposit) : undefined,
      hasWindow,
      hasBalcony,
      bookingTerms: bookingTerms.trim() || undefined,
    });

    if (result.error) {
      toast.error("Failed to save", { description: result.error });
    } else {
      toast.success("Room updated");
      await invalidateCache([CACHE_TAGS.PROPERTIES, CACHE_TAGS.UNITS]);
      router.push(`/landlord/rooms/${room.id}`);
    }
    setSaving(false);
  }

  if (!isSupabaseAuth) return <div className="mx-auto max-w-3xl"><PageHeader title="Edit room" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !room) return <div className="mx-auto max-w-3xl space-y-4"><Button asChild variant="ghost" size="sm"><Link href="/landlord/rooms">Back</Link></Button><Card><CardContent className="p-6 text-center text-sm text-destructive">{error ?? "Not found"}</CardContent></Card></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href={`/landlord/rooms/${room.id}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to room</Link></Button>
      <PageHeader eyebrow="Edit room" title={`Unit ${room.identifier}`} />

      <Card>
        <CardHeader><CardTitle className="text-base">Room details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label htmlFor="identifier">Unit identifier</Label><Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="e.g. G-101" /></div>
            <div className="space-y-1"><Label htmlFor="unitType">Unit type</Label><Select value={unitType} onValueChange={setUnitType}><SelectTrigger id="unitType"><SelectValue /></SelectTrigger><SelectContent>{UNIT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label htmlFor="capacity">Capacity</Label><Input id="capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="bedrooms">Bedrooms</Label><Input id="bedrooms" type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="bathrooms">Bathrooms</Label><Input id="bathrooms" type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label htmlFor="furnishing">Furnishing</Label><Select value={furnishing} onValueChange={setFurnishing}><SelectTrigger id="furnishing"><SelectValue /></SelectTrigger><SelectContent>{FURNISHING_LEVELS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label htmlFor="rentalPeriod">Rental period</Label><Select value={rentalPeriod} onValueChange={setRentalPeriod}><SelectTrigger id="rentalPeriod"><SelectValue /></SelectTrigger><SelectContent>{RENTAL_PERIODS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label htmlFor="annualRent">Annual rent (kobo)</Label><Input id="annualRent" type="number" min={0} value={annualRent} onChange={(e) => setAnnualRent(e.target.value)} placeholder="e.g. 45000000" /></div>
            <div className="space-y-1"><Label htmlFor="cautionDeposit">Caution deposit (kobo)</Label><Input id="cautionDeposit" type="number" min={0} value={cautionDeposit} onChange={(e) => setCautionDeposit(e.target.value)} placeholder="Optional" /></div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasWindow} onChange={(e) => setHasWindow(e.target.checked)} /> Has window</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasBalcony} onChange={(e) => setHasBalcony(e.target.checked)} /> Has balcony</label>
          </div>
          <div className="space-y-1"><Label htmlFor="bookingTerms">Booking terms</Label><Textarea id="bookingTerms" value={bookingTerms} onChange={(e) => setBookingTerms(e.target.value)} rows={2} placeholder="Optional booking terms..." /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" asChild><Link href={`/landlord/rooms/${room.id}`}>Cancel</Link></Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : <><Save className="mr-2 h-4 w-4" /> Save</>}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
