"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IntegrationStatusBadge, AuditSeverityBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/format";
import { Loader2, ShieldCheck, ShieldAlert, Activity, Server } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-components";

interface SecurityEvent {
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

interface SecurityOverview {
  recent_events: SecurityEvent[];
  total_events: number;
  critical_count: number;
  warning_count: number;
  integration_summary: {
    total: number;
    operational: number;
    degraded: number;
    outage: number;
    maintenance: number;
  };
  rate_limiter_mode: "distributed" | "process_local";
}

export default function AdminSecurityPage() {
  const { session } = useAuth();
  const [data, setData] = React.useState<SecurityOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 50;
  const isSupabaseAuth = session?.authenticated === true;

  const fetchPage = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/security?${params}`, { credentials: "include" });
      const body = await res.json();
      if (!res.ok) { setError(body.error || `Failed (${res.status})`); setData(null); }
      else { setData(body); setError(null); }
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); }
    finally { setLoading(false); }
  }, [isSupabaseAuth, page, pageSize, q]);

  React.useEffect(() => { fetchPage(); }, [fetchPage]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="Trust & system" title="Security center" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Super Admin account.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Trust & system"
        title="Security center"
        description="Read-only view of security and authentication audit events, integration health, and rate-limiter mode. Super Admin only — enforced server-side and via RLS."
        breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Security" }]}
      />

      {/* Summary cards */}
      {!loading && !error && data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={<ShieldAlert className="h-4 w-4" />}
            label="Critical events"
            value={String(data.critical_count)}
            tone="danger"
          />
          <SummaryCard
            icon={<Activity className="h-4 w-4" />}
            label="Warning events"
            value={String(data.warning_count)}
            tone="warning"
          />
          <SummaryCard
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Integrations OK"
            value={`${data.integration_summary.operational}/${data.integration_summary.total}`}
            tone={data.integration_summary.operational === data.integration_summary.total ? "success" : "warning"}
          />
          <SummaryCard
            icon={<Server className="h-4 w-4" />}
            label="Rate limiter"
            value={data.rate_limiter_mode === "distributed" ? "Distributed" : "Process-local"}
            tone={data.rate_limiter_mode === "distributed" ? "success" : "warning"}
            hint={data.rate_limiter_mode === "distributed" ? "Upstash Redis" : "Per-instance"}
          />
        </div>
      )}

      {/* Integration breakdown */}
      {!loading && !error && data && (
        <Card>
          <CardContent className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Integration health summary</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-success">Operational: {data.integration_summary.operational}</Badge>
              <Badge variant="outline" className="text-warning-foreground">Degraded: {data.integration_summary.degraded}</Badge>
              <Badge variant="outline" className="text-destructive">Outage: {data.integration_summary.outage}</Badge>
              <Badge variant="outline" className="text-info">Maintenance: {data.integration_summary.maintenance}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              See <a href="/admin/integrations" className="text-primary hover:underline">Integrations</a> for per-service detail and effective configuration.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Input placeholder="Search action, summary, or actor…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="h-9 w-64" />
          <Button variant="ghost" size="sm" className="h-9 ml-auto" onClick={fetchPage} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
            <span>{error}</span><Button variant="outline" size="sm" onClick={fetchPage}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {!error && (
        <Card>
          <CardContent className="p-0">
            <p className="p-4 text-sm font-medium">Security & auth events</p>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : !data || data.recent_events.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No security events match your filters.</div>
            ) : (
              <ul className="divide-y divide-border">
                {data.recent_events.map((e) => (
                  <li key={e.id} className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <AuditSeverityBadge severity={e.severity as any} />
                      <Badge variant="outline" className="text-xs capitalize">{e.category.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline" className="text-xs">{e.resource_type}</Badge>
                      <span className="font-mono text-xs">{e.action}</span>
                      <span className="ml-auto text-xs text-muted-foreground" title={formatDateTime(e.timestamp)}>
                        {formatRelativeTime(e.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm">{e.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      By {e.actor_email} ({e.actor_role})
                      {e.resource_id && <> · Resource <span className="font-mono">{e.resource_id.slice(0, 12)}…</span></>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {!error && data && data.total_events > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, data.total_events)} of {data.total_events}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page === Math.ceil(data.total_events / pageSize)} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon, label, value, hint, tone = "default" }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success" ? "text-success"
      : tone === "warning" ? "text-warning-foreground"
        : tone === "danger" ? "text-destructive"
          : "text-foreground";
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
