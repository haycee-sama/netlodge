"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AdminDataTable, type Column } from "@/components/admin/admin-data-table";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { SupportTicketStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import type { SupportTicket, SupportTicketStatus } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";

const STATUS_OPTIONS: { value: "all" | SupportTicketStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "awaiting_user", label: "Awaiting user" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function SupportTicketsPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<SupportTicket[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"all" | SupportTicketStatus>("all");
  const [priority, setPriority] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  React.useEffect(() => {
    setLoading(true);
    getRepositories().support.listAll({
      q: q || undefined,
      status: status === "all" ? undefined : status,
      priority: priority === "all" ? undefined : (priority as SupportTicket["priority"]),
      page,
      pageSize,
    }).then((r) => {
      setRows(r.items); setTotal(r.total); setLoading(false);
    });
  }, [q, status, priority, page]);

  const columns: Column<SupportTicket>[] = [
    { key: "reference", header: "Reference", cell: (t) => <span className="font-mono text-xs font-medium">{t.reference}</span> },
    {
      key: "subject",
      header: "Subject",
      cell: (t) => {
        const customer = allUsers.find((u) => u.id === t.userId);
        return (
          <div className="min-w-0">
            <p className="truncate font-medium">{t.subject}</p>
            <p className="text-xs text-muted-foreground">{customer?.email ?? t.userId} · {t.category}</p>
          </div>
        );
      },
    },
    { key: "status", header: "Status", cell: (t) => <SupportTicketStatusBadge status={t.status} /> },
    { key: "priority", header: "Priority", cell: (t) => <PriorityBadge priority={t.priority} /> },
    {
      key: "assignedTo",
      header: "Assigned",
      cell: (t) => t.assignedTo ? <Badge variant="outline" className="text-xs">{allUsers.find((u) => u.id === t.assignedTo)?.firstName ?? "Agent"}</Badge> : <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground text-xs">Unassigned</Badge>,
    },
    {
      key: "slaDueAt",
      header: "SLA",
      cell: (t) => {
        if (!t.slaDueAt) return <span className="text-xs text-muted-foreground">—</span>;
        const isOverdue = new Date(t.slaDueAt) < new Date() && t.status !== "resolved" && t.status !== "closed";
        return <span className={isOverdue ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>{isOverdue ? "Overdue · " : ""}{formatRelativeTime(t.slaDueAt)}</span>;
      },
    },
    { key: "createdAt", header: "Created", cell: (t) => <span className="text-xs text-muted-foreground">{formatRelativeTime(t.createdAt)}</span> },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Support operations"
        title="Ticket queue"
        description="All customer support tickets across every category and priority."
        breadcrumbs={[{ label: "Support", href: "/admin/support" }, { label: "Tickets" }]}
      />
      <DemoModeBanner />
      <AdminDataTable
        columns={columns}
        rows={rows}
        total={total}
        loading={loading}
        searchValue={q}
        onSearchChange={(v) => { setQ(v); setPage(1); }}
        searchPlaceholder="Search by reference, subject, or message…"
        filters={
          <>
            <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => { setPriority(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </>
        }
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={(t) => router.push(`/admin/support/tickets/${t.id}`)}
        getRowId={(t) => t.id}
        emptyTitle="No tickets" emptyDescription="Try adjusting your filters."
      />
    </div>
  );
}
