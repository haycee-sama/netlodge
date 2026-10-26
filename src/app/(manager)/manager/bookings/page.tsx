"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarCheck, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { properties as allProperties } from "@/lib/data/fixtures";
import type { Booking } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";

export default function ManagerBookingsPage() {
  const { session } = useAuth();
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    if (!session) return;
    // For demo: surface bookings tied to manager's properties (use fixtures)
    setBookings([]);
    getRepositories().properties.listByManager(session.userId || "dev_manager_1").then(async (ps) => {
      const all: Booking[] = [];
      for (const p of ps) {
        const bks = await getRepositories().bookings.listByProperty(p.id);
        all.push(...bks);
      }
      setBookings(all);
    });
  }, [session]);

  const filtered = q ? bookings.filter((b) => b.reference.toLowerCase().includes(q.toLowerCase())) : bookings;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="Bookings" title="All bookings" description="Every booking across your assigned properties." />
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" placeholder="Search by reference…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={<CalendarCheck className="h-5 w-5" aria-hidden />} title="No bookings" description="No bookings match your search." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {filtered.map((b) => {
                const property = allProperties.find((p) => p.id === b.propertyId);
                return (
                  <li key={b.id}>
                    <Link href={`/manager/bookings/${b.id}`} className="flex items-center justify-between p-4 hover:bg-muted/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{property?.name}</p>
                          <BookingStatusBadge status={b.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{b.reference} · {formatRelativeTime(b.createdAt)}</p>
                      </div>
                      <Price kobo={b.totalKobo} compact />
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
