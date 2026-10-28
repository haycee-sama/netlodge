"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { SupportTicketStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

export default function AdminSupportConversationsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [tickets, setTickets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("support_tickets")
      .select("id, reference, subject, status, priority, category, created_at, updated_at, assigned_to")
      .in("status", ["open", "in_progress", "awaiting_user"])
      .order("updated_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { setTickets(data ?? []); setLoading(false); });
  }, [isSupabaseAuth, session]);

  const filtered = q ? tickets.filter((t) => t.subject.toLowerCase().includes(q.toLowerCase()) || t.reference.toLowerCase().includes(q.toLowerCase())) : tickets;

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Conversations" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Support operations" title="Conversations" description="Active support conversations across all tickets." breadcrumbs={[{ label: "Support Agent", href: "/admin/support" }, { label: "Conversations" }]} />
      <Card><CardContent className="p-4"><Input placeholder="Search subject or reference…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9" /></CardContent></Card>
      {filtered.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No active conversations.</CardContent></Card> : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {filtered.map((t) => (
              <li key={t.id}>
                <button onClick={() => router.push(`/admin/support/tickets/${t.id}`)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/40">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground" /><p className="font-medium">{t.subject}</p><PriorityBadge priority={t.priority} /></div>
                    <p className="text-xs text-muted-foreground">{t.reference} · {t.category} · {formatRelativeTime(t.updated_at)}</p>
                  </div>
                  <SupportTicketStatusBadge status={t.status} />
                </button>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
