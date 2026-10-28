"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-components";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatNgn, formatDate, formatDateTime } from "@/lib/utils/format";

export default function ManagerBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth();
  const [booking, setBooking] = React.useState<any>(null);
  const [payments, setPayments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth || !params.id) { setLoading(false); return; }
    const supabase = createClient();
    Promise.all([
      supabase.from("bookings").select("*, rentable_units(identifier), properties(name)").eq("id", params.id).single(),
      supabase.from("payments").select("*").eq("booking_id", params.id).order("initiated_at", { ascending: false }),
    ]).then(([bRes, pRes]) => {
      if (bRes.data) setBooking(bRes.data);
      if (pRes.data) setPayments(pRes.data);
      setLoading(false);
    });
  }, [isSupabaseAuth, params.id]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-3xl"><PageHeader title="Booking" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!booking) return <div className="mx-auto max-w-3xl"><Button asChild variant="ghost"><Link href="/manager/bookings">Back</Link></Button><Card><CardContent className="p-6 text-center text-sm text-destructive">Not found.</CardContent></Card></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/manager/bookings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to bookings</Link></Button>
      <PageHeader eyebrow={booking.reference} title="Booking detail" actions={<BookingStatusBadge status={booking.status} />} />
      <Card><CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Property</span><span>{booking.properties?.name ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Unit</span><span>{booking.rentable_units?.identifier ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Check-in</span><span>{formatDate(booking.check_in)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Check-out</span><span>{formatDate(booking.check_out)}</span></div>
        <Separator className="my-2" />
        <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">{formatNgn(booking.total_kobo)}</span></div>
        <div className="flex justify-between text-success"><span className="text-muted-foreground">Paid</span><span>{formatNgn(booking.paid_kobo)}</span></div>
        {booking.outstanding_kobo > 0 && <div className="flex justify-between text-destructive"><span className="text-muted-foreground">Outstanding</span><span>{formatNgn(booking.outstanding_kobo)}</span></div>}
      </CardContent></Card>
      {payments.length > 0 && (
        <Card><CardHeader><CardTitle className="text-base">Payments ({payments.length})</CardTitle></CardHeader><CardContent>
          <ul className="divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div><div className="flex items-center gap-2"><p className="text-sm font-medium">{p.reference}</p><PaymentStatusBadge status={p.status} /></div>
                <p className="text-xs text-muted-foreground">{p.channel} · {formatDateTime(p.initiated_at)}</p></div>
                <p className="text-sm font-medium">{formatNgn(p.amount_kobo)}</p>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
