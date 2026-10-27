"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  MessageSquarePlus,
  FileText,
  Loader2,
  AlertTriangle,
  Clock,
  User,
} from "lucide-react";
import { AdminPageHeader, DemoModeBanner, DetailLayout } from "@/components/admin/admin-page-components";
import { AuditTimeline } from "@/components/admin/audit-timeline";
import {
  VerificationBadge,
  PriorityBadge,
} from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import type { VerificationRecord, AuditLog } from "@/lib/types";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";

export default function VerificationCaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [record, setRecord] = React.useState<VerificationRecord | null>(null);
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Action state
  const [approveNotes, setApproveNotes] = React.useState("");
  const [rejectReason, setRejectReason] = React.useState("");
  const [rejectNotes, setRejectNotes] = React.useState("");
  const [escalateTo, setEscalateTo] = React.useState<"super_admin" | "finance_admin">("super_admin");
  const [escalateReason, setEscalateReason] = React.useState("");
  const [infoRequest, setInfoRequest] = React.useState("");
  const [internalNote, setInternalNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!params.caseId) return;
    Promise.all([
      getRepositories().verification.getById(params.caseId),
      getRepositories().auditLogs.list({ resourceType: "verification_case", resourceId: params.caseId, pageSize: 50 }),
    ]).then(([r, a]) => {
      setRecord(r);
      setAuditLogs(a.items);
      setLoading(false);
    });
  }, [params.caseId]);

  const officerId = session?.userId ?? "dev_officer_1";
  const officerName = session ? `${session.firstName} ${session.lastName}` : "Verification Officer";

  async function refresh() {
    if (!record) return;
    const r = await getRepositories().verification.getById(record.id);
    setRecord(r);
    const a = await getRepositories().auditLogs.list({ resourceType: "verification_case", resourceId: record.id, pageSize: 50 });
    setAuditLogs(a.items);
  }

  async function handleApprove() {
    if (!record) return;
    if (!approveNotes.trim()) {
      toast.error("Please add review notes for the approval.");
      return;
    }
    setSubmitting(true);
    try {
      await getRepositories().verification.approve(record.id, {
        reviewerId: officerId,
        reviewerName: officerName,
        notes: approveNotes,
      });
      toast.success("Verification approved", { description: `${record.reference} is now verified.` });
      setApproveNotes("");
      await refresh();
    } catch (e) {
      toast.error("Could not approve", { description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!record) return;
    if (!rejectReason.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }
    setSubmitting(true);
    try {
      await getRepositories().verification.reject(record.id, {
        reviewerId: officerId,
        reviewerName: officerName,
        reason: rejectReason,
        notes: rejectNotes || undefined,
      });
      toast.success("Verification rejected", { description: `${record.reference} has been rejected.` });
      setRejectReason("");
      setRejectNotes("");
      await refresh();
    } catch (e) {
      toast.error("Could not reject", { description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEscalate() {
    if (!record) return;
    if (!escalateReason.trim()) {
      toast.error("An escalation reason is required.");
      return;
    }
    setSubmitting(true);
    try {
      await getRepositories().verification.escalate(record.id, {
        reviewerId: officerId,
        reviewerName: officerName,
        to: escalateTo,
        reason: escalateReason,
      });
      toast.success("Case escalated", { description: `Escalated to ${escalateTo.replace("_", " ")}.` });
      setEscalateReason("");
      await refresh();
    } catch (e) {
      toast.error("Could not escalate", { description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestInfo() {
    if (!record) return;
    if (!infoRequest.trim()) {
      toast.error("Specify what information you're requesting.");
      return;
    }
    setSubmitting(true);
    try {
      await getRepositories().verification.requestInfo(record.id, {
        reviewerId: officerId,
        reviewerName: officerName,
        request: infoRequest,
      });
      toast.success("Information requested", { description: "The applicant will be asked to provide more details." });
      setInfoRequest("");
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddNote() {
    if (!record) return;
    if (!internalNote.trim()) return;
    setSubmitting(true);
    try {
      await getRepositories().verification.addInternalNote(record.id, {
        authorId: officerId,
        authorName: officerName,
        message: internalNote,
      });
      toast.success("Internal note added");
      setInternalNote("");
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignToMe() {
    if (!record) return;
    setSubmitting(true);
    try {
      await getRepositories().verification.assignTo(record.id, officerId);
      toast.success("Case assigned to you");
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl"><p className="text-sm text-muted-foreground">Loading case…</p></div>;
  }

  if (!record) {
    return (
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader title="Case not found" breadcrumbs={[{ label: "Verification", href: "/admin/verification" }, { label: "Case not found" }]} />
        <Button asChild variant="outline"><Link href="/admin/verification/queue">Back to queue</Link></Button>
      </div>
    );
  }

  const isClosed = record.status === "approved" || record.status === "rejected";
  const isOverdue = record.slaDueAt && new Date(record.slaDueAt) < new Date() && !isClosed;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/verification/queue"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to queue</Link>
      </Button>

      <AdminPageHeader
        eyebrow={record.reference}
        title={record.entityLabel}
        description={`${record.entityType.replace(/_/g, " ")} · ${record.submissionType.replace(/_/g, " ")}`}
        breadcrumbs={[{ label: "Verification", href: "/admin/verification" }, { label: record.reference }]}
        actions={
          <div className="flex items-center gap-2">
            <VerificationBadge status={record.status} />
            <PriorityBadge priority={record.priority} />
            {isOverdue && <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">Overdue</Badge>}
          </div>
        }
      />

      <DemoModeBanner />

      <DetailLayout
        sidebar={
          <>
            {/* Actions */}
            <Card>
              <CardHeader><CardTitle className="text-base">Review actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {isClosed ? (
                  <p className="text-sm text-muted-foreground">This case is closed. No further actions are available.</p>
                ) : (
                  <>
                    {!record.assignedOfficerId && (
                      <Button className="w-full" variant="outline" onClick={handleAssignToMe} disabled={submitting}>
                        <User className="mr-2 h-4 w-4" aria-hidden /> Assign to me
                      </Button>
                    )}
                    {/* Approve */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full" variant="outline" disabled={submitting}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-success" aria-hidden /> Approve
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Approve verification {record.reference}?</DialogTitle>
                          <DialogDescription>
                            Approving will mark this case as verified. The applicant will be notified. This action is audit-logged.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-1.5">
                          <Label htmlFor="approveNotes">Review notes (required)</Label>
                          <Textarea id="approveNotes" rows={4} placeholder="Document your review findings…" value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setApproveNotes("")}>Cancel</Button>
                          <Button onClick={handleApprove} disabled={submitting}>
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />}
                            Confirm approval
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {/* Reject */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full" variant="outline" disabled={submitting}>
                          <XCircle className="mr-2 h-4 w-4 text-destructive" aria-hidden /> Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject verification {record.reference}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Rejection will mark this case as rejected. The applicant will be notified and may resubmit with corrected documents. A reason is required.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="rejectReason">Rejection reason (required)</Label>
                            <Textarea id="rejectReason" rows={3} placeholder="Explain why this submission is rejected…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="rejectNotes">Additional notes (optional)</Label>
                            <Textarea id="rejectNotes" rows={2} value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} />
                          </div>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleReject}
                            disabled={submitting || !rejectReason.trim()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <XCircle className="mr-2 h-4 w-4" aria-hidden />}
                            Confirm rejection
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {/* Request info */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full" variant="outline" disabled={submitting}>
                          <MessageSquarePlus className="mr-2 h-4 w-4" aria-hidden /> Request info
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Request additional information</DialogTitle>
                          <DialogDescription>Specify what the applicant needs to provide. The case stays in your queue.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-1.5">
                          <Label htmlFor="infoRequest">Information requested</Label>
                          <Textarea id="infoRequest" rows={4} placeholder="e.g. Please provide a clearer scan of your NIN slip." value={infoRequest} onChange={(e) => setInfoRequest(e.target.value)} />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setInfoRequest("")}>Cancel</Button>
                          <Button onClick={handleRequestInfo} disabled={submitting}>Send request</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {/* Escalate */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full" variant="outline" disabled={submitting}>
                          <ArrowUpCircle className="mr-2 h-4 w-4 text-warning-foreground" aria-hidden /> Escalate
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Escalate case</DialogTitle>
                          <DialogDescription>Escalate to a higher administrator for review. A reason is required and the case will be marked urgent.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label>Escalate to</Label>
                            <Select value={escalateTo} onValueChange={(v) => setEscalateTo(v as typeof escalateTo)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="super_admin">Super Administrator</SelectItem>
                                <SelectItem value="finance_admin">Finance Administrator</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="escalateReason">Reason (required)</Label>
                            <Textarea id="escalateReason" rows={3} placeholder="Explain why this case needs escalation…" value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEscalateReason("")}>Cancel</Button>
                          <Button onClick={handleEscalate} disabled={submitting || !escalateReason.trim()}>
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <ArrowUpCircle className="mr-2 h-4 w-4" aria-hidden />}
                            Escalate
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Case metadata */}
            <Card>
              <CardHeader><CardTitle className="text-base">Case details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{record.reference}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{record.submissionType.replace(/_/g, " ")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Entity</span><span className="capitalize">{record.entityType}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Submitted</span><span>{record.submittedAt ? formatRelativeTime(record.submittedAt) : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SLA due</span><span className={isOverdue ? "text-destructive" : ""}>{record.slaDueAt ? formatRelativeTime(record.slaDueAt) : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Assigned</span><span>{record.assignedOfficerId ?? "Unassigned"}</span></div>
                {record.reviewedAt && <div className="flex justify-between"><span className="text-muted-foreground">Reviewed</span><span>{formatRelativeTime(record.reviewedAt)}</span></div>}
                {record.escalatedTo && (
                  <>
                    <Separator />
                    <div className="rounded-md bg-warning/10 p-2 text-xs text-warning-foreground">
                      <AlertTriangle className="mr-1 inline h-3 w-3" aria-hidden />
                      Escalated to {record.escalatedTo.replace("_", " ")} — {record.escalationReason}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        }
      >
        {/* Evidence */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" aria-hidden /> Submitted evidence</CardTitle></CardHeader>
          <CardContent className="p-0">
            {record.evidence.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">No evidence documents submitted.</p>
            ) : (
              <ul className="divide-y divide-border">
                {record.evidence.map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <FileText className="h-4 w-4" aria-hidden />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{ev.label}</p>
                        <p className="text-xs text-muted-foreground">{ev.fileName} · {ev.type.replace(/_/g, " ")} · uploaded {formatRelativeTime(ev.uploadedAt)}</p>
                        {ev.reviewerNotes && <p className="text-xs text-muted-foreground italic">"{ev.reviewerNotes}"</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className={ev.status === "approved" ? "border-success/30 bg-success/10 text-success" : ev.status === "rejected" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-warning/30 bg-warning/10 text-warning-foreground"}>
                      {ev.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Inspection records */}
        {record.inspectionRecords.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">On-site inspections</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {record.inspectionRecords.map((insp) => (
                <div key={insp.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{insp.inspectorName}</p>
                    <Badge variant="outline" className="capitalize">{insp.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Scheduled {formatDateTime(insp.scheduledAt)}
                    {insp.completedAt && ` · Completed ${formatDateTime(insp.completedAt)}`}
                  </p>
                  <Separator className="my-3" />
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Findings:</span> {insp.findings || "—"}</p>
                    <p><span className="text-muted-foreground">Recommendations:</span> {insp.recommendations || "—"}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Outstanding actions */}
        {record.outstandingActions.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Outstanding actions</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {record.outstandingActions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" aria-hidden />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Internal notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Internal notes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="note">Add internal note (officers only)</Label>
              <Textarea id="note" rows={2} placeholder="Notes visible only to verification officers…" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
              <Button size="sm" onClick={handleAddNote} disabled={submitting || !internalNote.trim()}>Add note</Button>
            </div>
            <Separator />
            {(record.internalNotes ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No internal notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {(record.internalNotes ?? []).map((n) => (
                  <li key={n.id} className="rounded-md border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">{n.authorName}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                    <p className="mt-1 text-sm">{n.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Review notes (if any) */}
        {record.reviewNotes && (
          <Card>
            <CardHeader><CardTitle className="text-base">Review notes</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/90 text-pretty">{record.reviewNotes}</p>
              {record.rejectionReason && (
                <p className="mt-2 text-sm text-destructive"><strong>Rejection reason:</strong> {record.rejectionReason}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Audit timeline */}
        <AuditTimeline logs={auditLogs} title="Case activity" />
      </DetailLayout>
    </div>
  );
}
