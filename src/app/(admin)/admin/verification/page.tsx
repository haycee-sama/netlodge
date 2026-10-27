"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState, SectionHeading } from "@/components/shared/page-components";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { VerificationBadge, PriorityBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import type { VerificationRecord } from "@/lib/types";
import { formatRelativeTime, formatDateTime } from "@/lib/utils/format";
import { ListChecks, Clock, AlertTriangle, ArrowUpCircle, CheckCircle2, XCircle, FileSearch } from "lucide-react";

export default function VerificationDashboardPage() {
  const { session } = useAuth();
  const [pending, setPending] = React.useState<VerificationRecord[]>([]);
  const [myCases, setMyCases] = React.useState<VerificationRecord[]>([]);
  const [overdue, setOverdue] = React.useState<VerificationRecord[]>([]);
  const [escalated, setEscalated] = React.useState<VerificationRecord[]>([]);
  const [recent, setRecent] = React.useState<VerificationRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const officerId = session?.userId ?? "dev_officer_1";
    Promise.all([
      getRepositories().verification.listAll({ status: "pending", pageSize: 100 }),
      getRepositories().verification.listAll({ assignedOfficerId: officerId, pageSize: 100 }),
      getRepositories().verification.listAll({ overdue: true, pageSize: 100 }),
      getRepositories().verification.listAll({ escalated: true, pageSize: 100 }),
      getRepositories().verification.history({}),
    ]).then(([p, m, o, e, h]) => {
      setPending(p.items);
      setMyCases(m.items.filter((c) => c.status === "in_review" || c.status === "pending"));
      setOverdue(o.items);
      setEscalated(e.items);
      setRecent(h.slice(0, 6));
      setLoading(false);
    });
  }, [session]);

  const newCases = pending.filter((c) => !c.assignedOfficerId);
  const approvedCount = recent.filter((c) => c.status === "approved").length;
  const rejectedCount = recent.filter((c) => c.status === "rejected").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Verification operations"
        title="Verification dashboard"
        description="Review student KYC, landlord identity, property listings, and room-level evidence submissions."
        breadcrumbs={[{ label: "Verification Officer", href: "/admin/verification" }, { label: "Dashboard" }]}
        actions={
          <Button asChild>
            <Link href="/admin/verification/queue">
              <ListChecks className="mr-2 h-4 w-4" aria-hidden />
              Open review queue
            </Link>
          </Button>
        }
      />

      <DemoModeBanner />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New cases" value={newCases.length} hint="Unassigned, awaiting review" icon={<FileSearch className="h-4 w-4" aria-hidden />} />
        <StatCard label="Assigned to me" value={myCases.length} hint="Currently in your queue" icon={<Clock className="h-4 w-4" aria-hidden />} />
        <StatCard label="Overdue" value={overdue.length} hint="Past SLA deadline" icon={<AlertTriangle className="h-4 w-4" aria-hidden />} />
        <StatCard label="Escalated" value={escalated.length} hint="Awaiting higher review" icon={<ArrowUpCircle className="h-4 w-4" aria-hidden />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Approved (recent)" value={approvedCount} hint="Last 6 decisions" icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} />
        <StatCard label="Rejected (recent)" value={rejectedCount} hint="Last 6 decisions" icon={<XCircle className="h-4 w-4" aria-hidden />} />
      </div>

      {/* New cases needing assignment */}
      <section>
        <SectionHeading
          eyebrow="Awaiting assignment"
          title="New cases"
          description="These submissions have not yet been assigned to an officer."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/verification/queue">View full queue</Link>
            </Button>
          }
        />
        {loading ? (
          <Card className="mt-4"><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
        ) : newCases.length === 0 ? (
          <EmptyState className="mt-4" icon={<CheckCircle2 className="h-5 w-5" aria-hidden />} title="No new cases" description="All pending submissions have been assigned." />
        ) : (
          <Card className="mt-4">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {newCases.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/verification/${c.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{c.entityLabel}</p>
                          <PriorityBadge priority={c.priority} />
                        </div>
                        <p className="text-xs text-muted-foreground">{c.reference} · {c.submissionType.replace(/_/g, " ")} · submitted {formatRelativeTime(c.submittedAt ?? c.createdAt)}</p>
                      </div>
                      <VerificationBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {/* My active cases */}
      <section>
        <SectionHeading
          eyebrow="Your queue"
          title="Cases assigned to you"
          description="Cases you are currently reviewing."
        />
        {loading ? (
          <Card className="mt-4"><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
        ) : myCases.length === 0 ? (
          <EmptyState className="mt-4" icon={<CheckCircle2 className="h-5 w-5" aria-hidden />} title="No active cases" description="You have no cases assigned to you. Pick one from the review queue." />
        ) : (
          <Card className="mt-4">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {myCases.slice(0, 5).map((c) => {
                  const isOverdue = c.slaDueAt && new Date(c.slaDueAt) < new Date();
                  return (
                    <li key={c.id}>
                      <Link href={`/admin/verification/${c.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{c.entityLabel}</p>
                            <PriorityBadge priority={c.priority} />
                            {isOverdue && <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">Overdue</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{c.reference} · {c.submissionType.replace(/_/g, " ")} · SLA {c.slaDueAt ? formatRelativeTime(c.slaDueAt) : "none"}</p>
                        </div>
                        <VerificationBadge status={c.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recent decisions */}
      <section>
        <SectionHeading
          eyebrow="History"
          title="Recent decisions"
          description="Your most recent approval and rejection decisions."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/verification/history">View all</Link>
            </Button>
          }
        />
        {recent.length === 0 ? (
          <EmptyState className="mt-4" icon={<Clock className="h-5 w-5" aria-hidden />} title="No decisions yet" description="Your completed reviews will appear here." />
        ) : (
          <Card className="mt-4">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {recent.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{c.entityLabel}</p>
                        <VerificationBadge status={c.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{c.reference} · decided {c.reviewedAt ? formatRelativeTime(c.reviewedAt) : "—"}</p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/verification/${c.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
