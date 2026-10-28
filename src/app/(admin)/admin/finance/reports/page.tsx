"use client";

import * as React from "react";
import { BarChart3, Loader2, TrendingUp, Wallet, RotateCcw, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn } from "@/lib/utils/format";

export default function AdminFinanceReportsPage() {
  const { session } = useAuth();
  const [metrics, setMetrics] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    fetch("/api/admin/finance/metrics", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setMetrics(data);
        setLoading(false);
      })
      .catch((e) => { setError(e instanceof Error ? e.message : "Network error"); setLoading(false); });
  }, [isSupabaseAuth]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Reports" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Finance operations" title="Reports" description="Financial summary derived from verified payment records." breadcrumbs={[{ label: "Finance Admin", href: "/admin/finance" }, { label: "Reports" }]} />
      {error ? <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : metrics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="space-y-1 p-5"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" /><p className="text-xs text-muted-foreground">Gross volume</p></div><p className="font-display text-2xl font-bold text-success">{formatNgn(metrics.gross_volume_kobo)}</p><p className="text-xs text-muted-foreground">Successful payments only</p></CardContent></Card>
            <Card><CardContent className="space-y-1 p-5"><div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Platform revenue</p></div><p className="font-display text-2xl font-bold">{formatNgn(metrics.platform_revenue_kobo)}</p><p className="text-xs text-muted-foreground">Payment fees + payout fees</p></CardContent></Card>
            <Card><CardContent className="space-y-1 p-5"><div className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-warning-foreground" /><p className="text-xs text-muted-foreground">Refunds completed</p></div><p className="font-display text-2xl font-bold">{formatNgn(metrics.refund_total_kobo)}</p><p className="text-xs text-muted-foreground">{metrics.pending_refunds_count} pending review</p></CardContent></Card>
            <Card><CardContent className="space-y-1 p-5"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /><p className="text-xs text-muted-foreground">Failed transactions</p></div><p className="font-display text-2xl font-bold">{metrics.failed_txns_count}</p><p className="text-xs text-muted-foreground">{metrics.success_rate}% success rate</p></CardContent></Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card><CardContent className="space-y-1 p-5"><p className="text-xs text-muted-foreground">Pending payouts</p><p className="text-xl font-bold">{metrics.pending_payouts_count} ({formatNgn(metrics.pending_payouts_total_kobo)})</p></CardContent></Card>
            <Card><CardContent className="space-y-1 p-5"><p className="text-xs text-muted-foreground">Settled payouts</p><p className="text-xl font-bold text-success">{formatNgn(metrics.settled_payouts_total_kobo)}</p></CardContent></Card>
          </div>
          <Card><CardContent className="p-4 text-xs text-muted-foreground">
            <p><strong className="text-foreground">Definitions:</strong></p>
            <p>• Gross volume = sum of amount_kobo for payments with status='successful' and confirmed_by_backend=true</p>
            <p>• Platform revenue = sum of fee_kobo for successful payments + sum of platform_fee_kobo for settled payouts</p>
            <p>• Refunds = sum of amount_kobo for refunds with status='completed'</p>
            <p>• Pending/failed transactions are NOT counted as revenue</p>
          </CardContent></Card>
        </>
      ) : null}
    </div>
  );
}
