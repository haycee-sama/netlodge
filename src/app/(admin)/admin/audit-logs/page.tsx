"use client";

import * as React from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";
import { formatRelativeTime, formatDateTime } from "@/lib/utils/format";
import { Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-components";

interface AuditLogRow {
  id: string;
  timestamp: string;
  actor_email: string;
  actor_role: string;
  category: string;
  action: string;
  resource_type: string;
  resource_id: string;
  summary: string;
  severity: string;
}

const CATEGORY_OPTIONS = [
  "all", "auth", "user_management", "role_management", "verification",
  "support", "finance", "payout", "refund", "configuration", "security", "integration",
];

const SEVERITY_OPTIONS = ["all", "info", "warning", "critical"];

const SEVERITY_CLASS: Record<string, string> = {
  info: "text-muted-foreground",
  warning: "text-warning-foreground",
  critical: "text-destructive" };

export default function AdminAuditLogsPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<AuditLogRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [severity, setSeverity] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 50;
  const isSupabaseAuth = session?.authenticated === true;

  const fetchLogs = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize) });
      if (q) params.set("q", q);
      if (category !== "all") params.set("category", category);
      if (severity !== "all") params.set("severity", severity);

      const res = await fetch(`/api/admin/audit-logs?${params}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load audit logs");
      else { setRows(data.items ?? []); setTotal(data.total ?? 0); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [isSupabaseAuth, page, pageSize, q, category, severity]);

  React.useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="Trust & system" title="Audit logs" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Super Admin account to view audit logs.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Trust & system"
        title="Audit logs"
        description="Immutable record of every administrative action across the platform. Audit logs cannot be edited or deleted through any application interface."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Audit logs" }]}
      />

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Input placeholder="Search action, summary, or actor…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="h-9 w-64" />
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o === "all" ? "All categories" : o.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o === "all" ? "All severities" : o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-9 ml-auto" onClick={fetchLogs} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchLogs}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {!error && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No audit entries match your filters.</div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((a) => (
                  <li key={a.id} className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-medium ${SEVERITY_CLASS[a.severity] ?? ""}`}>{a.severity.toUpperCase()}</span>
                      <Badge variant="outline" className="text-xs capitalize">{a.category.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline" className="text-xs">{a.resource_type}</Badge>
                      <span className="font-mono text-xs">{a.action}</span>
                      <span className="ml-auto text-xs text-muted-foreground" title={formatDateTime(a.timestamp)}>{formatRelativeTime(a.timestamp)}</span>
                    </div>
                    <p className="text-sm">{a.summary}</p>
                    <p className="text-xs text-muted-foreground">By {a.actor_email} ({a.actor_role})</p>
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
