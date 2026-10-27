"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { StatCard } from "@/components/shared/page-components";
import { getRepositories } from "@/lib/repositories";
import { payouts as allPayouts, payments as allPayments, bookings as allBookings } from "@/lib/data/fixtures";
import { refunds as allRefunds } from "@/lib/data/admin-fixtures";
import { formatNgn } from "@/lib/utils/format";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function FinanceReportsPage() {
  const successful = allPayments.filter((p) => p.status === "successful");
  const grossVolume = successful.reduce((s, p) => s + p.amountKobo, 0);
  const paymentFees = successful.reduce((s, p) => s + p.feeKobo, 0);
  const payoutCommissions = allPayouts.reduce((s, p) => s + p.platformFeeKobo, 0);
  const serviceFees = allBookings.reduce((s, b) => s + b.serviceFeeKobo, 0);
  const totalRevenue = paymentFees + payoutCommissions + serviceFees;
  const refundTotal = allRefunds.filter((r) => r.status === "completed").reduce((s, r) => s + r.amountKobo, 0);
  const settledPayouts = allPayouts.filter((p) => p.status === "settled").reduce((s, p) => s + p.netKobo, 0);

  // Monthly revenue (last 6 months from payouts)
  const monthlyRevenue: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleString("en-NG", { month: "short" });
    const revenue = allPayouts
      .filter((p) => p.status === "settled" && p.settledAt && new Date(p.settledAt).getMonth() === d.getMonth())
      .reduce((s, p) => s + p.platformFeeKobo, 0);
    monthlyRevenue.push({ month: label, revenue });
  }
  const maxRev = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Financial reports"
        description="Summary of platform financial performance. All figures derived from transaction data."
        breadcrumbs={[{ label: "Finance", href: "/admin/finance" }, { label: "Reports" }]}
        actions={<Button variant="outline" size="sm" onClick={() => toast.info("Export", { description: "CSV download in production." })}><Download className="mr-2 h-4 w-4" aria-hidden /> Export CSV</Button>}
      />
      <DemoModeBanner />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gross volume" value={formatNgn(grossVolume)} />
        <StatCard label="Total revenue" value={formatNgn(totalRevenue)} />
        <StatCard label="Refunds paid" value={formatNgn(refundTotal)} />
        <StatCard label="Payouts settled" value={formatNgn(settledPayouts)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Monthly commission revenue</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-48 items-end gap-3">
            {monthlyRevenue.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary" style={{ height: `${(m.revenue / maxRev) * 100}%`, minHeight: m.revenue > 0 ? "8px" : "2px" }} title={formatNgn(m.revenue)} />
                <span className="text-xs text-muted-foreground">{m.month}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Payment processing fees retained</span><span>{formatNgn(paymentFees)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Payout commissions</span><span>{formatNgn(payoutCommissions)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Booking service fees</span><span>{formatNgn(serviceFees)}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
