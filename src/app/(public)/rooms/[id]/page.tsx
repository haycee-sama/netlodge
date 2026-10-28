"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, DoorOpen, BedDouble, Bath, Users, Maximize, Loader2,
  CheckCircle2, Lock, AlertCircle, Calendar,
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
import { fetchRentableUnitById, createBooking, type RentableUnitWithRelations } from "@/lib/supabase/property-service";
import { UNIT_TYPE_LABELS, RENTAL_PERIOD_LABELS } from "@/lib/types";
import { formatNgn } from "@/lib/utils/format";
import { toast } from "sonner";

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

export default function RoomDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [room, setRoom] = React.useState<RentableUnitWithRelations | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [checkIn, setCheckIn] = React.useState("");
  const [accept, setAccept] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    if (!params.id) return;
    fetchRentableUnitById(params.id).then((res) => {
      if (res.error || !res.data) {
        setError(res.error ?? "Room not found");
      } else {
        setRoom(res.data);
      }
      setLoading(false);
    });
  }, [params.id]);

  // Calculate pricing
  const baseRent = room?.annual_rent_kobo ?? 0;
  const additionalCharges = (room?.additional_charges ?? [])
    .filter((c) => c.frequency !== "one_time")
    .reduce((s, c) => s + c.amount_kobo, 0);
  const cautionDeposit = room?.caution_deposit_kobo ?? 0;
  const serviceFee = Math.round(baseRent * 0.05);
  const total = baseRent + additionalCharges + cautionDeposit + serviceFee;

  const isAvailable = room?.status === "available";
  const isStudent = session?.role === "student";
  const isAuthenticated = !!session;
  const isSupabaseAuth = session?.authenticated === true;

  async function handleBooking() {
    console.log('[booking] handleBooking called, room:', !!room, 'session:', !!session, 'checkIn:', checkIn, 'isSupabaseAuth:', isSupabaseAuth);
    if (!room || !session) return;
    if (!checkIn) {
      toast.error("Choose a check-in date");
      setConfirmOpen(false);
      return;
    }
    if (!accept) {
      toast.error("Please accept the booking terms");
      setConfirmOpen(false);
      return;
    }
    if (!isSupabaseAuth) {
      toast.error("Please sign in to book", {
        description: "You need a NetLodge account to place a booking.",
      });
      setConfirmOpen(false);
      return;
    }

    setSubmitting(true);
    try {
      const checkOut = new Date(checkIn);
      checkOut.setFullYear(checkOut.getFullYear() + 1);

      console.log('[booking] calling createBooking with:', { unitId: room.id, checkIn, checkOut: checkOut.toISOString().slice(0, 10) });

      const result = await createBooking({
        studentId: session.userId,
        unitId: room.id,
        checkIn,
        checkOut: checkOut.toISOString().slice(0, 10),
        rentalPeriod: room.rental_period,
        baseRentKobo: baseRent,
        additionalChargesKobo: additionalCharges,
        cautionDepositKobo: cautionDeposit,
        serviceFeeKobo: serviceFee,
        totalKobo: total,
      });

      console.log('[booking] result:', result);

      if (result.error) {
        toast.error("Booking failed", { description: result.error });
        setConfirmOpen(false);
      } else if (result.data) {
        toast.success("Hold placed", {
          description: `Booking reserved for 24 hours pending payment.`,
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
            <p className="mt-2 font-medium">{error ?? "Room not found"}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/properties">Browse properties</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/properties"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to properties</Link>
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
              <div><p className="text-xs text-muted-foreground">Bedrooms</p><p className="font-semibold">{room.bedrooms}</p></div>
            </CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4">
              <Bath className="h-5 w-5 text-primary" aria-hidden />
              <div><p className="text-xs text-muted-foreground">Bathrooms</p><p className="font-semibold">{room.bathrooms}</p></div>
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
            <CardHeader><CardTitle className="text-base">Inside this unit</CardTitle></CardHeader>
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
            <CardHeader><CardTitle className="text-base">Book this unit</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!isAvailable && (
                <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>This unit is currently <strong>{room.status.replace(/_/g, " ")}</strong>.</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="check-in">Check-in date</Label>
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
                  I accept the <Link href="/terms" className="text-primary hover:underline">booking terms</Link> and understand a hold is reserved for 24 hours pending payment.
                </span>
              </label>

              <AlertDialog open={confirmOpen} onOpenChange={(open) => {
                console.log('[booking] onOpenChange:', open, 'submitting:', submitting);
                if (!submitting) setConfirmOpen(open);
              }}>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" disabled={!isAvailable || !accept || submitting} onClick={() => setConfirmOpen(true)}>
                    <Lock className="mr-2 h-4 w-4" aria-hidden />
                    Place hold & continue
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm hold on unit {room.identifier}</AlertDialogTitle>
                    <AlertDialogDescription>
                      A 24-hour hold will be placed on this unit. You'll be taken to your bookings to complete payment.
                      The hold is released automatically if payment isn't received in time.
                      <br /><br />
                      Booking a hold does <strong>not</strong> reserve the unit permanently — only a successful payment confirmed by our backend confirms your booking.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                    <Button
                      onClick={handleBooking}
                      disabled={submitting}
                    >
                      {submitting ? "Placing hold…" : "Place hold"}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {!isAuthenticated && (
                <p className="text-xs text-muted-foreground">
                  <Link href="/login" className="text-primary hover:underline">Sign in</Link> or{" "}
                  <Link href="/register" className="text-primary hover:underline">register</Link> to book.
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
            <CardHeader><CardTitle className="text-base">Pricing breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Annual rent</span><span>{formatNgn(baseRent)}</span></div>
              {(room.additional_charges ?? []).map((c) => (
                <div key={c.id} className="flex justify-between text-muted-foreground">
                  <span>{c.label} <span className="text-xs">({c.frequency})</span></span>
                  <span>{formatNgn(c.amount_kobo)}</span>
                </div>
              ))}
              {cautionDeposit > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Caution deposit (refundable)</span><span>{formatNgn(cautionDeposit)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Service fee (5%)</span><span>{formatNgn(serviceFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Estimated total</span><span>{formatNgn(total)}</span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
