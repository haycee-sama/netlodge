"use client";

import * as React from "react";
import { ArrowUpCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { VerificationBadge, PriorityBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

export default function AdminVerificationEscalationsPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("verification_cases")
      .select("id, reference, entity_label, status, priority, escalated_to, escalation_reason, escalated_at, created_at")
      .eq("escalated", true)
      .order("escalated_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { setRows(data ?? []); setLoading(false); });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Escalations" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Verification operations" title="Escalations" description="Cases escalated to higher administrators." breadcrumbs={[{ label: "Verification Officer", href: "/admin/verification" }, { label: "Escalations" }]} />
      {rows.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No escalated cases.</CardContent></Card> : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((c) => (
              <li key={c.id} className="space-y-1 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><ArrowUpCircle className="h-4 w-4 text-warning-foreground" /><p className="font-medium">{c.entity_label}</p><PriorityBadge priority={c.priority} /></div>
                  <VerificationBadge status={c.status} />
                </div>
                <p className="text-xs text-muted-foreground">{c.reference} · Escalated to {c.escalated_to?.replace(/_/g, " ") ?? "—"} · {c.escalated_at ? formatRelativeTime(c.escalated_at) : "—"}</p>
                {c.escalation_reason && <p className="text-xs text-warning-foreground">Reason: {c.escalation_reason}</p>}
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
