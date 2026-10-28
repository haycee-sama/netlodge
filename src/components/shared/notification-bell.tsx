"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, string> = {
  booking_update: "📅",
  payment_update: "💳",
  verification_update: "✓",
  message: "💬",
  system: "🔔",
  promotion: "🎉",
};

export function NotificationBell({ notificationsHref }: { notificationsHref: string }) {
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);
      const notifs = (data ?? []) as NotificationItem[];
      setItems(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    } catch {
      // silent fail — dropdown will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function markAsRead(id: string) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) return;
      setItems((arr) => arr.map((n) => n.id === id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent
    }
  }

  async function markAllAsRead() {
    try {
      const supabase = createClient();
      const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length === 0) return;
      for (const id of unreadIds) {
        await supabase.from("notifications").update({ read: true }).eq("id", id);
      }
      setItems((arr) => arr.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Could not mark all as read");
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          className="relative"
        >
          <Bell className="h-4 w-4" aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground" aria-hidden>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex flex-col items-start gap-0.5 border-b px-3 py-2.5 last:border-0"
                onClick={() => {
                  if (!n.read) markAsRead(n.id);
                  setOpen(false);
                }}
                asChild
              >
                {n.href ? (
                  <Link href={n.href}>
                    <div className="flex w-full items-start gap-2">
                      <span className="mt-0.5 text-base" aria-hidden>{TYPE_ICON[n.type] ?? "🔔"}</span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className={cn("text-xs", !n.read && "font-semibold")}>{n.title}</p>
                          {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground">{formatRelativeTime(n.created_at)}</p>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div>
                    <div className="flex w-full items-start gap-2">
                      <span className="mt-0.5 text-base" aria-hidden>{TYPE_ICON[n.type] ?? "🔔"}</span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className={cn("text-xs", !n.read && "font-semibold")}>{n.title}</p>
                          {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground">{formatRelativeTime(n.created_at)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>

        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem asChild className="justify-center py-2 text-sm font-medium text-primary">
          <Link href={notificationsHref} onClick={() => setOpen(false)}>
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
