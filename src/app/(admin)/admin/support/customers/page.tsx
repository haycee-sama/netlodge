"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminDataTable, type Column } from "@/components/admin/admin-data-table";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { RoleBadge } from "@/components/shared/status-badges";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import type { User, UserRole } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";

const ROLE_OPTIONS: { value: "all" | UserRole; label: string }[] = [
  { value: "all", label: "All roles" },
  { value: "student", label: "Students" },
  { value: "landlord", label: "Landlords" },
  { value: "manager", label: "Managers" },
  { value: "agent", label: "Agents" },
];

export default function SupportCustomersPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<User[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState<"all" | UserRole>("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  React.useEffect(() => {
    setLoading(true);
    getRepositories().users.list({
      q: q || undefined,
      role: role === "all" ? undefined : role,
      page, pageSize,
    }).then((r) => {
      setRows(r.items); setTotal(r.total); setLoading(false);
    });
  }, [q, role, page]);

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Name",
      cell: (u) => (
        <div className="min-w-0">
          <p className="font-medium">{u.firstName} {u.lastName}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    { key: "role", header: "Role", cell: (u) => <RoleBadge role={u.role} active={u.active} /> },
    { key: "phone", header: "Phone", cell: (u) => <span className="text-xs text-muted-foreground">{u.phone ?? "—"}</span> },
    { key: "createdAt", header: "Joined", cell: (u) => <span className="text-xs text-muted-foreground">{formatRelativeTime(u.createdAt)}</span> },
    { key: "lastSeenAt", header: "Last seen", cell: (u) => <span className="text-xs text-muted-foreground">{u.lastSeenAt ? formatRelativeTime(u.lastSeenAt) : "—"}</span> },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Support operations"
        title="Customer directory"
        description="Search for users by name, email, or ID to view their account, bookings, and support history."
        breadcrumbs={[{ label: "Support", href: "/admin/support" }, { label: "Customers" }]}
      />
      <DemoModeBanner />
      <AdminDataTable
        columns={columns}
        rows={rows}
        total={total}
        loading={loading}
        searchValue={q}
        onSearchChange={(v) => { setQ(v); setPage(1); }}
        searchPlaceholder="Search by name, email, or ID…"
        filters={
          <Select value={role} onValueChange={(v) => { setRole(v as typeof role); setPage(1); }}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        }
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={(u) => router.push(`/admin/support/customers/${u.id}`)}
        getRowId={(u) => u.id}
        emptyTitle="No customers found" emptyDescription="Try adjusting your search."
      />
    </div>
  );
}
