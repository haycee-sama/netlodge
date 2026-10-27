"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { StatCard, SectionHeading, EmptyState } from "@/components/shared/page-components";
import { PayoutStatusBadge, RefundStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { getRepositories } from "@/lib/repositories";
import { payouts as allPayouts, payments as allPayments } from "@/lib/data/fixtures";
import { refunds as allRefunds } from "@/lib/data/admin-fixtures";
import type { Payout, Payment, Refund } from "@/lib/types";
import { formatRelativeTime, formatNgn } from "@/lib/utils/format";
import { Banknote, Receipt, RotateCcw, AlertTriangle, CheckCircle2, TrendingUp, Scale, Wallet } from "lucide-react";

export default function FinanceDashboardPage() {
  const [payouts, setPayouts] = React.useState<Payout[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [refunds, setRefunds] = React.useState<Refund[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      getRepositories().payouts.listAll({ pageSize: 100 }),
      getRepositories().payments.listAll({ pageSize: 100 }),
      getRepositories().refunds.listAll({ pageSize: 100 }),
    ]).then(([p, pay, r]) => {
      setPayouts(p.items); setPayments(pay.items); setRefunds(r.items); setLoading(false);
    });
  }, []);

  const grossVolume = payments.filter((p) => p.status === "successful").reduce((s, p) => s + p.amountKobo, 0);
  const platformRevenue = payments.filter((p) => p.status === "successful").reduce((s, p) => s + p.feeKobo, 0) + allPayouts.reduce((s, p) => s + p.platformFeeKobo, 0);
  const pendingPayouts = payouts.filter((p) => p.status === "scheduled" || p.status === "in_flight");
  const pendingPayoutsTotal = pendingPayouts.reduce((s, p) => s + p.netKobo, 0);
  const completedPayouts = payouts.filter((p) => p.status === "settled");
  const completedPayoutsTotal = completedPayouts.reduce((s, p) => s + p.netKobo, 0);
  const refundTotal = refunds.filter((r) => r.status === "completed").reduce((s, r) => s + r.amountKobo, 0);
  const failedTxns = payments.filter((p) => p.status === "failed").length;
  const successRate = payments.length > 0 ? Math.round((payments.filter((p) => p.status === "successful").length / payments.length) * 100) : 0;
  const pendingRefunds = refunds.filter((r) => r.status === "requested" || r.status === "under_review");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Finance dashboard"
        description="Monitor payments, commissions, refunds, payouts, and reconciliation across the platform."
        breadcrumbs={[{ label: "Finance", href: "/admin/finance" }, { label: "Dashboard" }]}
        actions={
          <Button asChild variant="outline"><Link href="/admin/finance/reconciliation"><Scale className="mr-2 h-4 w-4" aria-hidden /> Run reconciliation</Link></Button>
        }
      />

      <DemoModeBanner message="All financial figures are derived from fixture data. Approving a payout or refund updates local state and records a demo audit entry — no real money movement occurs. In production, every financial action is executed through Paystack and independently verified." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gross volume" value={formatNgn(grossVolume)} hint="Successful payments" icon={<TrendingUp className="h-4 w-4" aria-hidden />} />
        <StatCard label="Platform revenue" value={formatNgn(platformRevenue)} hint="Fees + commission" icon={<Wallet className="h-4 w-4" aria-hidden />} />
        <StatCard label="Pending payouts" value={formatNgn(pendingPayoutsTotal)} hint={`${pendingPayouts.length} awaiting`} icon={<Banknote className="h-4 w-4" aria-hidden />} />
        <StatCard label="Refunds (completed)" value={formatNgn(refundTotal)} hint={`${refunds.filter((r) => r.status === "completed").length} refunds`} icon={<RotateCcw className="h-4 w-4" aria-hidden />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Completed payouts" value={formatNgn(completedPayoutsTotal)} hint={`${completedPayouts.length} settled`} icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} />
        <StatCard label="Failed transactions" value={failedTxns} icon={<AlertTriangle className="h-4 w-4" aria-hidden />} />
        <StatCard label="Payment success rate" value={`${successRate}%`} icon={<TrendingUp className="h-4 w-4" aria-hidden />} />
        <StatCard label="Pending refund reviews" value={pendingRefunds.length} icon={<Receipt className="h-4 w-4" aria-hidden />} />
      </div>

      <section>
        <SectionHeading eyebrow="Awaiting approval" title="Pending payouts" action={<Button asChild variant="ghost" size="sm"><Link href="/admin/finance/payouts">View all</Link></Button>} />
        {pendingPayouts.length === 0 ? (
          <EmptyState className="mt-4" icon={<CheckCircle2 className="h-5 w-5" aria-hidden />} title="No pending payouts" description="All payouts have been processed." />
        ) : (
          <Card className="mt-4"><CardContent className="p-0">
            <ul className="divide-y divide-border">
              {pendingPayouts.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/finance/payouts/${p.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                    <div className="min-w-0"><p className="font-mono text-xs font-medium">{p.reference}</p><p className="text-xs text-muted-foreground">{p.bankAccountMasked} · scheduled {formatRelativeTime(p.scheduledFor)}</p></div>
                    <div className="flex items-center gap-3"><Price kobo={p.netKobo} /><PayoutStatusBadge status={p.status} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent></Card>
        )}
      </section>

      <section>
        <SectionHeading eyebrow="Awaiting review" title="Refund requests" action={<Button asChild variant="ghost" size="sm"><Link href="/admin/finance/refunds">View all</Link></Button>} />
        {pendingRefunds.length === 0 ? (
          <EmptyState className="mt-4" icon={<CheckCircle2 className="h-5 w-5" aria-hidden />} title="No pending refunds" description="All refund requests have been reviewed." />
        ) : (
          <Card className="mt-4"><CardContent className="p-0">
            <ul className="divide-y divide-border">
              {pendingRefunds.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link href="/admin/finance/refunds" className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                    <div className="min-w-0"><p className="font-mono text-xs font-medium">{r.reference}</p><p className="text-xs text-muted-foreground">{r.reason.replace(/_/g, " ")} · requested {formatRelativeTime(r.createdAt)}</p></div>
                    <div className="flex items-center gap-3"><Price kobo={r.amountKobo} /><RefundStatusBadge status={r.status} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent></Card>
        )}
      </section>

      <section>
        <SectionHeading eyebrow="Activity" title="Recent transactions" action={<Button asChild variant="ghost" size="sm"><Link href="/admin/finance/transactions">View all</Link></Button>} />
        <Card className="mt-4"><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {payments.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link href={`/admin/finance/transactions/${p.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                  <div className="min-w-0"><p className="font-mono text-xs font-medium">{p.reference}</p><p className="text-xs text-muted-foreground">{p.channel.toUpperCase()} · {formatRelativeTime(p.initiatedAt)}</p></div>
                  <div className="flex items-center gap-3"><Price kobo={p.amountKobo} /><PaymentStatusBadge status={p.status} /></div>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      </section>
    </div>
  );
}
