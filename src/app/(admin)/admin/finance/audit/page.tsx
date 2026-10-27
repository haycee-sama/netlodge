"use client";

import * as React from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminDataTable, type Column } from "@/components/admin/admin-data-table";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { AuditSeverityBadge } from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
import { getRepositories } from "@/lib/repositories";
import type { AuditLog, AuditActionCategory, AuditSeverity } from "@/lib/types";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/format";

const CATEGORY_OPTIONS: { value: "all" | AuditActionCategory; label: string }[] = [
  { value: "all", label: "All categories" },
  { value: "auth", label: "Auth" },
  { value: "user_management", label: "User management" },
  { value: "role_management", label: "Role management" },
  { value: "verification", label: "Verification" },
  { value: "support", label: "Support" },
  { value: "finance", label: "Finance" },
  { value: "payout", label: "Payout" },
  { value: "refund", label: "Refund" },
  { value: "configuration", label: "Configuration" },
  { value: "security", label: "Security" },
  { value: "integration", label: "Integration" },
];

const SEVERITY_OPTIONS: { value: "all" | AuditSeverity; label: string }[] = [
  { value: "all", label: "All severities" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
];

export default function FinanceAuditPage() {
  const [rows, setRows] = React.useState<AuditLog[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState<"all" | AuditActionCategory>("finance");
  const [severity, setSeverity] = React.useState<"all" | AuditSeverity>("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  React.useEffect(() => {
    setLoading(true);
    getRepositories().auditLogs.list({
      q: q || undefined,
      category: category === "all" ? undefined : category,
      severity: severity === "all" ? undefined : severity,
      page, pageSize,
    }).then((r) => { setRows(r.items); setTotal(r.total); setLoading(false); });
  }, [q, category, severity, page]);

  const columns: Column<AuditLog>[] = [
    { key: "timestamp", header: "When", cell: (a) => <span className="text-xs text-muted-foreground">{formatRelativeTime(a.timestamp)}</span> },
    { key: "actorEmail", header: "Actor", cell: (a) => <span className="text-xs">{a.actorEmail}</span> },
    { key: "action", header: "Action", cell: (a) => <span className="font-mono text-xs">{a.action}</span> },
    { key: "summary", header: "Summary", cell: (a) => <span className="text-sm">{a.summary}</span> },
    { key: "severity", header: "Severity", cell: (a) => <AuditSeverityBadge severity={a.severity} /> },
    { key: "resourceType", header: "Resource", cell: (a) => <Badge variant="outline" className="text-xs">{a.resourceType}</Badge> },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Audit trail"
        description="Immutable record of every financial action. Audit logs cannot be edited or deleted through any application interface."
        breadcrumbs={[{ label: "Finance", href: "/admin/finance" }, { label: "Audit trail" }]}
      />
      <DemoModeBanner message="Audit logs are append-only. In production, the audit_logs table has no UPDATE or DELETE permissions for any role — inserts are allowed only from authenticated server actions." />

      <AdminDataTable
        columns={columns}
        rows={rows}
        total={total}
        loading={loading}
        searchValue={q}
        onSearchChange={(v) => { setQ(v); setPage(1); }}
        searchPlaceholder="Search by action, summary, or actor…"
        filters={
          <>
            <Select value={category} onValueChange={(v) => { setCategory(v as typeof category); setPage(1); }}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={severity} onValueChange={(v) => { setSeverity(v as typeof severity); setPage(1); }}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{SEVERITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </>
        }
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        getRowId={(a) => a.id}
        emptyTitle="No audit entries" emptyDescription="Try adjusting your filters."
      />
    </div>
  );
}
