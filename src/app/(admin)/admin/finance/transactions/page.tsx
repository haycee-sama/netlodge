"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminDataTable, type Column } from "@/components/admin/admin-data-table";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import type { Payment, PaymentStatus, PaymentChannel } from "@/lib/types";
import { formatRelativeTime, formatNgn } from "@/lib/utils/format";

const STATUS_OPTIONS: { value: "all" | PaymentStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "successful", label: "Successful" },
  { value: "pending", label: "Pending" },
  { value: "initiated", label: "Initiated" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "reversed", label: "Reversed" },
];

export default function FinanceTransactionsPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<Payment[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"all" | PaymentStatus>("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  React.useEffect(() => {
    setLoading(true);
    getRepositories().payments.listAll({
      q: q || undefined,
      status: status === "all" ? undefined : status,
      page, pageSize,
    }).then((r) => { setRows(r.items); setTotal(r.total); setLoading(false); });
  }, [q, status, page]);

  const columns: Column<Payment>[] = [
    { key: "reference", header: "Reference", cell: (p) => <span className="font-mono text-xs font-medium">{p.reference}</span> },
    {
      key: "student",
      header: "Student",
      cell: (p) => {
        const u = allUsers.find((u) => u.id === p.studentId);
        return <span className="text-xs">{u?.email ?? p.studentId}</span>;
      },
    },
    { key: "amountKobo", header: "Amount", cell: (p) => <span className="font-medium">{formatNgn(p.amountKobo)}</span> },
    { key: "feeKobo", header: "Fee", cell: (p) => <span className="text-xs text-muted-foreground">{formatNgn(p.feeKobo)}</span> },
    { key: "channel", header: "Channel", cell: (p) => <Badge variant="outline" className="text-xs uppercase">{p.channel}</Badge> },
    { key: "status", header: "Status", cell: (p) => <PaymentStatusBadge status={p.status} /> },
    { key: "confirmedByBackend", header: "Verified", cell: (p) => p.confirmedByBackend ? <Badge variant="outline" className="text-xs text-success">Backend-confirmed</Badge> : <Badge variant="outline" className="text-xs text-muted-foreground">Unverified</Badge> },
    { key: "initiatedAt", header: "Initiated", cell: (p) => <span className="text-xs text-muted-foreground">{formatRelativeTime(p.initiatedAt)}</span> },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Transactions"
        description="Every payment transaction across the platform, with backend-verification status."
        breadcrumbs={[{ label: "Finance", href: "/admin/finance" }, { label: "Transactions" }]}
      />
      <DemoModeBanner />
      <AdminDataTable
        columns={columns}
        rows={rows}
        total={total}
        loading={loading}
        searchValue={q}
        onSearchChange={(v) => { setQ(v); setPage(1); }}
        searchPlaceholder="Search by reference or gateway ref…"
        filters={
          <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        }
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={(p) => router.push(`/admin/finance/transactions/${p.id}`)}
        getRowId={(p) => p.id}
        emptyTitle="No transactions" emptyDescription="Try adjusting your filters."
      />
    </div>
  );
}
