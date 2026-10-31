"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Video, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-components";
import { ImageUploadField, type UploadedFile } from "@/components/shared/image-upload-field";
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
  { value: "annual", label: "Annual (365 days)" },
  { value: "quarterly", label: "Quarterly (91 days)" },
  { value: "semester", label: "Per semester (152 days)" },
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
  const [periodRent, setPeriodRent] = React.useState("");
  const [rentalPeriod, setRentalPeriod] = React.useState("annual");
  const [cautionDeposit, setCautionDeposit] = React.useState("");
  const [hasWindow, setHasWindow] = React.useState(true);
  const [hasBalcony, setHasBalcony] = React.useState(false);
  const [bookingTerms, setBookingTerms] = React.useState("");
  const [roomImages, setRoomImages] = React.useState<UploadedFile[]>([]);
  const [uploadingMedia, setUploadingMedia] = React.useState<"video" | "panorama" | null>(null);

  React.useEffect(() => {
    if (!isSupabaseAuth || !params.id) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("rentable_units").select("*").eq("id", params.id).single().then(async ({ data, error }) => {
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
        setPeriodRent(String(data.period_rent_kobo ?? data.annual_rent_kobo ?? ""));
        setRentalPeriod(data.rental_period ?? "annual");
        setCautionDeposit(String(data.caution_deposit_kobo ?? ""));
        setHasWindow(data.has_window ?? true);
        setHasBalcony(data.has_balcony ?? false);
        setBookingTerms(data.booking_terms ?? "");

        // Load existing room images (including video/panorama media)
        const { data: images } = await supabase
          .from("unit_images")
          .select("id, storage_path, public_url, alt_text, position, media_type, video_url, panorama_url")
          .eq("unit_id", params.id)
          .order("position", { ascending: true });
        if (images && images.length > 0) {
          setRoomImages(images.map((img: any) => ({
            path: img.storage_path,
            publicUrl: img.public_url ?? undefined,
            alt_text: img.alt_text ?? undefined,
            media_type: img.media_type ?? "image",
            video_url: img.video_url ?? undefined,
            panorama_url: img.panorama_url ?? undefined,
          })));
        }
      }
      setLoading(false);
    });
  }, [isSupabaseAuth, params.id]);

  async function handleSave() {
    if (!room) return;
    if (!identifier.trim()) { toast.error("Unit identifier is required"); return; }
    const rent = Number(annualRent);
    if (!rent || rent <= 0) { toast.error("Valid annual rent is required"); return; }
    const pRent = periodRent ? Number(periodRent) : rent;
    if (rentalPeriod !== "annual" && (!pRent || pRent <= 0)) {
      toast.error(`Valid ${rentalPeriod} rent is required`);
      return;
    }

    setSaving(true);
    const result = await updateRoom(room.id, {
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
      toast.error("Failed to save", { description: result.error });
    } else {
      // Persist room images to unit_images table (including media_type).
      // First delete existing images, then insert the current set.
      const supabase = createClient();
      await supabase.from("unit_images").delete().eq("unit_id", room.id);
      if (roomImages.length > 0) {
        const imageRows = roomImages.map((img: any, i: number) => ({
          unit_id: room.id,
          storage_path: img.path,
          public_url: img.publicUrl ?? null,
          alt_text: img.alt_text ?? `Room photo ${i + 1}`,
          position: i,
          media_type: img.media_type ?? "image",
          video_url: img.video_url ?? null,
          panorama_url: img.panorama_url ?? null,
        }));
        await supabase.from("unit_images").insert(imageRows);
      }
      toast.success("Room updated");
      await invalidateCache([CACHE_TAGS.PROPERTIES, CACHE_TAGS.UNITS]);
      router.push(`/landlord/rooms/${room.id}`);
    }
    setSaving(false);
  }

  if (!isSupabaseAuth) return <div className="mx-auto max-w-3xl"><PageHeader title="Edit room" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !room) return <div className="mx-auto max-w-3xl space-y-4"><Button asChild variant="ghost" size="sm"><Link href="/landlord/rooms">Back</Link></Button><Card><CardContent className="p-6 text-center text-sm text-destructive">{error ?? "Not found"}</CardContent></Card></div>;

  // Upload video or panorama via /api/uploads/room-media
  async function handleMediaUpload(file: File, mediaType: "video" | "panorama") {
    if (!params.id) return;
    setUploadingMedia(mediaType);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("unitId", params.id);
      formData.append("mediaType", mediaType);
      formData.append("altText", `${mediaType} tour of room`);

      const res = await fetch("/api/uploads/room-media", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Upload failed");
      }

      const media = data.media;
      setRoomImages((prev) => [...prev, {
        path: media.public_url ?? media.video_url ?? media.panorama_url ?? "",
        publicUrl: media.public_url ?? undefined,
        alt_text: `${mediaType} tour`,
        media_type: mediaType,
        video_url: media.video_url ?? undefined,
        panorama_url: media.panorama_url ?? undefined,
      } as any]);
      toast.success(`${mediaType === "video" ? "Video" : "360 panorama"} uploaded`);
    } catch (e) {
      toast.error("Upload failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setUploadingMedia(null);
    }
  }

  // Existing video and panorama media
  const existingVideo = roomImages.find((img: any) => img.media_type === "video");
  const existingPanorama = roomImages.find((img: any) => img.media_type === "panorama");

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
          <div className="space-y-1"><Label htmlFor="bookingTerms">Booking terms</Label><Textarea id="bookingTerms" value={bookingTerms} onChange={(e) => setBookingTerms(e.target.value)} rows={2} placeholder="Optional booking terms..." /></div>

          {/* Room photos — uploads to room-photos bucket + creates unit_images rows */}
          <div className="space-y-2">
            <Label>Room photos</Label>
            <p className="text-xs text-muted-foreground">
              Upload photos of this specific room. Students see these in the image carousel
              when deciding to book. Show the actual room — color, space, layout, furnishing.
            </p>
            <ImageUploadField
              endpoint="/api/uploads/room-photo"
              contextField="roomId"
              contextId={params.id}
              value={roomImages.filter((img: any) => !img.media_type || img.media_type === "image")}
              onChange={(imgs) => {
                // Merge image-only uploads with existing video/panorama
                const media = roomImages.filter((img: any) => img.media_type && img.media_type !== "image");
                setRoomImages([...imgs, ...media]);
              }}
              maxFiles={10}
            />
          </div>

          {/* Video tour upload */}
          <div className="space-y-2 border-t border-border pt-4">
            <Label className="flex items-center gap-2"><Video className="h-4 w-4 text-primary" /> Video tour</Label>
            <p className="text-xs text-muted-foreground">
              Upload a short video tour of the room (max 50MB). Students can watch it in the gallery.
              MP4, WebM, or MOV format.
            </p>
            {existingVideo ? (
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <video src={(existingVideo as any).video_url} className="h-16 w-24 rounded object-cover" muted />
                <div className="flex-1 text-sm">
                  <p className="font-medium">Video tour uploaded</p>
                  <p className="text-xs text-muted-foreground">Will appear in the room gallery</p>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive"
                  onClick={() => setRoomImages(prev => prev.filter((_, i) => i !== roomImages.indexOf(existingVideo)))}>
                  Remove
                </Button>
              </div>
            ) : uploadingMedia === "video" ? (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading video…
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:bg-muted">
                <Video className="h-4 w-4" /> Choose video file
                <input type="file" accept="video/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f, "video"); e.target.value = ""; }} />
              </label>
            )}
          </div>

          {/* 360 Panorama upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> 360° panorama</Label>
            <p className="text-xs text-muted-foreground">
              Upload a 360° equirectangular panorama image (max 20MB). Students can drag to look around the room.
            </p>
            {existingPanorama ? (
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={(existingPanorama as any).panorama_url ?? (existingPanorama as any).publicUrl ?? ""} alt="360 preview" className="h-16 w-24 rounded object-cover" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">360° panorama uploaded</p>
                  <p className="text-xs text-muted-foreground">Students can drag to explore</p>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive"
                  onClick={() => setRoomImages(prev => prev.filter((_, i) => i !== roomImages.indexOf(existingPanorama)))}>
                  Remove
                </Button>
              </div>
            ) : uploadingMedia === "panorama" ? (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading panorama…
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:bg-muted">
                <Globe className="h-4 w-4" /> Choose panorama image
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f, "panorama"); e.target.value = ""; }} />
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" asChild><Link href={`/landlord/rooms/${room.id}`}>Cancel</Link></Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : <><Save className="mr-2 h-4 w-4" /> Save</>}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
