"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  DoorOpen,
  CalendarCheck,
  Banknote,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Plus,
  Receipt,
  BadgeCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState, SectionHeading } from "@/components/shared/page-components";
import {
  BookingStatusBadge,
  PropertyStatusBadge,
  VerificationBadge,
} from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import {
  properties as allProperties,
  bookings as allBookings,
  payouts as allPayouts,
  rooms as allRooms,
} from "@/lib/data/fixtures";
import type { Property, Booking, Payout } from "@/lib/types";
import { formatNgn, formatRelativeTime } from "@/lib/utils/format";

export default function LandlordDashboardPage() {
  const { session } = useAuth();
  const [myProperties, setMyProperties] = React.useState<Property[]>([]);
  const [myBookings, setMyBookings] = React.useState<Booking[]>([]);
  const [myPayouts, setMyPayouts] = React.useState<Payout[]>([]);
  const [verification, setVerification] = React.useState<"approved" | "pending" | "unverified">("approved");

  React.useEffect(() => {
    if (!session) return;
    const landlordId = session.userId || "dev_landlord_1";
    getRepositories().properties.listByLandlord(landlordId).then(setMyProperties);
    getRepositories().bookings.listByLandlord(landlordId).then(setMyBookings);
    getRepositories().payouts.listByLandlord(landlordId).then(setMyPayouts);
    getRepositories().verification.getForLandlord(landlordId).then((v) => setVerification(v.status));
  }, [session]);

  const totalUnits = myProperties.reduce((s, p) => s + p.totalUnits, 0);
  const availableUnits = myProperties.reduce((s, p) => s + p.availableUnits, 0);
  const occupiedUnits = myProperties.reduce((s, p) => s + p.occupiedUnits, 0);
  const heldUnits = myProperties.reduce((s, p) => s + p.heldUnits, 0);
  const pendingBookings = myBookings.filter((b) => ["pending_payment", "payment_initiated"].includes(b.status));
  const confirmedBookings = myBookings.filter((b) => ["confirmed", "active"].includes(b.status));
  const settledKobo = myPayouts.filter((p) => p.status === "settled").reduce((s, p) => s + p.netKobo, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={`Welcome${session ? `, ${session.firstName}` : ""}`}
        title="Landlord dashboard"
        description="Your portfolio at a glance — properties, rooms, bookings and finances."
        actions={
          <Button asChild>
            <Link href="/landlord/properties/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Add property
            </Link>
          </Button>
        }
      />

      {/* Verification banner */}
      {verification !== "approved" && (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 text-warning-foreground" aria-hidden />
              <div>
                <p className="font-medium">Verification {verification === "pending" ? "in progress" : "required"}</p>
                <p className="text-sm text-muted-foreground">
                  You won't be able to publish listings until verification is complete.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/landlord/verification">Complete verification</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total units"
          value={totalUnits}
          hint={`Across ${myProperties.length} ${myProperties.length === 1 ? "property" : "properties"}`}
          icon={<DoorOpen className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label="Available"
          value={availableUnits}
          hint={`${occupiedUnits} occupied · ${heldUnits} on hold`}
          icon={<Building2 className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label="Pending bookings"
          value={pendingBookings.length}
          hint={`${confirmedBookings.length} confirmed`}
          icon={<CalendarCheck className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label="Settled payouts"
          value={formatNgn(settledKobo)}
          hint="Lifetime"
          icon={<Banknote className="h-4 w-4" aria-hidden />}
        />
      </div>

      {/* Properties */}
      <section>
        <SectionHeading
          eyebrow="Portfolio"
          title="Your properties"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/landlord/properties">All properties</Link>
            </Button>
          }
        />
        {myProperties.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<Building2 className="h-5 w-5" aria-hidden />}
            title="No properties yet"
            description="Add your first property to start listing rooms."
            action={
              <Button asChild size="sm">
                <Link href="/landlord/properties/new">
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  Add property
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myProperties.map((p) => (
              <Card key={p.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/landlord/properties/${p.id}`} className="space-y-1">
                      <p className="font-medium leading-tight hover:text-primary">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.publicAddressLine}</p>
                    </Link>
                    <PropertyStatusBadge status={p.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-muted/40 p-2">
                      <p className="font-semibold text-foreground">{p.totalUnits}</p>
                      <p className="text-muted-foreground">Total</p>
                    </div>
                    <div className="rounded-md bg-success/10 p-2">
                      <p className="font-semibold text-success">{p.availableUnits}</p>
                      <p className="text-muted-foreground">Available</p>
                    </div>
                    <div className="rounded-md bg-info/10 p-2">
                      <p className="font-semibold text-info">{p.occupiedUnits}</p>
                      <p className="text-muted-foreground">Occupied</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <Price kobo={p.priceFromKobo} fromLabel period="/yr" />
                    <Link href={`/landlord/properties/${p.id}/rooms`} className="text-primary hover:underline">
                      Manage rooms →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent bookings</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/landlord/bookings">All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {myBookings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No bookings yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {myBookings.slice(0, 4).map((b) => {
                  const property = allProperties.find((p) => p.id === b.propertyId);
                  return (
                    <li key={b.id}>
                      <Link
                        href={`/landlord/bookings/${b.id}`}
                        className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{property?.name}</p>
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
            )}
          </CardContent>
        </Card>

        {/* Recent payouts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent payouts</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/landlord/payouts">All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {myPayouts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No payouts yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {myPayouts.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{p.reference}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.bankAccountMasked} · {formatRelativeTime(p.settledAt ?? p.scheduledFor)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatNgn(p.netKobo)}</p>
                      <Badge variant="outline" className="text-xs capitalize">{p.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/landlord/properties/new", icon: Building2, label: "List a property" },
          { href: "/landlord/rooms/new", icon: DoorOpen, label: "Add a room" },
          { href: "/landlord/transactions", icon: Receipt, label: "View transactions" },
          { href: "/landlord/reports", icon: TrendingUp, label: "View reports" },
        ].map((q) => (
          <Link key={q.href} href={q.href}>
            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <q.icon className="h-4 w-4" aria-hidden />
                </div>
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
