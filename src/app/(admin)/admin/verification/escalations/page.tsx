"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { VerificationBadge, PriorityBadge } from "@/components/shared/status-badges";
import { getRepositories } from "@/lib/repositories";
import type { VerificationRecord } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { EmptyState } from "@/components/shared/page-components";
import { ArrowUpCircle } from "lucide-react";

export default function VerificationEscalationsPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<VerificationRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getRepositories().verification.listAll({ escalated: true, pageSize: 100 }).then((r) => {
      setRows(r.items); setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Verification operations"
        title="Escalated cases"
        description="Cases escalated by verification officers to super admins or finance administrators. These require higher-level review."
        breadcrumbs={[{ label: "Verification", href: "/admin/verification" }, { label: "Escalations" }]}
      />
      <DemoModeBanner />
      {loading ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : rows.length === 0 ? (
        <EmptyState icon={<ArrowUpCircle className="h-5 w-5" aria-hidden />} title="No escalated cases" description="Cases escalated by officers will appear here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {rows.map((c) => (
                <li key={c.id}>
                  <button onClick={() => router.push(`/admin/verification/${c.id}`)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/40">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{c.entityLabel}</p>
                        <PriorityBadge priority={c.priority} />
                        <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">
                          Escalated to {c.escalatedTo?.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.reference} · escalated {c.escalatedAt ? formatRelativeTime(c.escalatedAt) : "—"}</p>
                      <p className="mt-1 text-xs italic text-muted-foreground">"{c.escalationReason}"</p>
                    </div>
                    <VerificationBadge status={c.status} />
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
