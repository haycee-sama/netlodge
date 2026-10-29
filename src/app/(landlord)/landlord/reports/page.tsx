"use client";

import * as React from "react";
import Link from "next/link";
import { TrendingUp, Wallet, CalendarCheck, Building2, DoorOpen, Loader2, AlertCircle, Download, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState, StatCard } from "@/components/shared/page-components";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatNgn, formatRelativeTime, formatDateTime } from "@/lib/utils/format";
import { exportPaymentsCsv } from "@/lib/utils/csv-export";

interface BookingRow {
  id: string;
  reference: string;
  status: string;
  total_kobo: number;
  paid_kobo: number;
  outstanding_kobo: number;
  created_at: string;
  check_in: string;
  check_out: string;
  rental_period: string;
  properties: { name: string }[] | null;
}

interface LedgerRow {
  id: string;
  entry_type: string;
  reference: string;
  credit_kobo: number;
  debit_kobo: number;
  description: string;
  created_at: string;
}

interface PropertyPerf {
  name: string;
  bookings: number;
  revenue: number;
  occupancy: number;
}

export default function LandlordReportsPage() {
  const { session } = useAuth();
  const [bookings, setBookings] = React.useState<BookingRow[]>([]);
  const [ledger, setLedger] = React.useState<LedgerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth || !session?.userId) { setLoading(false); return; }
    const supabase = createClient();

    Promise.allSettled([
      // Bookings for this landlord's properties
      supabase
        .from("bookings")
        .select(`id, reference, status, total_kobo, paid_kobo, outstanding_kobo, created_at, check_in, check_out, rental_period, properties!inner(name, landlord_id)`)
        .eq("properties.landlord_id", session.userId)
        .order("created_at", { ascending: false })
        .limit(100),
      // Ledger entries (admin-only via RLS, but landlord can see their own
      // via the booking relationship — we fetch through payments)
      supabase
        .from("payments")
        .select(`id, reference, amount_kobo, fee_kobo, net_kobo, status, initiated_at, bookings!inner(properties!inner(landlord_id))`)
        .eq("bookings.properties.landlord_id", session.userId)
        .order("initiated_at", { ascending: false })
        .limit(50),
    ]).then(([bRes, pRes]) => {
      const errors: string[] = [];

      if (bRes.status === "fulfilled" && bRes.value.data) {
        setBookings(bRes.value.data as BookingRow[]);
      } else if (bRes.status === "rejected" || (bRes.status === "fulfilled" && bRes.value.error)) {
        errors.push("bookings");
      }

      if (pRes.status === "fulfilled" && pRes.value.data) {
        // Transform payments into ledger-like rows
        const ledgerRows: LedgerRow[] = (pRes.value.data as any[]).map((p) => ({
          id: p.id,
          entry_type: "payment",
          reference: p.reference,
          credit_kobo: p.status === "successful" ? p.net_kobo : 0,
          debit_kobo: p.fee_kobo || 0,
          description: `${p.reference} — ${p.status} — ${formatNgn(p.amount_kobo)}`,
          created_at: p.initiated_at,
        }));
        setLedger(ledgerRows);
      }

      if (errors.length > 0) {
        setError(`Could not load: ${errors.join(", ")}`);
      }
      setLoading(false);
    });
  }, [isSupabaseAuth, session?.userId]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Reports" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // ─── Analytics calculations ──────────────────────────────────────────
  const confirmedBookings = bookings.filter((b) => ["confirmed", "active", "completed"].includes(b.status));
  const totalRevenue = confirmedBookings.reduce((s, b) => s + (b.paid_kobo ?? 0), 0);
  const outstanding = bookings.reduce((s, b) => s + (b.outstanding_kobo ?? 0), 0);
  const activeCount = bookings.filter((b) => ["confirmed", "active"].includes(b.status)).length;
  const pendingCount = bookings.filter((b) => ["pending_payment", "payment_initiated"].includes(b.status)).length;

  // This month vs last month revenue
  const now = new Date();
  const thisMonth = confirmedBookings.filter((b) => {
    const d = new Date(b.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, b) => s + b.paid_kobo, 0);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = confirmedBookings.filter((b) => {
    const d = new Date(b.created_at);
    return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
  }).reduce((s, b) => s + b.paid_kobo, 0);
  const revenueChange = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;

  // Top performing properties
  const propertyMap = new Map<string, { name: string; bookings: number; revenue: number }>();
  for (const b of confirmedBookings) {
    const name = b.properties?.[0]?.name ?? "Unknown";
    const existing = propertyMap.get(name) ?? { name, bookings: 0, revenue: 0 };
    existing.bookings += 1;
    existing.revenue += b.paid_kobo;
    propertyMap.set(name, existing);
  }
  const topProperties = Array.from(propertyMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Total ledger credits (net income)
  const totalCredits = ledger.reduce((s, l) => s + l.credit_kobo, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Financial reports"
        description="Revenue, occupancy, and transaction history across your portfolio."
        actions={
          <Button variant="outline" size="sm" onClick={() => {
            // Export confirmed bookings as CSV
            const csvRows = confirmedBookings.map((b) => ({
              reference: b.reference,
              status: b.status,
              property: b.properties?.[0]?.name ?? "",
              total: b.total_kobo,
              paid: b.paid_kobo,
              outstanding: b.outstanding_kobo,
              checkIn: b.check_in,
              checkOut: b.check_out,
              period: b.rental_period,
              createdAt: b.created_at,
            }));
            // Simple CSV export
            const headers = Object.keys(csvRows[0] ?? {});
            const csv = [headers.join(","), ...csvRows.map((r) => headers.map((h) => (r as any)[h]).join(","))].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `landlord-report-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="mr-2 h-4 w-4" aria-hidden /> Export CSV
          </Button>
        }
      />

      {error && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-2 p-3 text-xs text-warning-foreground">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Revenue stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={formatNgn(totalRevenue)}
          icon={<TrendingUp className="h-4 w-4 text-success" aria-hidden />}
          hint={`From ${confirmedBookings.length} confirmed bookings`}
        />
        <StatCard
          label="This month"
          value={formatNgn(thisMonth)}
          icon={<Wallet className="h-4 w-4 text-primary" aria-hidden />}
          hint={revenueChange !== 0 ? `${revenueChange > 0 ? "↑" : "↓"} ${Math.abs(revenueChange)}% vs last month` : "No prior data"}
        />
        <StatCard
          label="Outstanding"
          value={formatNgn(outstanding)}
          icon={<Wallet className="h-4 w-4 text-destructive" aria-hidden />}
          hint={`${pendingCount} pending payment`}
        />
        <StatCard
          label="Active bookings"
          value={activeCount}
          icon={<CalendarCheck className="h-4 w-4 text-primary" aria-hidden />}
        />
      </div>

      {/* Top properties */}
      {topProperties.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Top performing properties</h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {topProperties.map((p, i) => (
                  <li key={p.name} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.bookings} booking{p.bookings === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-success">{formatNgn(p.revenue)}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Revenue trend (simple bar chart) */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Monthly revenue</h2>
        <Card>
          <CardContent className="p-4">
            <MonthlyRevenueChart bookings={confirmedBookings} />
          </CardContent>
        </Card>
      </section>

      {/* Transaction ledger */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Transaction history</h2>
        {ledger.length === 0 ? (
          <EmptyState icon={<FileDown className="h-5 w-5" aria-hidden />} title="No transactions yet" description="Payments will appear here when students book your rooms." />
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {ledger.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{l.reference}</p>
                        <Badge variant={l.credit_kobo > 0 ? "default" : "outline"} className="text-xs capitalize">{l.entry_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDateTime(l.created_at)}</p>
                    </div>
                    <div className="text-right">
                      {l.credit_kobo > 0 ? (
                        <p className="text-sm font-semibold text-success">+{formatNgn(l.credit_kobo)}</p>
                      ) : l.debit_kobo > 0 ? (
                        <p className="text-sm font-semibold text-destructive">−{formatNgn(l.debit_kobo)}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recent bookings */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Recent bookings</h2>
        {bookings.length === 0 ? (
          <EmptyState icon={<CalendarCheck className="h-5 w-5" aria-hidden />} title="No bookings" description="Booking data will appear here once students start booking." />
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {bookings.slice(0, 10).map((b) => (
                  <li key={b.id}>
                    <Link href={`/landlord/bookings/${b.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{b.properties?.[0]?.name ?? "Property"}</p>
                          <BookingStatusBadge status={b.status as any} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {b.reference} · {formatRelativeTime(b.created_at)} · {b.rental_period}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatNgn(b.paid_kobo)}</p>
                        {b.outstanding_kobo > 0 && <p className="text-xs text-warning">{formatNgn(b.outstanding_kobo)} due</p>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

// ─── Simple monthly revenue bar chart (no external library) ──────────
function MonthlyRevenueChart({ bookings }: { bookings: BookingRow[] }) {
  const months = React.useMemo(() => {
    const now = new Date();
    const arr: { label: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthBookings = bookings.filter((b) => {
        const bd = new Date(b.created_at);
        return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear();
      });
      arr.push({
        label: d.toLocaleString("en", { month: "short" }),
        revenue: monthBookings.reduce((s, b) => s + b.paid_kobo, 0),
      });
    }
    return arr;
  }, [bookings]);

  const maxRevenue = Math.max(...months.map((m) => m.revenue), 1);

  return (
    <div className="flex items-end gap-2" style={{ height: "160px" }}>
      {months.map((m) => (
        <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-primary/80 transition-all hover:bg-primary"
              style={{
                height: `${(m.revenue / maxRevenue) * 100}%`,
                minHeight: m.revenue > 0 ? "8px" : "2px",
              }}
              title={formatNgn(m.revenue)}
            />
          </div>
          <span className="text-xs text-muted-foreground">{m.label}</span>
          <span className="text-xs font-medium">{m.revenue > 0 ? formatNgn(m.revenue).replace("₦", "₦") : "—"}</span>
        </div>
      ))}
    </div>
  );
}
