"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AdminDataTable, type Column } from "@/components/admin/admin-data-table";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { RoleBadge } from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
import { getRepositories } from "@/lib/repositories";
import type { User, UserRole } from "@/lib/types";
import { USER_ROLES, roleLabel } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";

export default function AdminUsersPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<User[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState<"all" | UserRole>("all");
  const [active, setActive] = React.useState<"all" | "active" | "suspended">("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  React.useEffect(() => {
    setLoading(true);
    getRepositories().users.list({
      q: q || undefined,
      role: role === "all" ? undefined : role,
      active: active === "all" ? undefined : active === "active",
      page, pageSize,
    }).then((r) => { setRows(r.items); setTotal(r.total); setLoading(false); });
  }, [q, role, active, page]);

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
    { key: "active", header: "Status", cell: (u) => u.active ? <Badge variant="outline" className="text-success">Active</Badge> : <Badge variant="outline" className="text-destructive">Suspended</Badge> },
    { key: "createdAt", header: "Joined", cell: (u) => <span className="text-xs text-muted-foreground">{formatRelativeTime(u.createdAt)}</span> },
    { key: "lastSeenAt", header: "Last seen", cell: (u) => <span className="text-xs text-muted-foreground">{u.lastSeenAt ? formatRelativeTime(u.lastSeenAt) : "—"}</span> },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="User administration"
        title="Users"
        description="Search, filter, and manage every NetLodge account. Role changes and suspensions are audit-logged."
        breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Users" }]}
      />
      <DemoModeBanner message="Role changes and account suspensions update local state and record demo audit entries. In production, these actions require reauthentication and are enforced by Supabase RLS policies." />

      <AdminDataTable
        columns={columns}
        rows={rows}
        total={total}
        loading={loading}
        searchValue={q}
        onSearchChange={(v) => { setQ(v); setPage(1); }}
        searchPlaceholder="Search by name, email, or ID…"
        filters={
          <>
            <Select value={role} onValueChange={(v) => { setRole(v as typeof role); setPage(1); }}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {USER_ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={active} onValueChange={(v) => { setActive(v as typeof active); setPage(1); }}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="suspended">Suspended only</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={(u) => router.push(`/admin/users/${u.id}`)}
        getRowId={(u) => u.id}
        emptyTitle="No users found" emptyDescription="Try adjusting your filters."
      />
    </div>
  );
}
