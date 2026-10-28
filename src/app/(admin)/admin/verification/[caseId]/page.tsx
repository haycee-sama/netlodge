"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft, CheckCircle2, XCircle, ArrowUpCircle, MessageSquarePlus, Loader2, AlertTriangle, Clock, FileText, User,
} from "lucide-react";
import { AdminPageHeader, DemoModeBanner, DetailLayout } from "@/components/admin/admin-page-components";
import {
  VerificationBadge, PriorityBadge,
} from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";

interface CaseDetail {
  id: string;
  reference: string;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  submission_type: string;
  status: string;
  priority: string;
  assigned_officer_id: string | null;
  sla_due_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_id: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  escalated_from: string | null;
  escalated_to: string | null;
  escalated_at: string | null;
  escalation_reason: string | null;
  outstanding_actions: string[];
  created_at: string;
  updated_at: string;
  evidence: EvidenceRow[];
  notes: InternalNoteRow[];
  audit_logs: AuditLogRow[];
  property?: { id: string; name: string; slug: string; landlord_id: string; public_address_line: string; city: string; state: string; verification_status: string; status: string };
  landlord?: { id: string; email: string; first_name: string; last_name: string };
}

interface EvidenceRow {
  id: string;
  type: string;
  label: string;
  file_name: string;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
  status: string;
  reviewer_notes: string | null;
}

interface InternalNoteRow {
  id: string;
  author_id: string;
  author_name: string;
  message: string;
  created_at: string;
}

interface AuditLogRow {
  id: string;
  timestamp: string;
  actor_email: string;
  actor_role: string;
  action: string;
  summary: string;
  severity: string;
}

export default function VerificationCaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const { session } = useAuth();
  const [record, setRecord] = React.useState<CaseDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Action state
  const [approveNotes, setApproveNotes] = React.useState("");
  const [rejectReason, setRejectReason] = React.useState("");
  const [rejectNotes, setRejectNotes] = React.useState("");
  const [escalateTo, setEscalateTo] = React.useState<"super_admin" | "finance_admin">("super_admin");
  const [escalateReason, setEscalateReason] = React.useState("");
  const [infoRequest, setInfoRequest] = React.useState("");
  const [internalNote, setInternalNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState<null | string>(null);

  const isSupabaseAuth = session?.authenticated === true;

  const fetchCase = React.useCallback(async () => {
    if (!params.caseId || !isSupabaseAuth) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/verification/${params.caseId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load case");
      } else {
        setRecord(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [params.caseId, isSupabaseAuth]);

  React.useEffect(() => { fetchCase(); }, [fetchCase]);

  async function callReview(action: string, body: Record<string, unknown>) {
    if (!record) return false;
    setSubmitting(action);
    try {
      const res = await fetch(`/api/admin/verification/${record.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Action failed", { description: data.error });
        return false;
      }
      toast.success(`${action.replace(/_/g, " ")} succeeded`, { description: `Status: ${data.newStatus}` });
      await fetchCase();
      return true;
    } catch (e) {
      toast.error("Network error", { description: e instanceof Error ? e.message : "Please retry." });
      return false;
    } finally {
      setSubmitting(null);
    }
  }

  async function handleApprove() {
    if (!approveNotes.trim()) { toast.error("Please add review notes for the approval."); return; }
    await callReview("approve", { notes: approveNotes });
    setApproveNotes("");
  }

  async function handleReject() {
    if (!rejectReason.trim()) { toast.error("A rejection reason is required."); return; }
    await callReview("reject", { reason: rejectReason, notes: rejectNotes });
    setRejectReason(""); setRejectNotes("");
  }

  async function handleEscalate() {
    if (!escalateReason.trim()) { toast.error("An escalation reason is required."); return; }
    await callReview("escalate", { escalateTo, reason: escalateReason });
    setEscalateReason("");
  }

  async function handleRequestInfo() {
    if (!infoRequest.trim()) { toast.error("Specify what information you're requesting."); return; }
    await callReview("request_info", { reason: infoRequest });
    setInfoRequest("");
  }

  async function handleAssignToMe() {
    await callReview("assign_to_me", {});
  }

  async function handleAddNote() {
    if (!record || !internalNote.trim()) return;
    setSubmitting("note");
    try {
      const res = await fetch(`/api/admin/verification/${record.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: internalNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Could not add note", { description: data.error });
        return;
      }
      toast.success("Internal note added");
      setInternalNote("");
      await fetchCase();
    } finally {
      setSubmitting(null);
    }
  }

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader title="Verification case" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real admin account to view this case.
        </CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl"><div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></div>;
  }

  if (error || !record) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Button asChild variant="ghost" size="sm"><Link href="/admin/verification/queue"><ArrowLeft className="mr-2 h-4 w-4" /> Back to queue</Link></Button>
        <AdminPageHeader title="Case not found" />
        <Card><CardContent className="p-6 text-center text-sm text-destructive">
          {error || "This case does not exist or you don't have permission to view it."}
        </CardContent></Card>
      </div>
    );
  }

  const isClosed = ["approved", "rejected"].includes(record.status);
  const isOverdue = record.sla_due_at && new Date(record.sla_due_at) < new Date() && !isClosed;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/verification/queue"><ArrowLeft className="mr-2 h-4 w-4" /> Back to queue</Link></Button>

      <AdminPageHeader
        eyebrow={record.reference}
        title={record.entity_label}
        description={`Submitted ${record.submitted_at ? formatRelativeTime(record.submitted_at) : formatRelativeTime(record.created_at)}`}
        actions={<>
          <PriorityBadge priority={record.priority as any} />
          <VerificationBadge status={record.status as any} />
          {isOverdue && <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">Overdue</Badge>}
        </>}
      />

      <DemoModeBanner message="Live data — every review action is server-authorized and recorded in the audit log. Self-approval is blocked." />

      <DetailLayout
        sidebar={
          <div className="space-y-4">
            {/* Decision card */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldIcon /> Review</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {record.assigned_officer_id !== session?.userId && !isClosed && (
                  <Button className="w-full" variant="outline" onClick={handleAssignToMe} disabled={submitting === "assign_to_me"}>
                    {submitting === "assign_to_me" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Assign to me
                  </Button>
                )}

                {/* Approve */}
                {!isClosed && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="default"><CheckCircle2 className="mr-2 h-4 w-4" /> Approve</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Approve verification</DialogTitle>
                        <DialogDescription>Approving will mark this case as approved and (for property cases) flip the property to verified status. This action is audit-logged.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Label htmlFor="approveNotes">Review notes</Label>
                        <Textarea id="approveNotes" value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} rows={4} placeholder="Document your review findings…" />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveNotes("")}>Cancel</Button>
                        <Button onClick={handleApprove} disabled={submitting === "approve"}>
                          {submitting === "approve" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Confirm approval
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Reject */}
                {!isClosed && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full" variant="outline"><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject verification</AlertDialogTitle>
                        <AlertDialogDescription>Rejection requires a reason. The applicant will see the reason and can resubmit with corrections.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-2">
                        <Label htmlFor="rejectReason">Reason (required)</Label>
                        <Textarea id="rejectReason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="e.g. Missing proof of ownership…" />
                        <Label htmlFor="rejectNotes">Additional notes (optional)</Label>
                        <Textarea id="rejectNotes" value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} rows={3} />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setRejectReason(""); setRejectNotes(""); }}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReject} disabled={submitting === "reject"}>
                          {submitting === "reject" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Confirm rejection
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Request info */}
                {!isClosed && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="outline"><MessageSquarePlus className="mr-2 h-4 w-4" /> Request info</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Request more information</DialogTitle>
                        <DialogDescription>The case will be moved to "needs_information" until the applicant responds.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Label htmlFor="infoRequest">What information is needed?</Label>
                        <Textarea id="infoRequest" value={infoRequest} onChange={(e) => setInfoRequest(e.target.value)} rows={4} />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setInfoRequest("")}>Cancel</Button>
                        <Button onClick={handleRequestInfo} disabled={submitting === "request_info"}>
                          {submitting === "request_info" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Send request
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Escalate */}
                {!isClosed && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="outline"><ArrowUpCircle className="mr-2 h-4 w-4" /> Escalate</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Escalate case</DialogTitle>
                        <DialogDescription>Escalate to a higher administrator. The case stays under review pending their decision.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Label htmlFor="escalateTo">Escalate to</Label>
                        <Select value={escalateTo} onValueChange={(v) => setEscalateTo(v as any)}>
                          <SelectTrigger id="escalateTo"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="finance_admin">Finance Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Label htmlFor="escalateReason">Reason (required)</Label>
                        <Textarea id="escalateReason" value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} rows={3} />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEscalateReason("")}>Cancel</Button>
                        <Button onClick={handleEscalate} disabled={submitting === "escalate"}>
                          {submitting === "escalate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Confirm escalation
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {isClosed && (
                  <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                    This case is closed. Reopening requires Super Admin intervention.
                  </div>
                )}

                {record.sla_due_at && (
                  <p className="flex items-center justify-center gap-1 text-xs text-warning-foreground">
                    <Clock className="h-3 w-3" /> SLA: {formatRelativeTime(record.sla_due_at)}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Internal note */}
            <Card>
              <CardHeader><CardTitle className="text-base">Add internal note</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={3} placeholder="Notes visible only to officers…" />
                <Button size="sm" className="w-full" onClick={handleAddNote} disabled={submitting === "note" || !internalNote.trim()}>
                  {submitting === "note" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Add note
                </Button>
              </CardContent>
            </Card>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Case summary */}
          <Card>
            <CardHeader><CardTitle className="text-base">Case summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Field label="Reference" value={record.reference} />
              <Field label="Submission type" value={record.submission_type.replace(/_/g, " ")} />
              <Field label="Entity type" value={record.entity_type} />
              <Field label="Status" value={record.status} />
              {record.reviewer_id && <Field label="Reviewer" value={record.reviewer_id} />}
              {record.reviewed_at && <Field label="Reviewed at" value={formatDateTime(record.reviewed_at)} />}
              {record.rejection_reason && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Rejection reason</p>
                  <p className="rounded-md bg-destructive/5 p-2 text-destructive">{record.rejection_reason}</p>
                </div>
              )}
              {record.review_notes && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Review notes</p>
                  <p className="rounded-md bg-muted p-2">{record.review_notes}</p>
                </div>
              )}
              {record.escalated_to && (
                <>
                  <Separator />
                  <Field label="Escalated to" value={record.escalated_to.replace(/_/g, " ")} />
                  {record.escalated_at && <Field label="Escalated at" value={formatDateTime(record.escalated_at)} />}
                  {record.escalation_reason && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Escalation reason</p>
                      <p className="rounded-md bg-warning/5 p-2 text-warning-foreground">{record.escalation_reason}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Related entity */}
          {record.property && (
            <Card>
              <CardHeader><CardTitle className="text-base">Property</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{record.property.name}</p>
                <p className="text-xs text-muted-foreground">{record.property.public_address_line}, {record.property.city}, {record.property.state}</p>
                <div className="flex gap-2 pt-2">
                  <Badge variant="outline">Property status: {record.property.status}</Badge>
                  <Badge variant="outline">Verification: {record.property.verification_status}</Badge>
                </div>
                <Button asChild variant="ghost" size="sm" className="mt-2 px-0">
                  <Link href={`/properties/${record.property.slug}`}>View public listing →</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {record.landlord && (
            <Card>
              <CardHeader><CardTitle className="text-base">Applicant</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{record.landlord.first_name} {record.landlord.last_name}</p>
                </div>
                <p className="text-xs text-muted-foreground">{record.landlord.email}</p>
              </CardContent>
            </Card>
          )}

          {/* Evidence */}
          <Card>
            <CardHeader><CardTitle className="text-base">Evidence ({record.evidence.length})</CardTitle></CardHeader>
            <CardContent>
              {record.evidence.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No evidence documents submitted.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {record.evidence.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">{e.label}</p>
                          <Badge variant="outline" className="text-xs">{e.type.replace(/_/g, " ")}</Badge>
                          <Badge variant="outline" className="text-xs">{e.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{e.file_name} · uploaded {formatRelativeTime(e.uploaded_at)}</p>
                        {e.reviewer_notes && <p className="text-xs italic text-muted-foreground">"{e.reviewer_notes}"</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Internal notes */}
          {record.notes.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Internal notes ({record.notes.length})</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {record.notes.map((n) => (
                    <li key={n.id} className="space-y-1 rounded-md border border-border/60 bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">{n.author_name} · {formatRelativeTime(n.created_at)}</p>
                      <p className="text-sm">{n.message}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Audit timeline */}
          {record.audit_logs.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Audit history ({record.audit_logs.length})</CardTitle></CardHeader>
              <CardContent>
                <ol className="relative space-y-4 border-l border-border pl-4">
                  {record.audit_logs.map((a) => (
                    <li key={a.id} className="space-y-1">
                      <span className={`absolute -left-1.5 h-3 w-3 rounded-full ${a.severity === "critical" ? "bg-destructive" : a.severity === "warning" ? "bg-warning-foreground" : "bg-primary"}`} />
                      <p className="text-xs text-muted-foreground">{a.actor_email} · {formatDateTime(a.timestamp)}</p>
                      <p className="text-sm font-medium">{a.action}</p>
                      <p className="text-xs text-muted-foreground">{a.summary}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      </DetailLayout>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{value}</span>
    </div>
  );
}

function ShieldIcon() {
  return <span className="inline-block h-4 w-4 rounded-full bg-primary/20" aria-hidden />;
}
