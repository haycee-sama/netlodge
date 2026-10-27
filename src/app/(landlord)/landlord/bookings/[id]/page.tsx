"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, DoorOpen, CalendarCheck, CreditCard, ShieldCheck, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-components";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { bookings as allBookings, properties as allProperties, rooms as allRooms } from "@/lib/data/fixtures";
import { formatNgn, formatDate, formatDateTime } from "@/lib/utils/format";
import { getRepositories } from "@/lib/repositories";
import type { Payment } from "@/lib/types";

export default function LandlordBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const booking = allBookings.find((b) => b.id === params.id);
  const [payments, setPayments] = React.useState<Payment[]>([]);

  React.useEffect(() => {
    if (booking) getRepositories().payments.listByBooking(booking.id).then(setPayments);
  }, [booking]);

  if (!booking) {
    return <div className="mx-auto max-w-5xl"><p className="text-sm text-muted-foreground">Booking not found.</p></div>;
  }

  const property = allProperties.find((p) => p.id === booking.propertyId);
  const room = allRooms.find((r) => r.id === booking.rentableUnitId);
  const platformFee = Math.round(booking.totalKobo * 0.05);
  const netToLandlord = booking.paidKobo - platformFee;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/landlord/bookings"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to bookings</Link>
      </Button>

      <PageHeader
        eyebrow={booking.reference}
        title="Booking detail"
        description={`Placed ${formatDate(booking.createdAt)}`}
      />

      <div className="flex items-center gap-2">
        <BookingStatusBadge status={booking.status} />
        {property && <Badge variant="outline">{property.name}</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Property & unit</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Link href={`/landlord/properties/${property?.id}`} className="flex items-center gap-3 hover:text-primary">
                <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span>{property?.name}</span>
              </Link>
              <Separator />
              <Link href={`/landlord/rooms/${room?.id}`} className="flex items-center gap-3 hover:text-primary">
                <DoorOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span>Unit {room?.identifier} ({room?.unitType.replace("_", " ")})</span>
              </Link>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Check-in</p><p className="font-medium">{formatDate(booking.checkIn)}</p></div>
                <div><p className="text-xs text-muted-foreground">Check-out</p><p className="font-medium">{formatDate(booking.checkOut)}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No payment transactions yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{p.reference}</p>
                          <PaymentStatusBadge status={p.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{p.channel} · {formatDateTime(p.initiatedAt)}</p>
                      </div>
                      <p className="text-sm font-medium">{formatNgn(p.amountKobo)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Reconciliation</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Booking total</span><span>{formatNgn(booking.totalKobo)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Paid by student</span><span className="text-success">{formatNgn(booking.paidKobo)}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Platform fee (5%)</span><span className="text-destructive">−{formatNgn(platformFee)}</span></div>
              <div className="flex justify-between font-semibold"><span>Net to landlord</span><span>{formatNgn(netToLandlord)}</span></div>
              {booking.outstandingKobo > 0 && (
                <p className="pt-2 text-xs text-warning-foreground">Student still owes {formatNgn(booking.outstandingKobo)}.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed bg-muted/30">
            <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
              <p>Payouts are released only after this booking is confirmed and reconciled by the backend. The frontend never declares a payout settled.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
