"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { StatCard } from "@/components/shared/page-components";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers, verificationRecords, supportTickets, integrationHealth } from "@/lib/data/admin-fixtures";
import { properties as allProperties, rooms as allRooms, bookings as allBookings, payouts as allPayouts, payments as allPayments } from "@/lib/data/fixtures";
import { formatNgn } from "@/lib/utils/format";

export default function AdminReportsPage() {
  const [auditCount, setAuditCount] = React.useState(0);

  React.useEffect(() => {
    getRepositories().auditLogs.list({ pageSize: 1 }).then((r) => setAuditCount(r.total));
  }, []);

  const grossVolume = allPayments.filter((p) => p.status === "successful").reduce((s, p) => s + p.amountKobo, 0);
  const platformRevenue = allPayments.filter((p) => p.status === "successful").reduce((s, p) => s + p.feeKobo, 0) + allPayouts.reduce((s, p) => s + p.platformFeeKobo, 0);
  const settledPayouts = allPayouts.filter((p) => p.status === "settled").reduce((s, p) => s + p.netKobo, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Platform analytics"
        title="Reports"
        description="Cross-platform metrics spanning users, marketplace, finance, and operations."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Reports" }]}
      />
      <DemoModeBanner />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={allUsers.length} hint={`${allUsers.filter((u) => u.active).length} active`} />
        <StatCard label="Properties" value={allProperties.length} />
        <StatCard label="Rooms" value={allRooms.length} hint={`${allRooms.filter((r) => r.status === "available").length} available`} />
        <StatCard label="Bookings" value={allBookings.length} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gross volume" value={formatNgn(grossVolume)} />
        <StatCard label="Platform revenue" value={formatNgn(platformRevenue)} />
        <StatCard label="Settled payouts" value={formatNgn(settledPayouts)} />
        <StatCard label="Audit entries" value={auditCount} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Verification cases" value={verificationRecords.length} hint={`${verificationRecords.filter((v) => v.status === "pending").length} pending`} />
        <StatCard label="Support tickets" value={supportTickets.length} hint={`${supportTickets.filter((t) => t.status === "open").length} open`} />
        <StatCard label="Integrations" value={integrationHealth.length} hint={`${integrationHealth.filter((i) => i.status !== "operational").length} degraded`} />
        <StatCard label="Suspended users" value={allUsers.filter((u) => !u.active).length} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">User breakdown by role</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(["student", "landlord", "manager", "agent", "verification_officer", "support_staff", "finance_admin", "super_admin"] as const).map((r) => {
            const count = allUsers.filter((u) => u.role === r).length;
            const max = Math.max(...["student", "landlord", "manager", "agent", "verification_officer", "support_staff", "finance_admin", "super_admin"].map((rr) => allUsers.filter((u) => u.role === rr).length), 1);
            return (
              <div key={r} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{r.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
