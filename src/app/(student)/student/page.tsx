"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Heart,
  CalendarCheck,
  CreditCard,
  Bell,
  LifeBuoy,
  ArrowRight,
  Building2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState, SectionHeading } from "@/components/shared/page-components";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { bookings as allBookings, notifications as allNotifications, properties as allProperties } from "@/lib/data/fixtures";
import { formatRelativeTime, formatNgn } from "@/lib/utils/format";
import type { Booking, AppNotification, Property } from "@/lib/types";

export default function StudentDashboardPage() {
  const { session } = useAuth();
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [saved, setSaved] = React.useState<Property[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!session) return;
    const userId = session.userId;
    // For demo, the dev fixtures are tagged to dev_student_1.
    const effectiveUserId = userId || "dev_student_1";
    Promise.all([
      getRepositories().bookings.listByStudent(effectiveUserId),
      getRepositories().notifications.listByUser(effectiveUserId),
      getRepositories().savedProperties.listByUser(effectiveUserId),
    ]).then(([b, n, s]) => {
      setBookings(b);
      setNotifications(n);
      const savedProps = allProperties.filter((p) => s.some((sp) => sp.propertyId === p.id));
      setSaved(savedProps);
      setLoading(false);
    });
  }, [session]);

  const activeBookings = bookings.filter((b) =>
    ["pending_payment", "payment_initiated", "confirmed", "active"].includes(b.status),
  );
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={`Welcome${session ? `, ${session.firstName}` : ""}`}
        title="Student dashboard"
        description="Manage your bookings, payments, saved properties and notifications in one place."
        actions={
          <Button asChild>
            <Link href="/student/search">
              <Search className="mr-2 h-4 w-4" aria-hidden />
              Find accommodation
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active bookings"
          value={activeBookings.length}
          hint="Holds, confirmed & active"
          icon={<CalendarCheck className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label="Saved properties"
          value={saved.length}
          hint="Tap heart on any listing"
          icon={<Heart className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label="Unread notifications"
          value={unreadNotifications}
          hint="Updated just now"
          icon={<Bell className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label="Total spent"
          value={formatNgn(bookings.reduce((s, b) => s + b.paidKobo, 0))}
          hint="Lifetime on NetLodge"
          icon={<CreditCard className="h-4 w-4" aria-hidden />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bookings */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent bookings</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/student/bookings">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading bookings…</p>
            ) : bookings.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
                title="No bookings yet"
                description="Find a verified room and place a hold to get started."
                action={
                  <Button asChild size="sm">
                    <Link href="/student/search">Browse rooms</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {bookings.slice(0, 4).map((b) => {
                  const property = allProperties.find((p) => p.id === b.propertyId);
                  return (
                    <li key={b.id}>
                      <Link
                        href={`/student/bookings/${b.id}`}
                        className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{property?.name ?? "Property"}</p>
                            <BookingStatusBadge status={b.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {b.reference} · {formatRelativeTime(b.createdAt)}
                          </p>
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

        {/* Notifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Notifications</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/student/notifications">All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No notifications</p>
            ) : (
              <ul className="space-y-3">
                {notifications.slice(0, 4).map((n) => (
                  <li key={n.id} className="space-y-0.5">
                    <div className="flex items-start gap-2">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-muted-foreground/40" : "bg-primary"}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                        <p className="text-xs text-muted-foreground/70">{formatRelativeTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Saved properties */}
      <section>
        <SectionHeading
          title="Saved properties"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/student/saved">View all</Link>
            </Button>
          }
        />
        {saved.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<Heart className="h-5 w-5" aria-hidden />}
            title="No saved properties"
            description="Tap the heart icon on any listing to save it for later."
            action={
              <Button asChild size="sm">
                <Link href="/student/search">Browse listings</Link>
              </Button>
            }
          />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {saved.slice(0, 4).map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <Link href={`/properties/${p.slug}`} className="space-y-1">
                    <p className="font-medium leading-tight hover:text-primary">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.publicAddressLine}</p>
                    <Price kobo={p.priceFromKobo} fromLabel period="/yr" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Quick links */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/student/search", icon: Search, label: "Find accommodation" },
          { href: "/student/payments", icon: CreditCard, label: "Payment history" },
          { href: "/student/support", icon: LifeBuoy, label: "Open a ticket" },
          { href: "/student/profile", icon: Sparkles, label: "Complete profile" },
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
