"use client";

import * as React from "react";
import { BellOff, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

export default function AgentNotificationsPage() {
  const { session } = useAuth();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("notifications").select("*").eq("user_id", session!.userId).order("created_at", { ascending: false }).limit(50).then(({ data }) => {
      setItems(data ?? []);
      setLoading(false);
    });
  }, [isSupabaseAuth, session]);

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", session!.userId);
    setItems((arr) => arr.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  if (!isSupabaseAuth) return <div className="mx-auto max-w-3xl"><PageHeader title="Notifications" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Your notifications" />
      {items.length === 0 ? <EmptyState icon={<BellOff className="h-5 w-5" />} title="No notifications" /> : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {items.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 p-4 ${!n.read ? "bg-primary/5" : ""}`}>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2"><p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>{!n.read && <Badge variant="outline" className="text-xs text-primary">New</Badge>}</div>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(n.created_at)}</p>
                </div>
                {!n.read && <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}><Check className="h-4 w-4" /></Button>}
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
