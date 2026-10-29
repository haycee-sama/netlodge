"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Loader2,
  Lock,
  ShieldCheck,
  Heart,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth/auth-context";
import { createBooking } from "@/lib/supabase/property-service";
import { RENTAL_PERIOD_LABELS, type RentableUnit, type Property, type RentalPeriod } from "@/lib/types";
import { formatNgn } from "@/lib/utils/format";
import { toast } from "sonner";

interface RoomBookingCardProps {
  room: RentableUnit;
  property: Property;
}

/**
 * Booking flow initiator — frontend only.
 *
 * This component lets a student *initiate* a booking (which creates a temporary
 * hold via the backend). It never declares a payment successful or a booking
 * confirmed from the browser. Those transitions are backend-controlled.
 */
export function RoomBookingCard({ room, property }: RoomBookingCardProps) {
  const router = useRouter();
  const { session } = useAuth();
  const [checkIn, setCheckIn] = React.useState("");
  // The rental period is the landlord's configured period — students cannot
  // change it. The booking duration is derived from the period type.
  const rentalPeriod = room.rentalPeriod;
  const [accept, setAccept] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const isAvailable = room.status === "available";
  const isAuthenticated = !!session;
  const isStudent = session?.role === "student";

  async function onInitiate() {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/rooms/${room.id}`);
      return;
    }
    if (!isStudent) {
      toast.error("Only student accounts can initiate bookings", {
        description: "Switch to a student account or register as a student.",
      });
      return;
    }
    if (!checkIn) {
      toast.error("Choose a check-in date");
      return;
    }
    if (!accept) {
      toast.error("Please accept the booking terms");
      return;
    }
    setSubmitting(true);
    try {
      // Compute checkOut from the landlord-configured period duration.
      // The server validates this matches the period type (±2 day tolerance).
      const periodDays =
        rentalPeriod === "annual" ? 365 :
        rentalPeriod === "quarterly" ? 91 :
        rentalPeriod === "semester" ? 152 :
        rentalPeriod === "biannual" ? 183 : 30; // legacy fallback
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + periodDays);

      // Only legitimate user inputs are sent. The server computes the
      // authoritative pricing inside create_booking() — the client cannot
      // influence base rent, deposit, service fee, or total.
      const result = await createBooking({
        studentId: session!.userId,
        unitId: room.id,
        checkIn,
        checkOut: checkOut.toISOString().slice(0, 10),
        rentalPeriod: room.rentalPeriod ?? "annual",
      });

      if (result.error) {
        toast.error("Booking failed", { description: result.error });
      } else if (result.data) {
        toast.success("Hold placed", {
          description: "Booking reserved for 24 hours pending payment.",
        });
        router.push(`/student/bookings/${result.data.bookingId}`);
      }
    } catch (e) {
      toast.error("Could not initiate booking", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Book this unit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!isAvailable && (
          <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              This unit is currently <strong>{room.status.replace("_", " ")}</strong>. You can still
              enquire about future availability.
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="check-in">Check-in date</Label>
          <Input
            id="check-in"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Rental period</Label>
          <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
            {RENTAL_PERIOD_LABELS[rentalPeriod] ?? rentalPeriod}
            <span className="ml-2 text-xs text-muted-foreground">
              ({rentalPeriod === "annual" ? "365 days" : rentalPeriod === "quarterly" ? "91 days" : rentalPeriod === "semester" ? "152 days" : "—"})
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Set by the landlord. You book one period at a time.
          </p>
        </div>

        <label className="flex items-start gap-2 pt-1 text-xs" htmlFor="accept-terms">
          <Checkbox
            id="accept-terms"
            checked={accept}
            onCheckedChange={(v) => setAccept(v === true)}
            className="mt-0.5"
          />
          <span className="text-muted-foreground">
            I accept the{" "}
            <Link href="/terms" className="text-primary hover:underline">
              booking terms
            </Link>{" "}
            and understand a hold is reserved for 24 hours pending payment.
          </span>
        </label>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full" disabled={!isAvailable || submitting || !accept}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Placing hold…
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" aria-hidden />
                  Place hold & continue
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm hold on unit {room.identifier}</AlertDialogTitle>
              <AlertDialogDescription className="text-pretty">
                A 24-hour hold will be placed on this unit at{" "}
                <strong>{property.name}</strong>. You'll be taken to your booking page to complete
                payment. The hold is released automatically if payment isn't received in time.
                <br />
                <br />
                Booking a hold does <strong>not</strong> reserve the unit permanently — only a
                successful payment confirmed by our backend confirms your booking.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onInitiate} disabled={submitting}>
                {submitting ? "Placing hold…" : "Place hold"}
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            or{" "}
            <Link href="/register" className="text-primary hover:underline">
              register
            </Link>{" "}
            to book.
          </p>
        )}

        <div className="rounded-md bg-success/10 p-3 text-xs text-success">
          <ShieldCheck className="mr-1 inline h-3 w-3" aria-hidden />
          Verified property · Refundable caution deposit · Backend-confirmed payments.
        </div>
      </CardContent>
    </Card>
  );
}
