"use client";

import * as React from "react";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { Card, CardContent } from "@/components/ui/card";
import { bookings as allBookings, properties as allProperties } from "@/lib/data/fixtures";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import { formatRelativeTime, formatNgn } from "@/lib/utils/format";

export default function AdminBookingsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Marketplace oversight"
        title="Bookings"
        description="Platform-wide view of every booking across all properties."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Bookings" }]}
      />
      <DemoModeBanner />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Reference</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Student</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Property</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Total</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {allBookings.map((b) => {
                  const student = allUsers.find((u) => u.id === b.studentId);
                  const property = allProperties.find((p) => p.id === b.propertyId);
                  return (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3 font-mono text-xs">{b.reference}</td>
                      <td className="px-4 py-3 text-xs">{student?.email ?? b.studentId}</td>
                      <td className="px-4 py-3 text-xs">{property?.name}</td>
                      <td className="px-4 py-3"><BookingStatusBadge status={b.status} /></td>
                      <td className="px-4 py-3 text-right text-xs font-medium">{formatNgn(b.totalKobo)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(b.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
