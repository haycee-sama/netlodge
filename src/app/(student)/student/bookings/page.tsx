"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarCheck, Search, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { properties as allProperties } from "@/lib/data/fixtures";
import type { Booking, BookingStatus } from "@/lib/types";
import { formatDate, formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const statusFilters: { value: "all" | BookingStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "payment_initiated", label: "Payment initiated" },
  { value: "confirmed", label: "Confirmed" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function StudentBookingsPage() {
  const { session } = useAuth();
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<"all" | BookingStatus>("all");

  React.useEffect(() => {
    if (!session) return;
    getRepositories()
      .bookings.listByStudent(session.userId || "dev_student_1")
      .then((b) => {
        setBookings(b);
        setLoading(false);
      });
  }, [session]);

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Booking history"
        title="Your bookings"
        description="Every booking from holds to completed stays — with full payment and status history."
      />

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
          title={filter === "all" ? "No bookings yet" : `No ${filter.replace("_", " ")} bookings`}
          description={filter === "all"
            ? "Find a verified room and place a hold to start your first booking."
            : "Try changing the filter above."}
          action={
            <Button asChild>
              <Link href="/student/search">
                <Search className="mr-2 h-4 w-4" aria-hidden />
                Find accommodation
              </Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {filtered.map((b) => {
                const property = allProperties.find((p) => p.id === b.propertyId);
                return (
                  <li key={b.id}>
                    <Link
                      href={`/student/bookings/${b.id}`}
                      className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{property?.name ?? "Property"}</p>
                          <BookingStatusBadge status={b.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {b.reference} · Booked {formatRelativeTime(b.createdAt)}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Check-in: {formatDate(b.checkIn)}</span>
                          <span>·</span>
                          <span>Check-out: {formatDate(b.checkOut)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Price kobo={b.totalKobo} />
                          <p className="text-xs text-muted-foreground">
                            {b.outstandingKobo > 0 ? "Outstanding" : "Paid in full"}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                      </div>
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
