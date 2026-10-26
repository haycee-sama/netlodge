"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, DoorOpen, CalendarCheck, ClipboardCheck, ArrowRight, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState, SectionHeading } from "@/components/shared/page-components";
import { RoomStatusBadge, BookingStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { properties as allProperties, rooms as allRooms, bookings as allBookings } from "@/lib/data/fixtures";
import type { Property, Booking } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";

export default function ManagerDashboardPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [bookings, setBookings] = React.useState<Booking[]>([]);

  React.useEffect(() => {
    if (!session) return;
    getRepositories().properties.listByManager(session.userId || "dev_manager_1").then(setProperties);
    // For demo, surface bookings for managed properties
    setBookings(allBookings.filter((b) => properties.some((p) => p.id === b.propertyId)));
  }, [session, properties]);

  const totalRooms = properties.reduce((s, p) => s + p.totalUnits, 0);
  const availableRooms = properties.reduce((s, p) => s + p.availableUnits, 0);
  const activeBookings = bookings.filter((b) => ["pending_payment", "confirmed", "active"].includes(b.status));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={`Welcome${session ? `, ${session.firstName}` : ""}`}
        title="Manager dashboard"
        description="Operate the properties your landlord has assigned to you. You see only what you're permitted to see."
      />

      <Card className="border-info/30 bg-info/5">
        <CardContent className="flex items-start gap-2 p-3 text-xs text-info">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>As a manager, you can manage inventory, bookings, availability and inspections for your assigned properties. You cannot change landlord payout accounts, transfer ownership, view unassigned finances, or approve verification.</span>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned properties" value={properties.length} icon={<Building2 className="h-4 w-4" aria-hidden />} />
        <StatCard label="Total rooms" value={totalRooms} hint={`${availableRooms} available`} icon={<DoorOpen className="h-4 w-4" aria-hidden />} />
        <StatCard label="Active bookings" value={activeBookings.length} icon={<CalendarCheck className="h-4 w-4" aria-hidden />} />
        <StatCard label="Pending inspections" value={2} icon={<ClipboardCheck className="h-4 w-4" aria-hidden />} />
      </div>

      <section>
        <SectionHeading eyebrow="Your assignments" title="Assigned properties" />
        {properties.length === 0 ? (
          <EmptyState className="mt-4" icon={<Building2 className="h-5 w-5" aria-hidden />} title="No assigned properties" description="Your landlord hasn't assigned you to any properties yet." />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <Card key={p.id}>
                <CardContent className="space-y-3 p-5">
                  <Link href={`/manager/properties/${p.id}`} className="block">
                    <p className="font-medium leading-tight hover:text-primary">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.publicAddressLine}</p>
                  </Link>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-muted/40 p-2"><p className="font-semibold">{p.totalUnits}</p><p className="text-muted-foreground">Total</p></div>
                    <div className="rounded-md bg-success/10 p-2"><p className="font-semibold text-success">{p.availableUnits}</p><p className="text-muted-foreground">Available</p></div>
                    <div className="rounded-md bg-info/10 p-2"><p className="font-semibold text-info">{p.occupiedUnits}</p><p className="text-muted-foreground">Occupied</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/manager/rooms", icon: DoorOpen, label: "Manage rooms" },
          { href: "/manager/bookings", icon: CalendarCheck, label: "View bookings" },
          { href: "/manager/availability", icon: ClipboardCheck, label: "Availability" },
          { href: "/manager/inspections", icon: ClipboardCheck, label: "Record inspection" },
        ].map((q) => (
          <Link key={q.href} href={q.href}>
            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><q.icon className="h-4 w-4" aria-hidden /></div>
                <p className="flex-1 text-sm font-medium">{q.label}</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
