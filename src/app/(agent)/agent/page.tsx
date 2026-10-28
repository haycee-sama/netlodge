"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, CalendarCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, StatCard, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";

export default function AgentDashboardPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<any[]>([]);
  const [unreadNotifs, setUnreadNotifs] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    Promise.all([
      supabase.from("properties").select("id, name, slug").then(),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", session!.userId).eq("read", false).then(),
    ]).then(([pRes, nRes]) => {
      setProperties(pRes.data ?? []);
      setUnreadNotifs(nRes.count ?? 0);
      setLoading(false);
    });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><PageHeader title="Agent dashboard" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="Agent dashboard" title={`Welcome, ${session?.firstName}`} description="Manage your assigned properties and referrals." />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Assigned properties" value={properties.length} icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="Unread notifications" value={unreadNotifs} icon={<CalendarCheck className="h-4 w-4" />} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/agent/properties"><Card className="hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><Building2 className="h-5 w-5 text-primary" /><span className="text-sm font-medium">My properties</span></CardContent></Card></Link>
        <Link href="/agent/notifications"><Card className="hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><CalendarCheck className="h-5 w-5 text-primary" /><span className="text-sm font-medium">Notifications</span></CardContent></Card></Link>
      </div>
    </div>
  );
}
