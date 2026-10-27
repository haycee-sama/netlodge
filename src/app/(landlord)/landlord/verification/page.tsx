"use client";

import * as React from "react";
import {
  BadgeCheck,
  ShieldCheck,
  FileText,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Upload,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-components";
import { VerificationBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import type { VerificationRecord } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

export default function LandlordVerificationPage() {
  const { session } = useAuth();
  const [record, setRecord] = React.useState<VerificationRecord | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!session) return;
    getRepositories().verification.getForLandlord(session.userId || "dev_landlord_1").then(setRecord);
  }, [session]);

  async function submit() {
    setSubmitting(true);
    try {
      const updated = await getRepositories().verification.submit(record?.entityId ?? "", []);
      setRecord(updated);
      toast.success("Verification submitted", { description: "We'll review within 3–5 business days." });
    } finally {
      setSubmitting(false);
    }
  }

  if (!record) {
    return <div className="mx-auto max-w-4xl"><p className="text-sm text-muted-foreground">Loading…</p></div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Verification"
        title="Landlord verification"
        description="Identity, address and ownership verification. Required before listings can be published."
      />

      {/* Status banner */}
      <Card className={record.status === "approved" ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/10"}>
        <CardContent className="flex items-start gap-3 p-5">
          {record.status === "approved" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" aria-hidden />
          ) : (
            <Clock className="mt-0.5 h-5 w-5 text-warning-foreground" aria-hidden />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">Verification {record.status.replace("_", " ")}</p>
              <VerificationBadge status={record.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {record.status === "approved"
                ? "You can publish listings publicly. New properties will still go through property-level verification."
                : "Listings cannot be published until verification is approved."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding actions */}
      {record.outstandingActions.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertCircle className="h-4 w-4 text-warning-foreground" aria-hidden />Outstanding actions</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {record.outstandingActions.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning-foreground" aria-hidden />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Evidence */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" aria-hidden />Submitted evidence</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {record.evidence.map((e) => (
              <li key={e.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{e.label}</p>
                    <p className="text-xs text-muted-foreground">{e.fileName} · uploaded {formatDate(e.uploadedAt)}</p>
                  </div>
                </div>
                <Badge variant="outline" className={e.status === "approved" ? "border-success/30 bg-success/10 text-success" : e.status === "rejected" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-warning/30 bg-warning/10 text-warning-foreground"}>
                  {e.status}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Inspection records */}
      {record.inspectionRecords.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Eye className="h-4 w-4 text-primary" aria-hidden />On-site inspections</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {record.inspectionRecords.map((insp) => (
              <div key={insp.id} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{insp.inspectorName}</p>
                  <Badge variant="outline" className="capitalize">{insp.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Scheduled {formatDate(insp.scheduledAt)}
                  {insp.completedAt && ` · Completed ${formatDate(insp.completedAt)}`}
                </p>
                <Separator className="my-3" />
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Findings:</span> {insp.findings}</p>
                  <p><span className="text-muted-foreground">Recommendations:</span> {insp.recommendations}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
          <p><strong className="text-foreground">Important:</strong> You cannot approve your own verification. All verification is reviewed by NetLodge staff and may require an on-site inspection. Submitting false documents results in immediate account suspension.</p>
        </CardContent>
      </Card>
    </div>
  );
}
