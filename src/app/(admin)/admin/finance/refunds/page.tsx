"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { RefundStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import type { Refund, RefundStatus } from "@/lib/types";
import { formatRelativeTime, formatNgn } from "@/lib/utils/format";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const STATUS_OPTIONS: { value: "all" | RefundStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "requested", label: "Requested" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export default function FinanceRefundsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [rows, setRows] = React.useState<Refund[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<"all" | RefundStatus>("all");
  const [selected, setSelected] = React.useState<Refund | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [approveNotes, setApproveNotes] = React.useState("");
  const [rejectReason, setRejectReason] = React.useState("");

  const reviewerId = session?.userId ?? "dev_finance_1";

  React.useEffect(() => {
    setLoading(true);
    getRepositories().refunds.listAll({ status: status === "all" ? undefined : status, pageSize: 100 }).then((r) => {
      setRows(r.items); setLoading(false);
    });
  }, [status]);

  async function handleApprove(r: Refund) {
    setSubmitting(true);
    try {
      await getRepositories().refunds.approve(r.id, { reviewerId, notes: approveNotes });
      toast.success("Refund approved", { description: "The refund will be processed via Paystack. Completion requires backend confirmation." });
      setApproveNotes("");
      setSelected(null);
      // Refresh
      getRepositories().refunds.listAll({ status: status === "all" ? undefined : status, pageSize: 100 }).then((rr) => setRows(rr.items));
    } finally { setSubmitting(false); }
  }

  async function handleReject(r: Refund) {
    if (!rejectReason.trim()) { toast.error("A rejection reason is required"); return; }
    setSubmitting(true);
    try {
      await getRepositories().refunds.reject(r.id, { reviewerId, reason: rejectReason });
      toast.success("Refund rejected");
      setRejectReason("");
      setSelected(null);
      getRepositories().refunds.listAll({ status: status === "all" ? undefined : status, pageSize: 100 }).then((rr) => setRows(rr.items));
    } finally { setSubmitting(false); }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Refunds"
        description="Review and approve refund requests. Approvals trigger a Paystack refund that must be backend-confirmed before marking completed."
        breadcrumbs={[{ label: "Finance", href: "/admin/finance" }, { label: "Refunds" }]}
      />
      <DemoModeBanner />

      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); }}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No refunds found.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const student = allUsers.find((u) => u.id === r.studentId);
                const canAct = r.status === "requested" || r.status === "under_review";
                return (
                  <li key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs font-medium">{r.reference}</p>
                          <RefundStatusBadge status={r.status} />
                        </div>
                        <p className="text-sm font-medium">{r.reason.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{r.reasonDetail}</p>
                        <p className="text-xs text-muted-foreground">Payment {r.paymentReference} · {student?.email ?? r.studentId} · requested {formatRelativeTime(r.createdAt)}</p>
                        {r.reviewNotes && <p className="text-xs italic text-muted-foreground">Review: "{r.reviewNotes}"</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Price kobo={r.amountKobo} />
                        {canAct && (
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => { setSelected(r); setApproveNotes(""); }}>
                                  <CheckCircle2 className="mr-1 h-3 w-3 text-success" aria-hidden /> Approve
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Approve refund {r.reference}?</DialogTitle>
                                  <DialogDescription>
                                    Approval triggers a Paystack refund of {formatNgn(r.amountKobo)}. The refund will only be marked completed after the backend confirms it via webhook. This action is audit-logged.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-1.5">
                                  <Label htmlFor="notes">Review notes (optional)</Label>
                                  <Textarea id="notes" rows={3} value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} />
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                                  <Button onClick={() => selected && handleApprove(selected)} disabled={submitting}>
                                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />}
                                    Confirm approval
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => { setSelected(r); setRejectReason(""); }}>
                                  <XCircle className="mr-1 h-3 w-3 text-destructive" aria-hidden /> Reject
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reject refund {r.reference}?</AlertDialogTitle>
                                  <AlertDialogDescription>A rejection reason is required and will be audit-logged.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="space-y-1.5">
                                  <Label htmlFor="rreason">Rejection reason (required)</Label>
                                  <Textarea id="rreason" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => selected && handleReject(selected)} disabled={submitting || !rejectReason.trim()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <XCircle className="mr-2 h-4 w-4" aria-hidden />}
                                    Confirm rejection
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </div>
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
