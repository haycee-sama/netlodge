"use client";

import * as React from "react";
import { BarChart3, Loader2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

export default function AdminSupportReportsPage() {
  const { session } = useAuth();
  const [stats, setStats] = React.useState({ open: 0, inProgress: 0, resolved: 0, escalated: 0, total: 0 });
  const [recent, setRecent] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    Promise.all([
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "resolved"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("escalated", true),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }),
      supabase.from("support_tickets").select("id, reference, subject, status, priority, created_at, resolved_at").order("created_at", { ascending: false }).limit(10),
    ]).then(([o, ip, r, esc, all, recent]) => {
      setStats({ open: o.count ?? 0, inProgress: ip.count ?? 0, resolved: r.count ?? 0, escalated: esc.count ?? 0, total: all.count ?? 0 });
      setRecent(recent.data ?? []);
      setLoading(false);
    });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Support reports" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Support operations" title="Reports" description="Support ticket statistics and recent activity." breadcrumbs={[{ label: "Support Agent", href: "/admin/support" }, { label: "Reports" }]} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="space-y-1 p-4"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-warning-foreground" /><p className="text-xs text-muted-foreground">Open</p></div><p className="text-2xl font-bold">{stats.open}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 p-4"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-info" /><p className="text-xs text-muted-foreground">In progress</p></div><p className="text-2xl font-bold">{stats.inProgress}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 p-4"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /><p className="text-xs text-muted-foreground">Resolved</p></div><p className="text-2xl font-bold">{stats.resolved}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 p-4"><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /><p className="text-xs text-muted-foreground">Total</p></div><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
      </div>
      <Card><CardContent className="p-0">
        <p className="p-4 text-sm font-medium">Recent tickets</p>
        <ul className="divide-y divide-border">
          {recent.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0 space-y-0.5"><p className="font-medium">{t.subject}</p><p className="text-xs text-muted-foreground">{t.reference} · {formatRelativeTime(t.created_at)}</p></div>
              <span className="text-xs capitalize">{t.status.replace(/_/g, " ")}</span>
            </li>
          ))}
        </ul>
      </CardContent></Card>
    </div>
  );
}
