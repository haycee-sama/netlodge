"use client";

import * as React from "react";
import { Activity, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime } from "@/lib/utils/format";

const SEVERITY_COLORS: Record<string, string> = {
  info: "text-muted-foreground", warning: "text-warning-foreground", critical: "text-destructive",
};

export default function AdminFinanceAuditPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    fetch("/api/admin/audit-logs?category=finance&category=payout&category=refund&pageSize=50", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setRows(data.items ?? []);
        setLoading(false);
      })
      .catch((e) => { setError(e instanceof Error ? e.message : "Network error"); setLoading(false); });
  }, [isSupabaseAuth]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Finance audit" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Finance operations" title="Finance audit trail" description="Immutable record of financial decisions (refunds, payouts, reconciliation)." breadcrumbs={[{ label: "Finance Admin", href: "/admin/finance" }, { label: "Audit" }]} />
      {error ? <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No finance audit entries.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((a) => (
              <li key={a.id} className="space-y-1 p-4">
                <div className="flex items-center gap-2"><span className={`text-xs font-medium ${SEVERITY_COLORS[a.severity] ?? ""}`}>{a.severity.toUpperCase()}</span><Badge variant="outline" className="text-xs capitalize">{a.category}</Badge><span className="font-mono text-xs">{a.action}</span><span className="ml-auto text-xs text-muted-foreground">{formatDateTime(a.timestamp)}</span></div>
                <p className="text-sm">{a.summary}</p>
                <p className="text-xs text-muted-foreground">By {a.actor_email} ({a.actor_role})</p>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
