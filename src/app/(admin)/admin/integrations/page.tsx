"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { IntegrationStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/format";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface IntegrationRow {
  id: string;
  name: string;
  category: string;
  status: string;
  last_success_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  uptime_24h: number;
  avg_response_ms: number;
  enabled: boolean;
  updated_at: string;
}

interface EffectiveConfig {
  key: string;
  label: string;
  configured: boolean;
  test_mode: boolean | null;
  state: "configured" | "not_configured" | "unknown";
  note: string;
}

interface IntegrationsOverview {
  integrations: IntegrationRow[];
  effective: EffectiveConfig[];
}

export default function AdminIntegrationsPage() {
  const { session } = useAuth();
  const [data, setData] = React.useState<IntegrationsOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  const fetchPage = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/integrations", { credentials: "include" });
      const body = await res.json();
      if (!res.ok) { setError(body.error || `Failed (${res.status})`); setData(null); }
      else { setData(body); setError(null); }
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); }
    finally { setLoading(false); }
  }, [isSupabaseAuth]);

  React.useEffect(() => { fetchPage(); }, [fetchPage]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="System" title="Integrations" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Super Admin account.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="System"
        title="Integrations"
        description="Read-only view of integration_health rows plus a live 'is it actually configured?' check derived from environment variables. Super Admin only."
        breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Integrations" }]}
      />
      <DemoModeBanner message="Live data — integration_health rows + environment variable presence checks. Actual secret values are never exposed. No live provider calls are made to test connectivity." />

      {/* Effective configuration */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border p-4">
            <p className="text-sm font-medium">Effective configuration</p>
            <Button variant="ghost" size="sm" onClick={fetchPage} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !data || data.effective.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No configuration checks available.</div>
          ) : (
            <ul className="divide-y divide-border">
              {data.effective.map((c) => (
                <li key={c.key} className="space-y-1 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{c.label}</p>
                    {c.state === "configured" ? (
                      <Badge variant="outline" className="text-success">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> configured
                      </Badge>
                    ) : c.state === "not_configured" ? (
                      <Badge variant="outline" className="text-destructive">
                        <XCircle className="mr-1 h-3 w-3" /> not configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-warning-foreground">
                        <AlertTriangle className="mr-1 h-3 w-3" /> unknown
                      </Badge>
                    )}
                    {c.test_mode === true && <Badge variant="outline" className="text-xs text-info">test mode</Badge>}
                    {c.test_mode === false && <Badge variant="outline" className="text-xs text-warning-foreground">live mode</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{c.note}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Persisted integration_health rows */}
      <Card>
        <CardContent className="p-0">
          <p className="border-b border-border p-4 text-sm font-medium">Persisted health records (integration_health table)</p>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !data || data.integrations.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No integration_health rows found.</div>
          ) : (
            <ul className="divide-y divide-border">
              {data.integrations.map((i) => (
                <li key={i.id} className="space-y-1 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{i.name}</p>
                    <IntegrationStatusBadge status={i.status as any} />
                    <Badge variant="outline" className="text-xs capitalize">{i.category}</Badge>
                    {!i.enabled && <Badge variant="outline" className="text-xs text-muted-foreground">disabled</Badge>}
                    <span className="ml-auto text-xs text-muted-foreground" title={formatDateTime(i.updated_at)}>
                      Updated {formatRelativeTime(i.updated_at)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Uptime 24h: <span className="font-mono text-foreground">{i.uptime_24h}%</span></span>
                    <span>Avg response: <span className="font-mono text-foreground">{i.avg_response_ms}ms</span></span>
                    {i.last_success_at && <span>Last success: {formatRelativeTime(i.last_success_at)}</span>}
                    {i.last_error && (
                      <span className="text-destructive">Last error: {i.last_error}{i.last_error_at && ` (${formatRelativeTime(i.last_error_at)})`}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Notes</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>Effective configuration reflects whether each environment variable is set. The actual values are never exposed.</li>
            <li>Persisted health records come from the integration_health table. They are updated by heartbeat jobs or operators — not by this page.</li>
            <li>This page does not perform live calls to external providers. We do not run test charges, refunds, or transfers to verify connectivity.</li>
            <li>Webhook delivery and provider connectivity are not tested here. Use the audit logs to inspect webhook events.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
