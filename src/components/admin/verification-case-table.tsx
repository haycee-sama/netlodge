"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AdminDataTable, type Column } from "@/components/admin/admin-data-table";
import { VerificationBadge, PriorityBadge } from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
import type { VerificationRecord } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";

interface VerificationCaseTableProps {
  rows: VerificationRecord[];
  total: number;
  loading: boolean;
  // Search + filter state (controlled)
  searchValue: string;
  onSearchChange: (v: string) => void;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  // Optional extra filter slot
  filters?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function VerificationCaseTable({
  rows,
  total,
  loading,
  searchValue,
  onSearchChange,
  page,
  pageSize,
  onPageChange,
  filters,
  emptyTitle,
  emptyDescription,
}: VerificationCaseTableProps) {
  const router = useRouter();

  const columns: Column<VerificationRecord>[] = [
    {
      key: "reference",
      header: "Reference",
      cell: (r) => <span className="font-mono text-xs font-medium">{r.reference}</span>,
    },
    {
      key: "entityLabel",
      header: "Applicant / entity",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.entityLabel}</p>
          <p className="text-xs text-muted-foreground capitalize">{r.entityType} · {r.submissionType.replace(/_/g, " ")}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <VerificationBadge status={r.status} />,
    },
    {
      key: "priority",
      header: "Priority",
      cell: (r) => <PriorityBadge priority={r.priority} />,
    },
    {
      key: "assignedOfficerId",
      header: "Assigned",
      cell: (r) =>
        r.assignedOfficerId ? (
          <Badge variant="outline" className="text-xs">Assigned</Badge>
        ) : (
          <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground text-xs">Unassigned</Badge>
        ),
    },
    {
      key: "slaDueAt",
      header: "SLA",
      cell: (r) => {
        if (!r.slaDueAt) return <span className="text-xs text-muted-foreground">—</span>;
        const isOverdue = new Date(r.slaDueAt) < new Date();
        return (
          <span className={isOverdue ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
            {isOverdue ? "Overdue · " : ""}
            {formatRelativeTime(r.slaDueAt)}
          </span>
        );
      },
    },
    {
      key: "submittedAt",
      header: "Submitted",
      cell: (r) => <span className="text-xs text-muted-foreground">{r.submittedAt ? formatRelativeTime(r.submittedAt) : "—"}</span>,
    },
  ];

  return (
    <AdminDataTable
      columns={columns}
      rows={rows}
      total={total}
      loading={loading}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search by reference, applicant, or type…"
      filters={filters}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onRowClick={(r) => router.push(`/admin/verification/${r.id}`)}
      getRowId={(r) => r.id}
      emptyTitle={emptyTitle ?? "No verification cases"}
      emptyDescription={emptyDescription ?? "Try adjusting your filters."}
    />
  );
}
