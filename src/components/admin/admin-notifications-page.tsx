"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, BellOff, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { notifications as allNotifications } from "@/lib/data/fixtures";
import type { AppNotification } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";
import { roleLabel } from "@/lib/types";

/**
 * Shared admin notifications page. Renders the notifications for the
 * currently signed-in admin user, sourced from the marketplace notifications
 * fixture (keyed by user ID). In production this would call the
 * NotificationRepository with the admin's real user ID.
 */
export function AdminNotificationsPage({ roleLabel: _roleLabel }: { roleLabel: string }) {
  const { session } = useAuth();
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!session) return;
    // Admin users reuse the marketplace notifications fixture, keyed by userId.
    // We synthesize a few admin-flavoured notifications if none exist.
    getRepositories().notifications.listByUser(session.userId).then((n) => {
      if (n.length === 0) {
        // Fall back to a couple of role-appropriate demo notifications.
        setItems(synthesizeAdminNotifications(session.userId, session.role));
      } else {
        setItems(n);
      }
      setLoading(false);
    });
  }, [session]);

  async function markAllRead() {
    if (!session) return;
    await getRepositories().notifications.markAllRead(session.userId);
    setItems((arr) => arr.map((n) => ({ ...n, read: true })));
    toast.success("All marked as read");
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        eyebrow={`${_roleLabel} workspace`}
        title="Notifications"
        description="Platform alerts, assignment notifications, and system announcements."
        breadcrumbs={[{ label: _roleLabel }]}
        actions={unread > 0 && <Button variant="outline" size="sm" onClick={markAllRead}><Check className="mr-2 h-4 w-4" aria-hidden /> Mark all read</Button>}
      />
      <DemoModeBanner />
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={<BellOff className="h-5 w-5" aria-hidden />} title="No notifications" description="You're all caught up." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id} className={`flex items-start gap-3 p-4 ${n.read ? "" : "bg-primary/5"}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-muted-foreground/40" : "bg-primary"}`} aria-hidden />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${n.read ? "font-normal" : "font-medium"}`}>{n.title}</p>
                      <Badge variant="outline" className="text-xs capitalize">{n.type.replace("_", " ")}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground text-pretty">{n.body}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                      <span>{formatRelativeTime(n.createdAt)}</span>
                      {n.href && <Link href={n.href} className="text-primary hover:underline">View</Link>}
                    </div>
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

function synthesizeAdminNotifications(userId: string, role: AppNotification["type"] extends never ? never : import("@/lib/types").UserRole): AppNotification[] {
  const now = Date.now();
  const base = {
    userId,
    read: false,
  };
  if (role === "verification_officer") {
    return [
      { ...base, id: "n_v1", type: "verification_update", title: "New case assigned", body: "NLG-VER-3PD8TM has been assigned to you. SLA expires in 2 hours.", href: "/admin/verification/ver_2", createdAt: new Date(now - 3600000).toISOString() },
      { ...base, id: "n_v2", type: "system", title: "Escalation received", body: "Case NLG-VER-4GH9NZ was escalated to super admin.", href: "/admin/verification/ver_7", createdAt: new Date(now - 86400000).toISOString() },
    ];
  }
  if (role === "support_staff") {
    return [
      { ...base, id: "n_s1", type: "message", title: "Urgent ticket assigned", body: "NLG-TKT-4FQ8FL (off-platform payment) has been assigned to you.", href: "/admin/support/tickets/tkt_3", createdAt: new Date(now - 3600000).toISOString() },
      { ...base, id: "n_s2", type: "system", title: "Ticket escalated", body: "NLG-TKT-7MQ2LD was escalated to finance.", href: "/admin/support/tickets/tkt_7", createdAt: new Date(now - 86400000).toISOString() },
    ];
  }
  if (role === "finance_admin") {
    return [
      { ...base, id: "n_f1", type: "payment_update", title: "Payout awaiting approval", body: "NLG-POT-QA12WB (₦600,000) is awaiting your approval.", href: "/admin/finance/payouts", createdAt: new Date(now - 7200000).toISOString() },
      { ...base, id: "n_f2", type: "payment_update", title: "Refund request submitted", body: "NLG-REF-7MQ2LD (₦1,580,000) requires review.", href: "/admin/finance/refunds", createdAt: new Date(now - 86400000).toISOString() },
    ];
  }
  // super_admin
  return [
    { ...base, id: "n_a1", type: "system", title: "Escalation received", body: "Verification case NLG-VER-4GH9NZ was escalated to you.", href: "/admin/verification/ver_7", createdAt: new Date(now - 3600000).toISOString() },
    { ...base, id: "n_a2", type: "system", title: "Support escalation", body: "Ticket NLG-TKT-4FQ8FL (off-platform payment) was escalated to you.", href: "/admin/support/tickets/tkt_3", createdAt: new Date(now - 7200000).toISOString() },
    { ...base, id: "n_a3", type: "system", title: "Integration degraded", body: "Cloudinary is reporting degraded performance.", href: "/admin/system-health", createdAt: new Date(now - 86400000).toISOString() },
  ];
}
