"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AdminDataTable, type Column } from "@/components/admin/admin-data-table";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { Card, CardContent } from "@/components/ui/card";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import type { Payment } from "@/lib/types";
import { formatRelativeTime, formatNgn } from "@/lib/utils/format";
import { StatCard } from "@/components/shared/page-components";

export default function FinancePaymentsPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getRepositories().payments.listAll({ pageSize: 100 }).then((r) => { setRows(r.items); setLoading(false); });
  }, []);

  const successful = rows.filter((p) => p.status === "successful");
  const failed = rows.filter((p) => p.status === "failed");
  const byChannel = new Map<string, number>();
  rows.forEach((p) => byChannel.set(p.channel, (byChannel.get(p.channel) ?? 0) + 1));

  const columns: Column<Payment>[] = [
    { key: "reference", header: "Reference", cell: (p) => <span className="font-mono text-xs font-medium">{p.reference}</span> },
    { key: "channel", header: "Channel", cell: (p) => <span className="text-xs uppercase">{p.channel}</span> },
    { key: "amountKobo", header: "Amount", cell: (p) => <span className="font-medium">{formatNgn(p.amountKobo)}</span> },
    { key: "status", header: "Status", cell: (p) => <PaymentStatusBadge status={p.status} /> },
    { key: "initiatedAt", header: "Initiated", cell: (p) => <span className="text-xs text-muted-foreground">{formatRelativeTime(p.initiatedAt)}</span> },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Payments"
        description="Payment-method-level view of all transactions. Click a row for full detail."
        breadcrumbs={[{ label: "Finance", href: "/admin/finance" }, { label: "Payments" }]}
      />
      <DemoModeBanner />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Successful" value={successful.length} />
        <StatCard label="Failed" value={failed.length} />
        <StatCard label="Total volume" value={formatNgn(successful.reduce((s, p) => s + p.amountKobo, 0))} />
      </div>

      <Card><CardContent className="p-4 text-sm">
        <p className="font-medium mb-2">By channel</p>
        <div className="flex flex-wrap gap-3">
          {Array.from(byChannel.entries()).map(([ch, count]) => (
            <span key={ch} className="text-xs"><span className="uppercase font-medium">{ch}</span>: {count}</span>
          ))}
        </div>
      </CardContent></Card>

      <AdminDataTable
        columns={columns}
        rows={rows}
        total={rows.length}
        loading={loading}
        searchValue=""
        onSearchChange={() => {}}
        page={1}
        pageSize={rows.length}
        onPageChange={() => {}}
        onRowClick={(p) => router.push(`/admin/finance/transactions/${p.id}`)}
        getRowId={(p) => p.id}
        emptyTitle="No payments"
      />
    </div>
  );
}
