"use client";

import * as React from "react";
import { BarChart3, TrendingUp, DoorOpen, CalendarCheck, Banknote, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, SectionHeading } from "@/components/shared/page-components";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { properties as allProperties, rooms as allRooms, bookings as allBookings, payouts as allPayouts } from "@/lib/data/fixtures";
import type { Property, Booking, Payout } from "@/lib/types";
import { formatNgn, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

export default function LandlordReportsPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [payouts, setPayouts] = React.useState<Payout[]>([]);

  React.useEffect(() => {
    if (!session) return;
    Promise.all([
      getRepositories().properties.listByLandlord(session.userId || "dev_landlord_1"),
      getRepositories().bookings.listByLandlord(session.userId || "dev_landlord_1"),
      getRepositories().payouts.listByLandlord(session.userId || "dev_landlord_1"),
    ]).then(([p, b, pay]) => {
      setProperties(p);
      setBookings(b);
      setPayouts(pay);
    });
  }, [session]);

  // Property occupancy
  const occupancy = properties.map((p) => ({
    name: p.name,
    total: p.totalUnits,
    occupied: p.occupiedUnits,
    rate: p.totalUnits ? Math.round((p.occupiedUnits / p.totalUnits) * 100) : 0,
  }));

  // Monthly revenue (last 6 months, from payouts)
  const monthlyRevenue: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleString("en-NG", { month: "short" });
    const revenue = payouts
      .filter((p) => p.status === "settled" && p.settledAt && new Date(p.settledAt).getMonth() === d.getMonth())
      .reduce((s, p) => s + p.netKobo, 0);
    monthlyRevenue.push({ month: label, revenue });
  }
  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);

  const totalRevenue = payouts.filter((p) => p.status === "settled").reduce((s, p) => s + p.netKobo, 0);
  const avgOccupancy = occupancy.length ? Math.round(occupancy.reduce((s, o) => s + o.rate, 0) / occupancy.length) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Performance reports"
        description="Occupancy, revenue and booking performance across all your properties."
        actions={
          <Button variant="outline" size="sm" onClick={() => toast.info("Export", { description: "PDF download in production." })}>
            <Download className="mr-2 h-4 w-4" aria-hidden /> Export PDF
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Properties" value={properties.length} icon={<BarChart3 className="h-4 w-4" aria-hidden />} />
        <StatCard label="Avg occupancy" value={`${avgOccupancy}%`} icon={<DoorOpen className="h-4 w-4" aria-hidden />} />
        <StatCard label="Total bookings" value={bookings.length} icon={<CalendarCheck className="h-4 w-4" aria-hidden />} />
        <StatCard label="Net revenue" value={formatNgn(totalRevenue)} icon={<Banknote className="h-4 w-4" aria-hidden />} />
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-primary" aria-hidden />Monthly revenue (settled payouts)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-48 items-end gap-3">
            {monthlyRevenue.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                  style={{ height: `${(m.revenue / maxRevenue) * 100}%`, minHeight: m.revenue > 0 ? "8px" : "2px" }}
                  title={formatNgn(m.revenue)}
                />
                <span className="text-xs text-muted-foreground">{m.month}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Last 6 months · Settled payouts only. Pending payouts are not shown.</p>
        </CardContent>
      </Card>

      {/* Occupancy by property */}
      <section>
        <SectionHeading title="Occupancy by property" />
        <Card className="mt-3">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {occupancy.map((o) => (
                <li key={o.name} className="p-4">
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-medium">{o.name}</p>
                    <span className="text-muted-foreground">{o.occupied}/{o.total} units · {o.rate}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${o.rate >= 80 ? "bg-success" : o.rate >= 50 ? "bg-warning" : "bg-destructive"}`}
                      style={{ width: `${o.rate}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Recent bookings */}
      <section>
        <SectionHeading title="Recent bookings" />
        <Card className="mt-3">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {bookings.slice(0, 6).map((b) => {
                const property = allProperties.find((p) => p.id === b.propertyId);
                return (
                  <li key={b.id} className="flex items-center justify-between p-4 text-sm">
                    <div>
                      <p className="font-medium">{property?.name}</p>
                      <p className="text-xs text-muted-foreground">{b.reference} · {formatDate(b.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Price kobo={b.totalKobo} compact />
                      <Badge variant="outline" className="capitalize text-xs">{b.status.replace("_", " ")}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
