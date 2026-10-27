"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { StatCard } from "@/components/shared/page-components";
import { Price } from "@/components/shared/price";
import { getRepositories } from "@/lib/repositories";
import { payouts as allPayouts, payments as allPayments, bookings as allBookings } from "@/lib/data/fixtures";
import { formatNgn } from "@/lib/utils/format";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FinanceCommissionsPage() {
  const [settings, setSettings] = React.useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getRepositories().platformSettings.listByCategory("commission").then((s) => {
      setSettings(s.map((x) => ({ value: x.value, label: x.label })));
      setLoading(false);
    });
  }, []);

  // Commission revenue = sum of (platformFeeKobo) from payouts + (feeKobo) from successful payments
  const payoutCommission = allPayouts.reduce((s, p) => s + p.platformFeeKobo, 0);
  const paymentFees = allPayments.filter((p) => p.status === "successful").reduce((s, p) => s + p.feeKobo, 0);
  // Service fees from bookings
  const serviceFees = allBookings.reduce((s, b) => s + b.serviceFeeKobo, 0);
  const totalRevenue = payoutCommission + paymentFees + serviceFees;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Commissions"
        description="Platform commission revenue and rate configuration."
        breadcrumbs={[{ label: "Finance", href: "/admin/finance" }, { label: "Commissions" }]}
      />
      <DemoModeBanner />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Payout commissions" value={formatNgn(payoutCommission)} hint="From landlord payouts" />
        <StatCard label="Payment fees" value={formatNgn(paymentFees)} hint="Paystack processing fees retained" />
        <StatCard label="Booking service fees" value={formatNgn(serviceFees)} hint="Charged to students" />
        <StatCard label="Total revenue" value={formatNgn(totalRevenue)} hint="All sources" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Commission configuration</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            settings.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{s.label}</p>
                </div>
                <Badge variant="outline" className="text-sm">{s.value}{s.label.includes("rate") ? "%" : ""}</Badge>
              </div>
            ))
          )}
          <Separator />
          <p className="text-xs text-muted-foreground">
            Commission rates are configured by super administrators in <strong>Settings → Commissions</strong>. Changes require reauthentication and are audit-logged.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
