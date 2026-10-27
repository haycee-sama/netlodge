"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminDataTable, type Column } from "@/components/admin/admin-data-table";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { PayoutStatusBadge } from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import type { Payout, PayoutStatus } from "@/lib/types";
import { formatRelativeTime, formatNgn } from "@/lib/utils/format";

const STATUS_OPTIONS: { value: "all" | PayoutStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_flight", label: "In flight" },
  { value: "settled", label: "Settled" },
  { value: "failed", label: "Failed" },
  { value: "reversed", label: "Reversed" },
];

export default function FinancePayoutsPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<Payout[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<"all" | PayoutStatus>("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  React.useEffect(() => {
    setLoading(true);
    getRepositories().payouts.listAll({ status: status === "all" ? undefined : status, page, pageSize }).then((r) => {
      setRows(r.items); setTotal(r.total); setLoading(false);
    });
  }, [status, page]);

  const columns: Column<Payout>[] = [
    { key: "reference", header: "Reference", cell: (p) => <span className="font-mono text-xs font-medium">{p.reference}</span> },
    {
      key: "landlord",
      header: "Landlord",
      cell: (p) => {
        const u = allUsers.find((u) => u.id === p.landlordId);
        return <span className="text-xs">{u ? `${u.firstName} ${u.lastName}` : p.landlordId}</span>;
      },
    },
    { key: "bankAccountMasked", header: "Bank account", cell: (p) => <span className="text-xs text-muted-foreground">{p.bankAccountMasked}</span> },
    { key: "netKobo", header: "Net amount", cell: (p) => <span className="font-medium">{formatNgn(p.netKobo)}</span> },
    { key: "status", header: "Status", cell: (p) => <PayoutStatusBadge status={p.status} /> },
    { key: "scheduledFor", header: "Scheduled", cell: (p) => <span className="text-xs text-muted-foreground">{formatRelativeTime(p.scheduledFor)}</span> },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Payouts"
        description="Landlord payouts. Approve, reject, or reverse payouts according to platform policy."
        breadcrumbs={[{ label: "Finance", href: "/admin/finance" }, { label: "Payouts" }]}
      />
      <DemoModeBanner message="Approving a payout in demo mode updates local state and records an audit entry. No real bank transfer is initiated. In production, approval triggers a Paystack transfer that must be confirmed by webhook before the payout is marked settled." />
      <AdminDataTable
        columns={columns}
        rows={rows}
        total={total}
        loading={loading}
        searchValue=""
        onSearchChange={() => {}}
        filters={
          <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        }
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={(p) => router.push(`/admin/finance/payouts/${p.id}`)}
        getRowId={(p) => p.id}
        emptyTitle="No payouts" emptyDescription="Try adjusting your filters."
      />
    </div>
  );
}
