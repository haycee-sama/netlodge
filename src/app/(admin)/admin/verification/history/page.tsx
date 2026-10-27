"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { VerificationBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import type { VerificationRecord } from "@/lib/types";
import { formatRelativeTime, formatDateTime } from "@/lib/utils/format";
import { EmptyState } from "@/components/shared/page-components";
import { History, CheckCircle2, XCircle } from "lucide-react";

export default function VerificationHistoryPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [rows, setRows] = React.useState<VerificationRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getRepositories().verification.history({ officerId: session?.userId ?? "dev_officer_1" }).then((h) => {
      setRows(h); setLoading(false);
    });
  }, [session]);

  const approved = rows.filter((r) => r.status === "approved").length;
  const rejected = rows.filter((r) => r.status === "rejected").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Verification operations"
        title="Decision history"
        description="Your previous approval and rejection decisions. Use this to review past cases and maintain consistency."
        breadcrumbs={[{ label: "Verification", href: "/admin/verification" }, { label: "History" }]}
      />
      <DemoModeBanner />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardContent className="flex items-center gap-3 p-5">
          <CheckCircle2 className="h-8 w-8 text-success" aria-hidden />
          <div><p className="text-2xl font-bold">{approved}</p><p className="text-xs text-muted-foreground">Approved</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5">
          <XCircle className="h-8 w-8 text-destructive" aria-hidden />
          <div><p className="text-2xl font-bold">{rejected}</p><p className="text-xs text-muted-foreground">Rejected</p></div>
        </CardContent></Card>
      </div>

      {loading ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : rows.length === 0 ? (
        <EmptyState icon={<History className="h-5 w-5" aria-hidden />} title="No decisions yet" description="Your completed reviews will appear here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {rows.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{c.entityLabel}</p>
                      <VerificationBadge status={c.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{c.reference} · decided {c.reviewedAt ? formatRelativeTime(c.reviewedAt) : "—"}</p>
                    {c.reviewNotes && <p className="mt-1 text-xs italic text-muted-foreground">"{c.reviewNotes}"</p>}
                    {c.rejectionReason && <p className="mt-1 text-xs text-destructive">Reason: {c.rejectionReason}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/verification/${c.id}`)}>View</Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
