"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarCheck, Search, Loader2, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchStudentBookings } from "@/lib/supabase/property-service";
import { formatRelativeTime, formatDate, formatNgn } from "@/lib/utils/format";

export default function StudentBookingsPage() {
  const { session } = useAuth();
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!session?.userId) {
      setLoading(false);
      return;
    }
    if (!isSupabaseAuth) {
      setLoading(false);
      return;
    }
    fetchStudentBookings(session.userId).then((res) => {
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setBookings(res.data);
      }
      setLoading(false);
    });
  }, [session, isSupabaseAuth]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Booking history"
        title="Your bookings"
        description="Every booking from holds to completed stays — with full payment and status history."
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : !isSupabaseAuth ? (
        <EmptyState
          icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
          title="No bookings yet"
          description="Sign in with a real account to view and create bookings."
          action={<Button asChild><Link href="/login">Sign in</Link></Button>}
        />
      ) : error ? (
        <EmptyState
          icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
          title="Could not load bookings"
          description={error}
          action={<Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>}
        />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
          title="No bookings yet"
          description="Find a verified room and place a hold to start your first booking."
          action={<Button asChild><Link href="/properties">Browse properties</Link></Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {bookings.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/student/bookings/${b.id}`}
                    className="flex flex-col gap-3 p-4 hover:bg-muted/40 transition-colors sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{b.properties?.name ?? "Property"}</p>
                        <BookingStatusBadge status={b.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {b.reference} · Booked {formatRelativeTime(b.created_at)}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>Check-in: {formatDate(b.check_in)}</span>
                        <span>·</span>
                        <span>Check-out: {formatDate(b.check_out)}</span>
                        {b.rentable_units && (
                          <>
                            <span>·</span>
                            <span>Unit {b.rentable_units.identifier}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Price kobo={b.total_kobo} />
                        <p className="text-xs text-muted-foreground">
                          {b.outstanding_kobo > 0 ? "Outstanding" : "Paid in full"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
