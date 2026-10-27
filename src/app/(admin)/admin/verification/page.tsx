"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState, SectionHeading } from "@/components/shared/page-components";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { VerificationBadge, PriorityBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatRelativeTime } from "@/lib/utils/format";
import { ListChecks, Clock, AlertTriangle, ArrowUpCircle, CheckCircle2, XCircle, FileSearch, Loader2 } from "lucide-react";

interface CaseRow {
  id: string;
  reference: string;
  entity_label: string;
  entity_type: string;
  submission_type: string;
  status: string;
  priority: string;
  assigned_officer_id: string | null;
  sla_due_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export default function VerificationDashboardPage() {
  const { session } = useAuth();
  const [pending, setPending] = React.useState<CaseRow[]>([]);
  const [myCases, setMyCases] = React.useState<CaseRow[]>([]);
  const [overdue, setOverdue] = React.useState<CaseRow[]>([]);
  const [escalated, setEscalated] = React.useState<CaseRow[]>([]);
  const [recent, setRecent] = React.useState<CaseRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    Promise.all([
      fetch(`/api/admin/verification/queue?status=pending&pageSize=100`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/admin/verification/queue?assignedToMe=${session?.userId ?? ""}&pageSize=100`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/admin/verification/queue?overdue=1&pageSize=100`, { credentials: "include" }).then((r) => r.json()),
    ]).then(([p, m, o]) => {
      if (p.error || m.error || o.error) {
        setError(p.error || m.error || o.error);
      } else {
        setPending(p.items ?? []);
        setMyCases((m.items ?? []).filter((c: CaseRow) => ["in_review", "pending", "needs_information"].includes(c.status)));
        setOverdue(o.items ?? []);
        setEscalated((p.items ?? []).filter((c: CaseRow) => c.status === "under_review")); // simplified
        // Recent decisions — fetch from audit logs later; for now reuse pending that have reviewed_at
        setRecent((p.items ?? []).filter((c: CaseRow) => c.reviewed_at).slice(0, 6));
      }
      setLoading(false);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : "Network error");
      setLoading(false);
    });
  }, [isSupabaseAuth, session?.userId]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="Verification operations" title="Verification dashboard" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real admin account to view the dashboard.
        </CardContent></Card>
      </div>
    );
  }

  const newCases = pending.filter((c) => !c.assigned_officer_id);
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
          <Button asChild><Link href="/admin/verification/queue"><ListChecks className="mr-2 h-4 w-4" aria-hidden /> Open review queue</Link></Button>
        }
      />
      <DemoModeBanner message="Live data — every metric comes from the database." />

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="New cases" value={newCases.length} hint="Unassigned, awaiting review" icon={<FileSearch className="h-4 w-4" aria-hidden />} />
            <StatCard label="Assigned to me" value={myCases.length} hint="Currently in your queue" icon={<Clock className="h-4 w-4" aria-hidden />} />
            <StatCard label="Overdue" value={overdue.length} hint="Past SLA deadline" icon={<AlertTriangle className="h-4 w-4" aria-hidden />} />
            <StatCard label="Escalated" value={escalated.length} hint="Awaiting higher review" icon={<ArrowUpCircle className="h-4 w-4" aria-hidden />} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Approved (recent)" value={approvedCount} hint="Recent decisions" icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} />
            <StatCard label="Rejected (recent)" value={rejectedCount} hint="Recent decisions" icon={<XCircle className="h-4 w-4" aria-hidden />} />
          </div>

          {/* New cases needing assignment */}
          <section>
            <SectionHeading title="New cases" description="These submissions have not yet been assigned to an officer."
              action={<Button asChild variant="ghost" size="sm"><Link href="/admin/verification/queue">View full queue</Link></Button>}
            />
            {newCases.length === 0 ? (
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
                              <p className="font-medium">{c.entity_label}</p>
                              <PriorityBadge priority={c.priority as any} />
                            </div>
                            <p className="text-xs text-muted-foreground">{c.reference} · {c.submission_type.replace(/_/g, " ")} · submitted {c.submitted_at ? formatRelativeTime(c.submitted_at) : formatRelativeTime(c.created_at)}</p>
                          </div>
                          <VerificationBadge status={c.status as any} />
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
            <SectionHeading title="Cases assigned to you" description="Cases you are currently reviewing." />
            {myCases.length === 0 ? (
              <EmptyState className="mt-4" icon={<CheckCircle2 className="h-5 w-5" aria-hidden />} title="No active cases" description="You have no cases assigned to you. Pick one from the review queue." />
            ) : (
              <Card className="mt-4">
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {myCases.slice(0, 5).map((c) => {
                      const isOverdue = c.sla_due_at && new Date(c.sla_due_at) < new Date();
                      return (
                        <li key={c.id}>
                          <Link href={`/admin/verification/${c.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{c.entity_label}</p>
                                <PriorityBadge priority={c.priority as any} />
                                {isOverdue && <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">Overdue</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">{c.reference} · {c.submission_type.replace(/_/g, " ")} · SLA {c.sla_due_at ? formatRelativeTime(c.sla_due_at) : "none"}</p>
                            </div>
                            <VerificationBadge status={c.status as any} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
