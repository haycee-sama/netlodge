"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { SupportTicketStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import type { SupportTicket } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { EmptyState } from "@/components/shared/page-components";
import { ArrowUpCircle } from "lucide-react";

export default function SupportEscalationsPage() {
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getRepositories().support.listAll({ escalated: true, pageSize: 100 }).then((r) => {
      setTickets(r.items); setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Support operations"
        title="Escalated tickets"
        description="Tickets escalated to verification, finance, or super admin teams. These require cross-team coordination."
        breadcrumbs={[{ label: "Support", href: "/admin/support" }, { label: "Escalations" }]}
      />
      <DemoModeBanner />
      {loading ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : tickets.length === 0 ? (
        <EmptyState icon={<ArrowUpCircle className="h-5 w-5" aria-hidden />} title="No escalated tickets" description="Tickets escalated to other teams will appear here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {tickets.map((t) => {
                const customer = allUsers.find((u) => u.id === t.userId);
                return (
                  <li key={t.id}>
                    <Link href={`/admin/support/tickets/${t.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{t.subject}</p>
                          <PriorityBadge priority={t.priority} />
                          <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">
                            → {t.escalatedTo?.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{t.reference} · {customer?.email ?? t.userId} · escalated {formatRelativeTime(t.createdAt)}</p>
                        <p className="mt-1 text-xs italic text-muted-foreground">"{t.escalatedReason}"</p>
                      </div>
                      <SupportTicketStatusBadge status={t.status} />
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
