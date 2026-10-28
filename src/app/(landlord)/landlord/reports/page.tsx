"use client";

import * as React from "react";
import { Loader2, TrendingUp, Wallet, CalendarCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatNgn, formatRelativeTime } from "@/lib/utils/format";

export default function LandlordReportsPage() {
  const { session } = useAuth();
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from("bookings")
      .select(`id, reference, status, total_kobo, paid_kobo, outstanding_kobo, created_at, properties(name)`)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setBookings(data ?? []);
        setLoading(false);
      });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><PageHeader title="Reports" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const totalRevenue = bookings.filter((b) => ["confirmed", "active", "completed"].includes(b.status)).reduce((s, b) => s + b.paid_kobo, 0);
  const outstanding = bookings.reduce((s, b) => s + (b.outstanding_kobo || 0), 0);
  const activeBookings = bookings.filter((b) => ["confirmed", "active"].includes(b.status)).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="Finances" title="Reports" description="Revenue summary and booking activity across your properties." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="space-y-1 p-5"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" /><p className="text-xs text-muted-foreground">Revenue (received)</p></div><p className="font-display text-2xl font-bold text-success">{formatNgn(totalRevenue)}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 p-5"><div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-destructive" /><p className="text-xs text-muted-foreground">Outstanding</p></div><p className="font-display text-2xl font-bold text-destructive">{formatNgn(outstanding)}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 p-5"><div className="flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Active bookings</p></div><p className="font-display text-2xl font-bold">{activeBookings}</p></CardContent></Card>
      </div>
      {error ? <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : bookings.length === 0 ? (
        <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="No bookings" description="Booking data will appear here once students start booking." />
      ) : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {bookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2"><p className="text-sm font-medium">{b.reference}</p><BookingStatusBadge status={b.status} /></div>
                  <p className="text-xs text-muted-foreground">{b.properties?.name ?? "—"} · {formatRelativeTime(b.created_at)}</p>
                </div>
                <div className="text-right"><p className="text-sm font-medium">{formatNgn(b.paid_kobo)}</p>{b.outstanding_kobo > 0 && <p className="text-xs text-destructive">{formatNgn(b.outstanding_kobo)} due</p>}</div>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
