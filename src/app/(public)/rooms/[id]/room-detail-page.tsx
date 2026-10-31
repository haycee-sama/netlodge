"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, DoorOpen, BedDouble, Bath, Users, Maximize, Loader2,
  CheckCircle2, Lock, AlertCircle, Calendar, ChevronLeft, ChevronRight,
  ImageOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RoomStatusBadge, VerificationBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchRentableUnitById, createBooking, getBookingPricing, type RentableUnitWithRelations } from "@/lib/supabase/property-service";
import { UNIT_TYPE_LABELS, RENTAL_PERIOD_LABELS } from "@/lib/types";
import { formatNgn } from "@/lib/utils/format";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/context";

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

export function RoomDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { t } = useI18n();
  const [room, setRoom] = React.useState<RentableUnitWithRelations | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [checkIn, setCheckIn] = React.useState("");
  const [accept, setAccept] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  // Authoritative pricing fetched from the server (get_booking_pricing RPC).
  // The same function is called inside create_booking() to compute the stored
  // amounts, so the displayed summary and the stored total can never diverge.
  // pricingError is set if the RPC fails — the booking UI must not display a
  // misleading total that omits fees, and booking is blocked until pricing
  // loads successfully.
  const [pricing, setPricing] = React.useState<{
    baseRentKobo: number;
    additionalChargesKobo: number;
    cautionDepositKobo: number;
    serviceFeeRatePct: number;
    serviceFeeKobo: number;
    totalKobo: number;
    periodDays: number;
    rentalPeriod: string;
  } | null>(null);
  const [pricingError, setPricingError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!params.id) return;
    fetchRentableUnitById(params.id).then(async (res) => {
      if (res.error || !res.data) {
        setError(res.error ?? "Room not found");
        setLoading(false);
        return;
      }
      setRoom(res.data);
      // Fetch the authoritative pricing breakdown from the server. This is
      // the same computation create_booking() will use, so the displayed
      // total matches the stored booking amount exactly.
      const priceRes = await getBookingPricing({ unitId: res.data.id });
      if (priceRes.data) {
        setPricing(priceRes.data);
        setPricingError(null);
      } else {
        setPricingError(priceRes.error ?? "Pricing unavailable");
      }
      setLoading(false);
    });
  }, [params.id]);

  // Display values derived from the authoritative server-side pricing.
  // If pricing is unavailable, display values are NOT shown — the UI shows a
  // pricing-unavailable state and blocks booking instead of a misleading
  // total that omits fees.
  const pricingReady = !!pricing && !pricingError;
  const baseRent = pricing?.baseRentKobo ?? 0;
  const additionalCharges = pricing?.additionalChargesKobo ?? 0;
  const cautionDeposit = pricing?.cautionDepositKobo ?? 0;
  const serviceFeeRatePct = pricing?.serviceFeeRatePct ?? 0;
  const serviceFee = pricing?.serviceFeeKobo ?? 0;
  const total = pricing?.totalKobo ?? 0;

  const isAvailable = room?.status === "available";
  const isStudent = session?.role === "student";
  const isAuthenticated = !!session;
  const isSupabaseAuth = session?.authenticated === true;

  async function handleBooking() {
    if (!room || !session) return;
    if (!isStudent) {
      toast.error(t("roomDetail.signUpToBook"));
      setConfirmOpen(false);
      return;
    }
    if (!checkIn) {
      toast.error(t("roomDetail.selectCheckIn"));
      setConfirmOpen(false);
      return;
    }
    if (!accept) {
      toast.error(t("roomDetail.acceptTerms"));
      setConfirmOpen(false);
      return;
    }
    if (!isSupabaseAuth) {
      setConfirmOpen(false);
      router.push(`/register?redirect=/rooms/${room.id}`);
      return;
    }
    if (!pricingReady) {
      toast.error(t("roomDetail.pricingUnavailable"), {
        description: "Please refresh the page. Booking is blocked until pricing loads.",
      });
      setConfirmOpen(false);
      return;
    }

    setSubmitting(true);
    try {
      // Compute checkOut from the landlord-configured period duration.
      // The server validates this matches the period type (±2 day tolerance).
      const rp = room.rental_period ?? "annual";
      const periodDays =
        rp === "annual" ? 365 :
        rp === "quarterly" ? 91 :
        rp === "semester" ? 152 :
        rp === "biannual" ? 183 : 30;
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + periodDays);

      const result = await createBooking({
        studentId: session.userId,
        unitId: room.id,
        checkIn,
        checkOut: checkOut.toISOString().slice(0, 10),
        rentalPeriod: rp,
      });

      if (result.error) {
        toast.error("Booking failed", { description: result.error });
        setConfirmOpen(false);
      } else if (result.data) {
        toast.success(t("roomDetail.holdPlaced.title"), {
          description: t("roomDetail.holdPlaced.description"),
        });
        setConfirmOpen(false);
        router.push("/student/bookings");
      }
    } catch (e) {
      toast.error("Could not create booking", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="mt-2 font-medium">{error ?? t("roomDetail.notFound.title")}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/properties">{t("roomDetail.backToProperty")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/properties"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> {t("roomDetail.backToProperty")}</Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <RoomStatusBadge status={room.status as any} />
            <Badge variant="outline">{(UNIT_TYPE_LABELS as any)[room.unit_type] ?? room.unit_type}</Badge>
            {room.floors && <Badge variant="outline">{room.floors.label}</Badge>}
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Unit {room.identifier}</h1>
        </div>
        <Price kobo={room.annual_rent_kobo} period={`/${(RENTAL_PERIOD_LABELS as any)[room.rental_period]?.split(" ")[0]?.toLowerCase() ?? "yr"}`} className="text-2xl" />
      </div>

      {/* Image carousel — shows all unit_images so students see exactly
          what they're booking. Each room differs in color, space, layout. */}
      <RoomImageGallery images={room.unit_images ?? []} identifier={room.identifier} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card><CardContent className="flex items-center gap-3 p-4">
              <Users className="h-5 w-5 text-primary" aria-hidden />
              <div><p className="text-xs text-muted-foreground">Capacity</p><p className="font-semibold">{room.capacity} {room.capacity === 1 ? "person" : "people"}</p></div>
            </CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4">
              <BedDouble className="h-5 w-5 text-primary" aria-hidden />
              <div><p className="text-xs text-muted-foreground">{t("roomDetail.bedrooms")}</p><p className="font-semibold">{room.bedrooms}</p></div>
            </CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4">
              <Bath className="h-5 w-5 text-primary" aria-hidden />
              <div><p className="text-xs text-muted-foreground">{t("roomDetail.bathrooms")}</p><p className="font-semibold">{room.bathrooms}</p></div>
            </CardContent></Card>
            {room.size_sqm && (
              <Card><CardContent className="flex items-center gap-3 p-4">
                <Maximize className="h-5 w-5 text-primary" aria-hidden />
                <div><p className="text-xs text-muted-foreground">Size</p><p className="font-semibold">{room.size_sqm}m²</p></div>
              </CardContent></Card>
            )}
          </div>

          {/* Facilities */}
          <Card>
            <CardHeader><CardTitle className="text-base">{t("roomDetail.facilities")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(room.unit_facilities ?? []).map((f) => (
                  <div key={f.facility} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                    <span className="text-sm">{FACILITY_LABELS[f.facility] ?? f.facility.replace(/_/g, " ")}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
                  <span className="text-sm font-medium">Furnishing:</span>
                  <span className="text-sm text-muted-foreground capitalize">{room.furnishing.replace(/_/g, " ")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking terms */}
          {room.booking_terms && (
            <Card>
              <CardHeader><CardTitle className="text-base">Booking terms</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-foreground/90 text-pretty">{room.booking_terms}</p></CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar — Booking */}
        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("booking.placeHold")}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!isAvailable && (
                <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>This unit is currently <strong>{room.status.replace(/_/g, " ")}</strong>.</span>
                </div>
              )}

              {isAvailable && !isAuthenticated && (
                <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>Sign in as a student to book this unit. <Link href="/login" className="text-primary hover:underline">{t("common.signIn")}</Link></span>
                </div>
              )}

              {isAvailable && isAuthenticated && !isStudent && (
                <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{t("roomDetail.signUpToBook")}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="check-in">{t("roomDetail.checkInDate")}</Label>
                <input
                  id="check-in"
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  disabled={!isAvailable}
                />
              </div>

              <label className="flex items-start gap-2 pt-1 text-xs" htmlFor="accept-terms">
                <Checkbox id="accept-terms" checked={accept} onCheckedChange={(v) => setAccept(v === true)} className="mt-0.5" disabled={!isAvailable} />
                <span className="text-muted-foreground">
                  {t("roomDetail.acceptTerms")}
                </span>
              </label>

              <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!submitting) setConfirmOpen(open); }}>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" disabled={!isAvailable || !isStudent || !accept || submitting || !pricingReady} onClick={() => setConfirmOpen(true)}>
                    <Lock className="mr-2 h-4 w-4" aria-hidden />
                    {t("roomDetail.placeHold")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("roomDetail.confirmHold")} — Unit {room.identifier}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("roomDetail.holdPlaced.description")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={submitting}>{t("common.cancel")}</AlertDialogCancel>
                    <Button
                      onClick={handleBooking}
                      disabled={submitting}
                    >
                      {submitting ? "…" : t("roomDetail.confirmHold")}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {!isAuthenticated && (
                <p className="text-xs text-muted-foreground">
                  <Link href="/login" className="text-primary hover:underline">{t("common.signIn")}</Link>{" "}
                  <Link href="/register" className="text-primary hover:underline">{t("common.signUp")}</Link>
                </p>
              )}

              {isAuthenticated && !isSupabaseAuth && (
                <p className="rounded-md bg-warning/10 p-2 text-xs text-warning-foreground">
                  Please sign in with a real account to book this room.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader><CardTitle className="text-base">{t("roomDetail.pricingBreakdown")}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {pricingError ? (
                <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    {t("roomDetail.pricingUnavailable")}
                  </span>
                </div>
              ) : !pricingReady ? (
                <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{t("common.loading")}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("roomDetail.baseRent")}</span><span>{formatNgn(baseRent)}</span></div>
                  {(room.additional_charges ?? []).map((c) => (
                    <div key={c.id} className="flex justify-between text-muted-foreground">
                      <span>{c.label} <span className="text-xs">({c.frequency})</span></span>
                      <span>{formatNgn(c.amount_kobo)}</span>
                    </div>
                  ))}
                  {cautionDeposit > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("roomDetail.cautionDeposit")}</span><span>{formatNgn(cautionDeposit)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("roomDetail.serviceFee")} ({serviceFeeRatePct}%)</span><span>{formatNgn(serviceFee)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>{t("roomDetail.total")}</span><span>{formatNgn(total)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ─── Room Image Gallery (with video + 360 panorama support) ─────────
// A carousel that shows all unit_images for a room. Supports three media
// types: image (default), video (HTML5 player), and panorama (drag-to-pan
// 360 viewer). Media type is determined by the `media_type` column added
// in migration 0034.

interface RoomImage {
  id: string;
  public_url: string | null;
  storage_path: string;
  alt_text: string;
  position: number;
  media_type?: "image" | "video" | "panorama";
  video_url?: string | null;
  panorama_url?: string | null;
}

// Simple drag-to-pan 360 panorama viewer (no external library needed).
function PanoramaViewer({ src, alt }: { src: string; alt: string }) {
  const [offset, setOffset] = React.useState(0);
  const draggingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const startOffsetRef = React.useRef(0);

  function onPointerDown(e: React.PointerEvent) {
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startOffsetRef.current = offset;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const delta = e.clientX - startXRef.current;
    const newOffset = Math.min(0, Math.max(-50, startOffsetRef.current + delta / 8));
    setOffset(newOffset);
  }
  function onPointerUp() {
    draggingRef.current = false;
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden touch-none"
      style={{ cursor: draggingRef.current ? "grabbing" : "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute top-0 h-full select-none"
        style={{
          width: "200%",
          left: 0,
          transform: `translateX(${offset}%)`,
          transition: draggingRef.current ? "none" : "transform 0.3s ease",
          objectFit: "cover",
        }}
        draggable={false}
      />
      {/* Drag hint */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
        ← Drag to look around →
      </div>
    </div>
  );
}

// Media type badge for thumbnails
function MediaBadge({ type }: { type?: string }) {
  if (!type || type === "image") return null;
  const config: Record<string, { label: string; icon: string }> = {
    video: { label: "Video", icon: "🎬" },
    panorama: { label: "360°", icon: "🌐" },
  };
  const c = config[type];
  if (!c) return null;
  return (
    <span className="absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">
      {c.icon} {c.label}
    </span>
  );
}

function RoomImageGallery({ images, identifier }: { images: RoomImage[]; identifier: string }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const sorted = [...images].sort((a, b) => a.position - b.position);

  if (sorted.length === 0) {
    return (
      <div className="mt-6 flex aspect-[16/9] items-center justify-center rounded-xl border border-border bg-muted">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageOff className="h-8 w-8" aria-hidden />
          <p className="text-sm">No photos available for this unit yet</p>
          <p className="text-xs">Ask the landlord to upload photos, or schedule a visit.</p>
        </div>
      </div>
    );
  }

  const current = sorted[activeIndex];
  const mediaType = current.media_type ?? "image";

  function goPrev() {
    setActiveIndex((i) => (i === 0 ? sorted.length - 1 : i - 1));
  }
  function goNext() {
    setActiveIndex((i) => (i === sorted.length - 1 ? 0 : i + 1));
  }

  return (
    <div className="mt-6 space-y-3">
      {/* Main media display */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted">
        {mediaType === "video" && current.video_url ? (
          // Video player
          <video
            src={current.video_url}
            poster={current.public_url ?? undefined}
            controls
            className="h-full w-full object-cover"
            aria-label={current.alt_text || `Unit ${identifier} — video`}
          />
        ) : mediaType === "panorama" && (current.panorama_url ?? current.public_url) ? (
          // 360 panorama viewer
          <PanoramaViewer
            src={current.panorama_url ?? current.public_url!}
            alt={current.alt_text || `Unit ${identifier} — 360° view`}
          />
        ) : current.public_url ? (
          // Regular image
          <Image
            src={current.public_url}
            alt={current.alt_text || `Unit ${identifier} — photo ${activeIndex + 1}`}
            fill
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <DoorOpen className="h-10 w-10" aria-hidden />
          </div>
        )}

        {/* Prev/Next buttons (only if more than 1 item) */}
        {sorted.length > 1 && mediaType !== "video" && (
          <>
            <button
              onClick={goPrev}
              aria-label="Previous"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-sm backdrop-blur-sm transition-all hover:scale-110 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              onClick={goNext}
              aria-label="Next"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-sm backdrop-blur-sm transition-all hover:scale-110 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>

            {/* Counter */}
            <div className="absolute bottom-3 right-3 rounded-md bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
              {activeIndex + 1} / {sorted.length}
            </div>
          </>
        )}

        {/* Media type indicator (top-left) */}
        {mediaType !== "image" && (
          <div className="absolute left-3 top-3 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
            {mediaType === "video" ? "🎬 Video" : "🌐 360° Tour"}
          </div>
        )}
      </div>

      {/* Thumbnail strip (only if more than 1 item) */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sorted.map((img, i) => {
            const mt = img.media_type ?? "image";
            const thumbUrl = mt === "video" ? img.public_url : (img.panorama_url ?? img.public_url);
            return (
              <button
                key={img.id}
                onClick={() => setActiveIndex(i)}
                aria-label={`View ${mt} ${i + 1}`}
                aria-pressed={i === activeIndex}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                  i === activeIndex
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border opacity-60 hover:opacity-100"
                }`}
              >
                {thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <DoorOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                )}
                <MediaBadge type={mt} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
