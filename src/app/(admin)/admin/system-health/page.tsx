"use client";

import * as React from "react";
import { Activity, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

export default function AdminSystemHealthPage() {
  const { session } = useAuth();
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("audit_logs")
      .select("id, timestamp, actor_email, category, action, summary, severity")
      .order("timestamp", { ascending: false })
      .limit(20)
      .then(({ data }) => { setLogs(data ?? []); setLoading(false); });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="System health" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="System" title="System health" description="Recent system activity and platform status." breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "System health" }]} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="space-y-1 p-5"><p className="text-xs text-muted-foreground">Database</p><Badge variant="outline" className="text-success">Operational</Badge></CardContent></Card>
        <Card><CardContent className="space-y-1 p-5"><p className="text-xs text-muted-foreground">Auth</p><Badge variant="outline" className="text-success">Operational</Badge></CardContent></Card>
        <Card><CardContent className="space-y-1 p-5"><p className="text-xs text-muted-foreground">Storage</p><Badge variant="outline" className="text-success">Operational</Badge></CardContent></Card>
      </div>
      <Card><CardContent className="p-0">
        <p className="p-4 text-sm font-medium">Recent system events</p>
        <ul className="divide-y divide-border">
          {logs.map((l) => (
            <li key={l.id} className="space-y-1 p-4">
              <div className="flex items-center gap-2"><span className={`text-xs font-medium ${l.severity === "critical" ? "text-destructive" : l.severity === "warning" ? "text-warning-foreground" : "text-muted-foreground"}`}>{l.severity.toUpperCase()}</span><Badge variant="outline" className="text-xs">{l.category}</Badge><span className="font-mono text-xs">{l.action}</span><span className="ml-auto text-xs text-muted-foreground">{formatRelativeTime(l.timestamp)}</span></div>
              <p className="text-sm">{l.summary}</p>
            </li>
          ))}
        </ul>
      </CardContent></Card>
    </div>
  );
}
