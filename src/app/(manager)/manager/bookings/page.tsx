"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

export default function ManagerBookingsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("bookings").select("id, reference, status, total_kobo, outstanding_kobo, check_in, check_out, created_at, properties(name), rentable_units(identifier)").order("created_at", { ascending: false }).then(({ data, error }) => {
      if (error) console.error(error.message);
      setBookings(data ?? []);
      setLoading(false);
    });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><PageHeader title="Bookings" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="Bookings" title="All bookings" description="Bookings across your assigned properties." />
      {bookings.length === 0 ? <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="No bookings" /> : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {bookings.map((b) => (
              <li key={b.id}>
                <button onClick={() => router.push(`/manager/bookings/${b.id}`)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/40">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2"><p className="font-medium">{b.properties?.name ?? "Property"}</p><BookingStatusBadge status={b.status} /></div>
                    <p className="text-xs text-muted-foreground">{b.reference} · Unit {b.rentable_units?.identifier ?? "—"} · {formatRelativeTime(b.created_at)}</p>
                  </div>
                  <div className="text-right"><Price kobo={b.total_kobo} /><p className="text-xs text-muted-foreground">{b.outstanding_kobo > 0 ? "Outstanding" : "Paid"}</p></div>
                </button>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
