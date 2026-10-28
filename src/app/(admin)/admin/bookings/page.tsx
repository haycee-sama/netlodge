"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

export default function AdminBookingsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    let query = supabase.from("bookings").select("id, reference, status, total_kobo, outstanding_kobo, check_in, check_out, created_at, properties(name), rentable_units(identifier)").order("created_at", { ascending: false }).limit(100);
    if (status !== "all") query = query.eq("status", status);
    if (q) query = query.or(`reference.ilike.%${q}%`);
    query.then(({ data, error }) => {
      if (error) setError(error.message);
      else setRows(data ?? []);
      setLoading(false);
    });
  }, [isSupabaseAuth, session, q, status]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-7xl"><AdminPageHeader title="Bookings" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Platform oversight" title="Bookings" description="All bookings across the platform." breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Bookings" }]} />
      <Card><CardContent className="flex flex-wrap items-center gap-2 p-4">
        <Input placeholder="Search reference…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-48" />
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">All statuses</SelectItem><SelectItem value="pending_payment">Pending payment</SelectItem><SelectItem value="payment_initiated">Payment initiated</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="expired">Expired</SelectItem>
        </SelectContent></Select>
        <Button variant="ghost" size="sm" className="h-9 ml-auto" onClick={() => window.location.reload()} disabled={loading}>{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}</Button>
      </CardContent></Card>
      {error ? <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No bookings found.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((b) => (
              <li key={b.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{b.properties?.name ?? "Property"}</p><BookingStatusBadge status={b.status} /></div>
                  <p className="text-xs text-muted-foreground">{b.reference} · Unit {b.rentable_units?.identifier ?? "—"} · {formatRelativeTime(b.created_at)}</p>
                </div>
                <div className="text-right"><Price kobo={b.total_kobo} /><p className="text-xs text-muted-foreground">{b.outstanding_kobo > 0 ? "Outstanding" : "Paid"}</p></div>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
