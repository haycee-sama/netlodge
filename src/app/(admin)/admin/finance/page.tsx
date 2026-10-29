"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard, SectionHeading } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn } from "@/lib/utils/format";
import { Banknote, Receipt, RotateCcw, AlertTriangle, CheckCircle2, TrendingUp, Wallet, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-components";

interface Metrics {
  gross_volume_kobo: number;
  platform_revenue_kobo: number;
  pending_payouts_count: number;
  pending_payouts_total_kobo: number;
  settled_payouts_total_kobo: number;
  refund_total_kobo: number;
  pending_refunds_count: number;
  failed_txns_count: number;
  success_rate: number;
  total_payments: number;
}

export default function FinanceDashboardPage() {
  const { session } = useAuth();
  const [m, setM] = React.useState<Metrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    fetch("/api/admin/finance/metrics", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setM(data);
        setLoading(false);
      })
      .catch((e) => { setError(e instanceof Error ? e.message : "Network error"); setLoading(false); });
  }, [isSupabaseAuth]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="Finance operations" title="Finance dashboard" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Finance Admin account to view the dashboard.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Finance dashboard"
        description="Real-time financial metrics — gross volume, platform revenue, payouts, refunds, and reconciliation. All figures derived from verified database records."
        breadcrumbs={[{ label: "Finance Admin", href: "/admin/finance" }, { label: "Dashboard" }]}
      />

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : m ? (
        <>
          <section>
            <SectionHeading title="Volume & revenue" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Gross volume" value={formatNgn(m.gross_volume_kobo)} hint="Successful payments only" icon={<TrendingUp className="h-4 w-4" aria-hidden />} />
              <StatCard label="Platform revenue" value={formatNgn(m.platform_revenue_kobo)} hint="Payment fees + payout fees" icon={<Wallet className="h-4 w-4" aria-hidden />} />
              <StatCard label="Success rate" value={`${m.success_rate}%`} hint={`${m.total_payments} total transactions`} icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} />
              <StatCard label="Failed transactions" value={m.failed_txns_count} icon={<AlertTriangle className="h-4 w-4" aria-hidden />} />
            </div>
          </section>

          <section>
            <SectionHeading title="Payouts" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Pending payouts" value={m.pending_payouts_count} hint={`Net: ${formatNgn(m.pending_payouts_total_kobo)}`} icon={<Banknote className="h-4 w-4" aria-hidden />} />
              <StatCard label="Settled payouts (total)" value={formatNgn(m.settled_payouts_total_kobo)} hint="Net amount disbursed" icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} />
              <StatCard label="Refunds completed" value={formatNgn(m.refund_total_kobo)} hint={`${m.pending_refunds_count} pending review`} icon={<RotateCcw className="h-4 w-4" aria-hidden />} />
            </div>
          </section>

          <section>
            <SectionHeading title="Quick links" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: "/admin/finance/transactions", icon: Receipt, label: "Transactions" },
                { href: "/admin/finance/refunds", icon: RotateCcw, label: "Refunds" },
                { href: "/admin/finance/payouts", icon: Banknote, label: "Payouts" },
                { href: "/admin/finance/reconciliation", icon: AlertTriangle, label: "Reconciliation" },
              ].map((q) => (
                <Link key={q.href} href={q.href}>
                  <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><q.icon className="h-4 w-4" aria-hidden /></div>
                      <p className="flex-1 text-sm font-medium">{q.label}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
