"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { SupportTicketStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import type { SupportTicket } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { MessageSquare } from "lucide-react";

export default function SupportConversationsPage() {
  const { session } = useAuth();
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Conversations = tickets with recent activity, sorted by most recent reply.
    getRepositories().support.listAll({ pageSize: 100 }).then((r) => {
      const sorted = r.items
        .filter((t) => t.status !== "closed")
        .sort((a, b) => {
          const aLast = a.replies[a.replies.length - 1]?.createdAt ?? a.createdAt;
          const bLast = b.replies[b.replies.length - 1]?.createdAt ?? b.createdAt;
          return +new Date(bLast) - +new Date(aLast);
        });
      setTickets(sorted); setLoading(false);
    });
  }, [session]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        eyebrow="Support operations"
        title="Conversations"
        description="Unified inbox of all active customer conversations, sorted by most recent activity."
        breadcrumbs={[{ label: "Support", href: "/admin/support" }, { label: "Conversations" }]}
      />
      <DemoModeBanner />

      {loading ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : tickets.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No active conversations.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {tickets.map((t) => {
                const customer = allUsers.find((u) => u.id === t.userId);
                const lastReply = t.replies[t.replies.length - 1];
                const lastAuthor = lastReply?.author === "support" ? "You" : customer?.firstName ?? "Customer";
                return (
                  <li key={t.id}>
                    <Link href={`/admin/support/tickets/${t.id}`} className="flex items-start gap-3 p-4 hover:bg-muted/40">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <MessageSquare className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium">{t.subject}</p>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(lastReply?.createdAt ?? t.createdAt)}</span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          <strong>{lastAuthor}:</strong> {lastReply?.message ?? t.message}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{customer?.email}</span>
                          <SupportTicketStatusBadge status={t.status} />
                          <PriorityBadge priority={t.priority} />
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
