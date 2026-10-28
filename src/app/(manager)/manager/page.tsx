"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, DoorOpen, CalendarCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, StatCard, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

export default function ManagerDashboardPage() {
  const { session } = useAuth();
  const [stats, setStats] = React.useState({ properties: 0, rooms: 0, activeBookings: 0 });
  const [recentBookings, setRecentBookings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    // RLS scopes to assigned properties via can_access_property
    Promise.all([
      supabase.from("properties").select("id").then(),
      supabase.from("rentable_units").select("id").then(),
      supabase.from("bookings").select("id, reference, status, total_kobo, created_at, properties(name)").order("created_at", { ascending: false }).limit(5).then(),
    ]).then(([pRes, rRes, bRes]) => {
      setStats({
        properties: pRes.data?.length ?? 0,
        rooms: rRes.data?.length ?? 0,
        activeBookings: (bRes.data ?? []).filter((b: any) => ["confirmed", "active", "pending_payment"].includes(b.status)).length,
      });
      setRecentBookings(bRes.data ?? []);
      setLoading(false);
    });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-7xl"><PageHeader title="Manager dashboard" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="Manager dashboard" title="Operations overview" description="Manage assigned properties, rooms, and bookings." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned properties" value={stats.properties} icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="Total rooms" value={stats.rooms} icon={<DoorOpen className="h-4 w-4" />} />
        <StatCard label="Active bookings" value={stats.activeBookings} icon={<CalendarCheck className="h-4 w-4" />} />
      </div>
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Recent bookings</h2>
        {recentBookings.length === 0 ? (
          <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="No bookings" description="Bookings on your assigned properties will appear here." />
        ) : (
          <Card><CardContent className="p-0">
            <ul className="divide-y divide-border">
              {recentBookings.map((b) => (
                <li key={b.id}><Link href={`/manager/bookings/${b.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                  <div><p className="font-medium">{b.properties?.name ?? "Property"}</p><p className="text-xs text-muted-foreground">{b.reference} · {formatRelativeTime(b.created_at)}</p></div>
                  <span className="text-xs capitalize">{b.status.replace(/_/g, " ")}</span>
                </Link></li>
              ))}
            </ul>
          </CardContent></Card>
        )}
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/manager/properties"><Card className="hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><Building2 className="h-5 w-5 text-primary" /><span className="text-sm font-medium">Properties</span></CardContent></Card></Link>
        <Link href="/manager/rooms"><Card className="hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><DoorOpen className="h-5 w-5 text-primary" /><span className="text-sm font-medium">Rooms</span></CardContent></Card></Link>
        <Link href="/manager/bookings"><Card className="hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><CalendarCheck className="h-5 w-5 text-primary" /><span className="text-sm font-medium">Bookings</span></CardContent></Card></Link>
      </div>
    </div>
  );
}
