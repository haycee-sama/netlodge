"use client";

import * as React from "react";
import { Clock, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { VerificationBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils/format";

export default function AdminVerificationHistoryPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("verification_cases")
      .select("id, reference, entity_label, status, reviewed_at, reviewer_id, review_notes, rejection_reason")
      .in("status", ["approved", "rejected"])
      .order("reviewed_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { setRows(data ?? []); setLoading(false); });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Decision history" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Verification operations" title="Decision history" description="Past verification decisions." breadcrumbs={[{ label: "Verification Officer", href: "/admin/verification" }, { label: "History" }]} />
      {rows.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No decisions yet.</CardContent></Card> : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((c) => (
              <li key={c.id} className="space-y-1 p-4">
                <div className="flex items-center justify-between"><p className="font-medium">{c.entity_label}</p><VerificationBadge status={c.status} /></div>
                <p className="text-xs text-muted-foreground">{c.reference} · {c.reviewed_at ? formatDateTime(c.reviewed_at) : "—"}</p>
                {c.rejection_reason && <p className="text-xs text-destructive">Reason: {c.rejection_reason}</p>}
                {c.review_notes && <p className="text-xs italic text-muted-foreground">Notes: {c.review_notes}</p>}
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
