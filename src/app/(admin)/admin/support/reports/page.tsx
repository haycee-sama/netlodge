"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { StatCard } from "@/components/shared/page-components";
import { getRepositories } from "@/lib/repositories";
import type { SupportTicket } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { Ticket, Clock, CheckCircle2, MessageSquare, ArrowUpCircle } from "lucide-react";

export default function SupportReportsPage() {
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getRepositories().support.listAll({ pageSize: 100 }).then((r) => {
      setTickets(r.items); setLoading(false);
    });
  }, []);

  const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed");
  const responded = tickets.filter((t) => t.firstResponseAt);
  const escalated = tickets.filter((t) => t.escalated);

  // Avg first response (hours)
  const avgResponseMs = responded.length > 0
    ? responded.reduce((s, t) => s + (+new Date(t.firstResponseAt!) - +new Date(t.createdAt)), 0) / responded.length
    : 0;
  const avgResponseHours = avgResponseMs > 0 ? (avgResponseMs / 3600000).toFixed(1) : "—";

  // Avg resolution (hours)
  const avgResolutionMs = resolved.length > 0
    ? resolved.reduce((s, t) => s + (+new Date(t.resolvedAt ?? t.updatedAt) - +new Date(t.createdAt)), 0) / resolved.length
    : 0;
  const avgResolutionHours = avgResolutionMs > 0 ? (avgResolutionMs / 3600000).toFixed(1) : "—";

  // Tickets by category
  const byCategory = new Map<string, number>();
  tickets.forEach((t) => byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + 1));
  const sortedCategories = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(...sortedCategories.map(([, c]) => c), 1);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Support operations"
        title="Performance reports"
        description="Response times, resolution rates, and ticket volume by category."
        breadcrumbs={[{ label: "Support", href: "/admin/support" }, { label: "Reports" }]}
      />
      <DemoModeBanner />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total tickets" value={tickets.length} icon={<Ticket className="h-4 w-4" aria-hidden />} />
        <StatCard label="Avg first response" value={`${avgResponseHours}h`} icon={<MessageSquare className="h-4 w-4" aria-hidden />} />
        <StatCard label="Avg resolution" value={`${avgResolutionHours}h`} icon={<Clock className="h-4 w-4" aria-hidden />} />
        <StatCard label="Escalation rate" value={`${tickets.length > 0 ? Math.round((escalated.length / tickets.length) * 100) : 0}%`} icon={<ArrowUpCircle className="h-4 w-4" aria-hidden />} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Tickets by category</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {sortedCategories.map(([cat, count]) => (
            <div key={cat} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{cat}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(count / maxCat) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Resolution summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Resolved</span><span className="font-medium">{resolved.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Open / in progress</span><span className="font-medium">{tickets.filter((t) => t.status === "open" || t.status === "in_progress").length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Awaiting user</span><span className="font-medium">{tickets.filter((t) => t.status === "awaiting_user").length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Escalated</span><span className="font-medium">{escalated.length}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
