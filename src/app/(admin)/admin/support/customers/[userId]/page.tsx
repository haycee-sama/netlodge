"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, User, Mail, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { SupportTicketStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/format";

export default function AdminSupportCustomerDetailPage() {
  const params = useParams<{ userId: string }>();
  const { session } = useAuth();
  const [profile, setProfile] = React.useState<any>(null);
  const [tickets, setTickets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth || !params.userId) { setLoading(false); return; }
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select("id, email, first_name, last_name, phone, status, created_at").eq("id", params.userId).single(),
      supabase.from("support_tickets").select("id, reference, subject, status, priority, category, created_at, updated_at").eq("user_id", params.userId).order("created_at", { ascending: false }),
    ]).then(([pRes, tRes]) => {
      if (pRes.data) setProfile(pRes.data);
      if (tRes.data) setTickets(tRes.data);
      setLoading(false);
    });
  }, [isSupabaseAuth, params.userId]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-3xl"><AdminPageHeader title="Customer detail" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!profile) return <div className="mx-auto max-w-3xl"><Button asChild variant="ghost"><Link href="/admin/support/customers">Back</Link></Button><Card><CardContent className="p-6 text-center text-sm text-destructive">Customer not found.</CardContent></Card></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/support/customers"><ArrowLeft className="mr-2 h-4 w-4" /> Back to customers</Link></Button>
      <AdminPageHeader eyebrow="Support operations" title={`${profile.first_name} ${profile.last_name}`} description={profile.email} />
      <Card><CardHeader><CardTitle className="text-sm">Profile</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{profile.email}</span></div>
        {profile.phone && <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span>{profile.phone}</span></div>}
        <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Joined {formatDateTime(profile.created_at)}</span></div>
        <div><Badge variant="outline" className={profile.status === "active" ? "text-success" : "text-destructive"}>{profile.status}</Badge></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">Support tickets ({tickets.length})</CardTitle></CardHeader><CardContent className="p-0">
        {tickets.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No tickets.</p> : (
          <ul className="divide-y divide-border">
            {tickets.map((t) => (
              <li key={t.id}><Link href={`/admin/support/tickets/${t.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/40">
                <div className="space-y-0.5"><p className="text-sm font-medium">{t.subject}</p><p className="text-xs text-muted-foreground">{t.reference} · {formatRelativeTime(t.created_at)}</p></div>
                <SupportTicketStatusBadge status={t.status} />
              </Link></li>
            ))}
          </ul>
        )}
      </CardContent></Card>
    </div>
  );
}

import { Button } from "@/components/ui/button";
