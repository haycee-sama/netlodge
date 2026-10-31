"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, BellOff, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, string> = {
  booking_update: "📅", payment_update: "💳", verification_update: "✓",
  message: "💬", system: "🔔", promotion: "🎉",
};

export default function LandlordNotificationsPage() {
  const { session } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  const fetchNotifications = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notifications").select("*")
        .eq("user_id", session!.userId)
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw new Error(error.message);
      setItems((data ?? []) as Notification[]);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  }, [isSupabaseAuth, session]);

  React.useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  async function markOne(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", session!.userId);
    if (error) { toast.error(t("common.notifications.couldNotMarkRead")); return; }
    setItems((arr) => arr.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader eyebrow={t("common.notifications.eyebrow")} title={t("common.notifications.title")} />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">{t("common.notifications.signInPrompt")}</CardContent></Card>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow={t("common.notifications.eyebrow")} title={t("common.notifications.title")} description={unreadCount > 0
        ? (unreadCount === 1
          ? t("common.notifications.unreadDesc.singular", { n: unreadCount })
          : t("common.notifications.unreadDesc.plural", { n: unreadCount }))
        : t("common.notifications.allCaughtUp")} />
      {error ? (
        <Card className="border-destructive/40 bg-destructive/5"><CardContent className="flex items-center justify-between p-4 text-sm text-destructive"><span>{error}</span><Button variant="outline" size="sm" onClick={fetchNotifications}>{t("common.retry")}</Button></CardContent></Card>
      ) : items.length === 0 ? (
        <EmptyState icon={<BellOff className="h-5 w-5" aria-hidden />} title={t("common.notifications.noNotifications.title")} description={t("common.notifications.noNotifications.desc")} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id} className={`flex items-start gap-3 p-4 ${!n.read ? "bg-primary/5" : ""}`}>
                  <span className="mt-0.5 text-lg" aria-hidden>{TYPE_ICON[n.type] ?? "🔔"}</span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                      {!n.read && <Badge variant="outline" className="text-xs text-primary">{t("common.notifications.new")}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatRelativeTime(n.created_at)}</span>
                      {n.href && <Link href={n.href} className="text-primary hover:underline">{t("common.notifications.view")}</Link>}
                    </div>
                  </div>
                  {!n.read && <Button variant="ghost" size="sm" onClick={() => markOne(n.id)} title={t("common.notifications.markAsRead")}><Check className="h-4 w-4" /></Button>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
