"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

interface LandlordBooking {
  id: string;
  reference: string;
  status: string;
  total_kobo: number;
  outstanding_kobo: number;
  check_in: string;
  check_out: string;
  created_at: string;
  rentable_units?: { identifier: string }[];
  properties?: { name: string }[];
}

export default function LandlordBookingsPage() {
  const { session } = useAuth();
  const [bookings, setBookings] = React.useState<LandlordBooking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from("bookings")
      .select(`
        id, reference, status, total_kobo, outstanding_kobo,
        check_in, check_out, created_at,
        rentable_units ( identifier ),
        properties ( name )
      `)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setBookings((data as LandlordBooking[]) ?? []);
        setLoading(false);
      });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader eyebrow="Bookings" title="All bookings" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real landlord account to view bookings.
        </CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader eyebrow="Bookings" title="All bookings" />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

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
              {bookings.map((b) => (
                <li key={b.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{b.properties?.[0]?.name ?? "Property"}</p>
                      <BookingStatusBadge status={b.status as any} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {b.reference} · {b.rentable_units?.[0]?.identifier ?? "Unit"} · {formatRelativeTime(b.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Price kobo={b.total_kobo} />
                    <p className="text-xs text-muted-foreground">{b.outstanding_kobo > 0 ? "Outstanding" : "Paid"}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
