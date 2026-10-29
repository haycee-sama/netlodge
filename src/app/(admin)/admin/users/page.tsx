"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RoleBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { USER_ROLES, roleLabel } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/admin-page-components";

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: string;
  status_reason: string | null;
  created_at: string;
  updated_at: string;
  roles: string[];
  last_seen_at: string | null;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [rows, setRows] = React.useState<UserRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState("all");
  const [active, setActive] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 20;
  const isSupabaseAuth = session?.authenticated === true;

  const fetchUsers = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        active });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/users?${params}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load users");
        if (res.status === 403) toast.error("Access denied", { description: "Super Admin role required." });
      } else {
        let items = data.items ?? [];
        // Client-side role filter (DB role-filter would be complex; safe because RLS already restricts)
        if (role !== "all") items = items.filter((u: UserRow) => u.roles.includes(role));
        setRows(items);
        setTotal(role !== "all" ? items.length : (data.total ?? 0));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [isSupabaseAuth, page, pageSize, q, role, active]);

  React.useEffect(() => { fetchUsers(); }, [fetchUsers]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="User administration" title="Users" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Super Admin account to manage users.
        </CardContent></Card>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="User administration"
        title="Users"
        description="Search, filter, and manage every NetLodge account. Role changes and suspensions are server-authorized and audit-logged."
        breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Users" }]}
      />

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Input placeholder="Search by name or email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="h-9 w-56" />
          <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {USER_ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={active} onValueChange={(v) => { setActive(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="suspended">Suspended only</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-9 ml-auto" onClick={fetchUsers} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchUsers}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {!error && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No users found.</div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/users/${u.id}`)}
                      className="flex w-full flex-col gap-1 p-4 text-left hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">{u.first_name} {u.last_name} <span className="text-xs text-muted-foreground">· {u.email}</span></p>
                        <div className="flex flex-wrap items-center gap-2">
                          {u.roles.map((r) => <RoleBadge key={r} role={r as any} active={u.status === "active"} />)}
                          {u.status === "suspended" && <Badge variant="outline" className="text-destructive">Suspended</Badge>}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>Joined {formatRelativeTime(u.created_at)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="flex h-9 items-center px-3 text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
