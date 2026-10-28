"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search, Heart, CalendarCheck, CreditCard, Bell, LifeBuoy,
  ArrowRight, Building2, Sparkles, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState, SectionHeading } from "@/components/shared/page-components";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime, formatNgn } from "@/lib/utils/format";

interface StudentBooking {
  id: string;
  reference: string;
  status: string;
  total_kobo: number;
  outstanding_kobo: number;
  check_in: string;
  check_out: string;
  created_at: string;
  rentable_units?: { identifier: string };
  properties?: { name: string; slug: string };
}

interface StudentNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  href: string | null;
}

interface SavedProperty {
  id: string;
  property_id: string;
  properties?: { id: string; name: string; slug: string; city: string; state: string; price_from_kobo: number };
}

export default function StudentDashboardPage() {
  const { session } = useAuth();
  const [bookings, setBookings] = React.useState<StudentBooking[]>([]);
  const [notifications, setNotifications] = React.useState<StudentNotification[]>([]);
  const [savedCount, setSavedCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    Promise.all([
      supabase.from("bookings")
        .select(`*, rentable_units(identifier), properties(name, slug)`)
        .eq("student_id", session!.userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("notifications")
        .select("*")
        .eq("user_id", session!.userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("saved_properties")
        .select("id, property_id, properties(id, name, slug, city, state, price_from_kobo)")
        .eq("user_id", session!.userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]).then(([bRes, nRes, sRes]) => {
      setBookings((bRes.data as StudentBooking[]) ?? []);
      setNotifications((nRes.data as StudentNotification[]) ?? []);
      setSavedCount(sRes.data?.length ?? 0);
      setLoading(false);
    });
  }, [session, isSupabaseAuth]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader eyebrow="Dashboard" title="Student dashboard" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real account to view your dashboard.
        </CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome, ${session?.firstName}`}
        description="Manage your bookings, payments, saved properties, and support tickets."
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active bookings" value={bookings.filter((b) => ["confirmed", "active", "pending_payment"].includes(b.status)).length} icon={<CalendarCheck className="h-4 w-4" aria-hidden />} />
        <StatCard label="Saved properties" value={savedCount} icon={<Heart className="h-4 w-4" aria-hidden />} />
        <StatCard label="Unread notifications" value={unreadCount} icon={<Bell className="h-4 w-4" aria-hidden />} />
        <StatCard label="Open support" value={0} icon={<LifeBuoy className="h-4 w-4" aria-hidden />} />
      </div>

      {/* Recent bookings */}
      <section>
        <SectionHeading
          title="Recent bookings"
          action={<Button asChild variant="ghost" size="sm"><Link href="/student/bookings">View all</Link></Button>}
        />
        {bookings.length === 0 ? (
          <EmptyState className="mt-4" icon={<CalendarCheck className="h-5 w-5" aria-hidden />} title="No bookings yet" description="Browse properties and place a hold to start your first booking." action={<Button asChild><Link href="/properties">Browse properties</Link></Button>} />
        ) : (
          <Card className="mt-4">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {bookings.map((b) => (
                  <li key={b.id}>
                    <Link href={`/student/bookings/${b.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">{b.properties?.name ?? "Property"}</p>
                        <p className="text-xs text-muted-foreground">{b.reference} · {formatRelativeTime(b.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Price kobo={b.total_kobo} />
                          <p className="text-xs text-muted-foreground">{b.outstanding_kobo > 0 ? "Outstanding" : "Paid"}</p>
                        </div>
                        <BookingStatusBadge status={b.status as any} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recent notifications */}
      {notifications.length > 0 && (
        <section>
          <SectionHeading title="Recent notifications" action={<Button asChild variant="ghost" size="sm"><Link href="/student/notifications">View all</Link></Button>} />
          <Card className="mt-4">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {notifications.map((n) => (
                  <li key={n.id} className={`flex items-start gap-3 p-4 ${!n.read ? "bg-primary/5" : ""}`}>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.body}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(n.created_at)}</p>
                    </div>
                    {!n.read && <Badge variant="outline" className="text-xs text-primary">New</Badge>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Quick links */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/student/search", icon: Search, label: "Search accommodation" },
          { href: "/student/saved", icon: Heart, label: "Saved properties" },
          { href: "/student/payments", icon: CreditCard, label: "Payment history" },
          { href: "/student/support", icon: LifeBuoy, label: "Get support" },
        ].map((q) => (
          <Link key={q.href} href={q.href}>
            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><q.icon className="h-4 w-4" aria-hidden /></div>
                <p className="flex-1 text-sm font-medium">{q.label}</p>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
