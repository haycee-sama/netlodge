"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, BellOff, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import type { AppNotification } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";

export default function ManagerNotificationsPage() {
  const { session } = useAuth();
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!session) return;
    getRepositories().notifications.listByUser(session.userId || "dev_manager_1").then((n) => {
      setItems(n);
      setLoading(false);
    });
  }, [session]);

  async function markAllRead() {
    if (!session) return;
    await getRepositories().notifications.markAllRead(session.userId || "dev_manager_1");
    setItems((arr) => arr.map((n) => ({ ...n, read: true })));
    toast.success("All marked as read");
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Notifications" title="Your notifications" actions={unread > 0 && <Button variant="outline" size="sm" onClick={markAllRead}><Check className="mr-2 h-4 w-4" aria-hidden /> Mark all read</Button>} />
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={<BellOff className="h-5 w-5" aria-hidden />} title="No notifications" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id} className={`flex items-start gap-3 p-4 ${n.read ? "" : "bg-primary/5"}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-muted-foreground/40" : "bg-primary"}`} aria-hidden />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2"><p className={`text-sm ${n.read ? "font-normal" : "font-medium"}`}>{n.title}</p><Badge variant="outline" className="text-xs capitalize">{n.type.replace("_", " ")}</Badge></div>
                    <p className="text-sm text-muted-foreground text-pretty">{n.body}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/70"><span>{formatRelativeTime(n.createdAt)}</span>{n.href && <Link href={n.href} className="text-primary hover:underline">View</Link>}</div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
