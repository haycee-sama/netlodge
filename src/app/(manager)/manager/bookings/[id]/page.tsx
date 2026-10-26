"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, DoorOpen, CalendarCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-components";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { bookings as allBookings, properties as allProperties, rooms as allRooms } from "@/lib/data/fixtures";
import { formatNgn, formatDate } from "@/lib/utils/format";

export default function ManagerBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const booking = allBookings.find((b) => b.id === params.id);
  if (!booking) return <div className="mx-auto max-w-5xl"><p className="text-sm text-muted-foreground">Booking not found.</p></div>;
  const property = allProperties.find((p) => p.id === booking.propertyId);
  const room = allRooms.find((r) => r.id === booking.rentableUnitId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/manager/bookings"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to bookings</Link></Button>
      <PageHeader eyebrow={booking.reference} title="Booking detail" description={`Placed ${formatDate(booking.createdAt)}`} />
      <div className="flex items-center gap-2"><BookingStatusBadge status={booking.status} />{property && <span className="text-sm text-muted-foreground">{property.name}</span>}</div>

      <Card>
        <CardHeader><CardTitle className="text-base">Property & unit</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />{property?.name}</div>
          <Separator />
          <div className="flex items-center gap-2"><DoorOpen className="h-4 w-4 text-muted-foreground" aria-hidden />Unit {room?.identifier} ({room?.unitType.replace("_", " ")})</div>
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-muted-foreground">Check-in</p><p className="font-medium">{formatDate(booking.checkIn)}</p></div>
            <div><p className="text-xs text-muted-foreground">Check-out</p><p className="font-medium">{formatDate(booking.checkOut)}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Cost summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{formatNgn(booking.totalKobo)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-success">{formatNgn(booking.paidKobo)}</span></div>
          {booking.outstandingKobo > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="text-destructive">{formatNgn(booking.outstandingKobo)}</span></div>}
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-start gap-2 p-3 text-xs text-muted-foreground">
          <CalendarCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>As a manager you can update booking statuses for assigned properties, but payout and reconciliation details are visible only to the landlord.</span>
        </CardContent>
      </Card>
    </div>
  );
}
