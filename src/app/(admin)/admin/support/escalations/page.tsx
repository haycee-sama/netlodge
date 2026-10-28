"use client";

import * as React from "react";
import { ArrowUpCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { SupportTicketStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

export default function AdminSupportEscalationsPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("support_tickets")
      .select("id, reference, subject, status, priority, escalated_to, escalated_reason, created_at, updated_at")
      .eq("escalated", true)
      .order("updated_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { setRows(data ?? []); setLoading(false); });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Escalations" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Support operations" title="Escalations" description="Tickets escalated to higher administrators." breadcrumbs={[{ label: "Support Agent", href: "/admin/support" }, { label: "Escalations" }]} />
      {rows.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No escalated tickets.</CardContent></Card> : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((t) => (
              <li key={t.id} className="space-y-1 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><ArrowUpCircle className="h-4 w-4 text-warning-foreground" /><p className="font-medium">{t.subject}</p><PriorityBadge priority={t.priority} /></div>
                  <SupportTicketStatusBadge status={t.status} />
                </div>
                <p className="text-xs text-muted-foreground">{t.reference} · Escalated to {t.escalated_to?.replace(/_/g, " ") ?? "—"} · {formatRelativeTime(t.updated_at)}</p>
                {t.escalated_reason && <p className="text-xs text-warning-foreground">Reason: {t.escalated_reason}</p>}
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
