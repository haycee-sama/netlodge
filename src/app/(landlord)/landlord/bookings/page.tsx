"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarCheck, Building2, DoorOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { bookings as allBookings, properties as allProperties, rooms as allRooms } from "@/lib/data/fixtures";
import type { Booking } from "@/lib/types";
import { formatNgn, formatDate, formatRelativeTime } from "@/lib/utils/format";

export default function LandlordBookingsPage() {
  const { session } = useAuth();
  const [bookings, setBookings] = React.useState<Booking[]>([]);

  React.useEffect(() => {
    if (!session) return;
    getRepositories().bookings.listByLandlord(session.userId || "dev_landlord_1").then(setBookings);
  }, [session]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Bookings"
        title="All bookings"
        description="Every booking across all your properties — pending, confirmed, active and historical."
      />

      {bookings.length === 0 ? (
        <EmptyState icon={<CalendarCheck className="h-5 w-5" aria-hidden />} title="No bookings yet" description="Bookings will appear here as students reserve rooms." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {bookings.map((b) => {
                const property = allProperties.find((p) => p.id === b.propertyId);
                const room = allRooms.find((r) => r.id === b.rentableUnitId);
                return (
                  <li key={b.id}>
                    <Link href={`/landlord/bookings/${b.id}`} className="flex flex-col gap-3 p-4 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{property?.name}</p>
                          <BookingStatusBadge status={b.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {b.reference} · Unit {room?.identifier} · {formatRelativeTime(b.createdAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Check-in {formatDate(b.checkIn)} → Check-out {formatDate(b.checkOut)}
                        </p>
                      </div>
                      <Price kobo={b.totalKobo} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
