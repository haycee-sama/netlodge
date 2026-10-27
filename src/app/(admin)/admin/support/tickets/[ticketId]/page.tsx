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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Send, UserPlus, ArrowUpCircle, Lock, MessageSquare, Clock, AlertTriangle, Loader2,
} from "lucide-react";
import { AdminPageHeader, DemoModeBanner, DetailLayout } from "@/components/admin/admin-page-components";
import { AuditTimeline } from "@/components/admin/audit-timeline";
import { SupportTicketStatusBadge, PriorityBadge, RoleBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import type { SupportTicket, SupportTicketStatus, AuditLog } from "@/lib/types";
import { formatRelativeTime, formatDateTime } from "@/lib/utils/format";
import { toast } from "sonner";

const STATUS_OPTIONS: SupportTicketStatus[] = ["open", "in_progress", "awaiting_user", "resolved", "closed"];

export default function SupportTicketDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const { session } = useAuth();
  const [ticket, setTicket] = React.useState<SupportTicket | null>(null);
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Reply state
  const [reply, setReply] = React.useState("");
  const [internalReply, setInternalReply] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Escalate state
  const [escalateTo, setEscalateTo] = React.useState<"verification_officer" | "finance_admin" | "super_admin">("super_admin");
  const [escalateReason, setEscalateReason] = React.useState("");

  // Internal note state
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!params.ticketId) return;
    Promise.all([
      getRepositories().support.getById(params.ticketId),
      getRepositories().auditLogs.list({ resourceType: "support_ticket", resourceId: params.ticketId, pageSize: 50 }),
    ]).then(([t, a]) => {
      setTicket(t); setAuditLogs(a.items); setLoading(false);
    });
  }, [params.ticketId]);

  const agentId = session?.userId ?? "dev_support_1";
  const agentName = session ? `${session.firstName} ${session.lastName}` : "Support Agent";

  async function refresh() {
    if (!ticket) return;
    const t = await getRepositories().support.getById(ticket.id);
    setTicket(t);
    const a = await getRepositories().auditLogs.list({ resourceType: "support_ticket", resourceId: ticket.id, pageSize: 50 });
    setAuditLogs(a.items);
  }

  async function handleReply() {
    if (!ticket) return;
    if (!reply.trim()) { toast.error("Write a reply first"); return; }
    setSubmitting(true);
    try {
      await getRepositories().support.replyAsStaff(ticket.id, reply, { authorId: agentId, authorName, internal: internalReply });
      toast.success(internalReply ? "Internal note added" : "Reply sent");
      setReply(""); setInternalReply(false);
      await refresh();
    } finally { setSubmitting(false); }
  }

  async function handleAssign() {
    if (!ticket) return;
    setSubmitting(true);
    try {
      await getRepositories().support.assignTo(ticket.id, agentId);
      toast.success("Ticket assigned to you");
      await refresh();
    } finally { setSubmitting(false); }
  }

  async function handleStatusChange(status: SupportTicketStatus) {
    if (!ticket) return;
    setSubmitting(true);
    try {
      await getRepositories().support.updateStatus(ticket.id, status, { actorId: agentId });
      toast.success(`Status changed to ${status.replace("_", " ")}`);
      await refresh();
    } finally { setSubmitting(false); }
  }

  async function handleEscalate() {
    if (!ticket) return;
    if (!escalateReason.trim()) { toast.error("An escalation reason is required"); return; }
    setSubmitting(true);
    try {
      await getRepositories().support.escalate(ticket.id, { actorId: agentId, to: escalateTo, reason: escalateReason });
      toast.success(`Escalated to ${escalateTo.replace("_", " ")}`);
      setEscalateReason("");
      await refresh();
    } finally { setSubmitting(false); }
  }

  async function handleAddNote() {
    if (!ticket || !note.trim()) return;
    setSubmitting(true);
    try {
      await getRepositories().support.addInternalNote(ticket.id, { authorId: agentId, authorName, message: note });
      toast.success("Internal note added");
      setNote("");
      await refresh();
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="mx-auto max-w-5xl"><p className="text-sm text-muted-foreground">Loading ticket…</p></div>;
  if (!ticket) return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader title="Ticket not found" breadcrumbs={[{ label: "Support", href: "/admin/support" }, { label: "Not found" }]} />
      <Button asChild variant="outline"><Link href="/admin/support/tickets">Back to tickets</Link></Button>
    </div>
  );

  const customer = allUsers.find((u) => u.id === ticket.userId);
  const isOverdue = ticket.slaDueAt && new Date(ticket.slaDueAt) < new Date() && ticket.status !== "resolved" && ticket.status !== "closed";
  const isClosed = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/support/tickets"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to tickets</Link></Button>

      <AdminPageHeader
        eyebrow={ticket.reference}
        title={ticket.subject}
        description={ticket.category}
        breadcrumbs={[{ label: "Support", href: "/admin/support" }, { label: ticket.reference }]}
        actions={
          <div className="flex items-center gap-2">
            <SupportTicketStatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            {isOverdue && <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">Overdue</Badge>}
            {ticket.escalated && <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">Escalated</Badge>}
          </div>
        }
      />

      <DemoModeBanner />

      <DetailLayout
        sidebar={
          <>
            {/* Actions */}
            <Card>
              <CardHeader><CardTitle className="text-base">Ticket actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {!ticket.assignedTo && (
                  <Button className="w-full" variant="outline" onClick={handleAssign} disabled={submitting}>
                    <UserPlus className="mr-2 h-4 w-4" aria-hidden /> Assign to me
                  </Button>
                )}
                <div className="space-y-1.5">
                  <Label>Change status</Label>
                  <Select value={ticket.status} onValueChange={(v) => handleStatusChange(v as SupportTicketStatus)} disabled={submitting || isClosed}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Escalate */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline" disabled={submitting || isClosed}>
                      <ArrowUpCircle className="mr-2 h-4 w-4 text-warning-foreground" aria-hidden /> Escalate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Escalate ticket</DialogTitle>
                      <DialogDescription>Escalate to another team. The ticket will be marked urgent.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>Escalate to</Label>
                        <Select value={escalateTo} onValueChange={(v) => setEscalateTo(v as typeof escalateTo)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="verification_officer">Verification Officer</SelectItem>
                            <SelectItem value="finance_admin">Finance Administrator</SelectItem>
                            <SelectItem value="super_admin">Super Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="escReason">Reason (required)</Label>
                        <Textarea id="escReason" rows={3} value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} />
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
                {ticket.escalated && (
                  <div className="rounded-md bg-warning/10 p-2 text-xs text-warning-foreground">
                    <AlertTriangle className="mr-1 inline h-3 w-3" aria-hidden />
                    Escalated to {ticket.escalatedTo?.replace("_", " ")} — {ticket.escalatedReason}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer info */}
            <Card>
              <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {customer ? (
                  <>
                    <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                    {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                    <Separator />
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Role</span><RoleBadge role={customer.role} active={customer.active} /></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Member since</span><span>{formatRelativeTime(customer.createdAt)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Last seen</span><span>{customer.lastSeenAt ? formatRelativeTime(customer.lastSeenAt) : "—"}</span></div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Customer ID: {ticket.userId}</p>
                )}
              </CardContent>
            </Card>

            {/* Ticket metadata */}
            <Card>
              <CardHeader><CardTitle className="text-base">Ticket details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{formatRelativeTime(ticket.createdAt)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">First response</span><span>{ticket.firstResponseAt ? formatRelativeTime(ticket.firstResponseAt) : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SLA due</span><span className={isOverdue ? "text-destructive" : ""}>{ticket.slaDueAt ? formatRelativeTime(ticket.slaDueAt) : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Team</span><span className="capitalize">{ticket.team ?? "general"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Assigned</span><span>{ticket.assignedTo ? allUsers.find((u) => u.id === ticket.assignedTo)?.firstName ?? "Agent" : "Unassigned"}</span></div>
                {ticket.relatedBookingId && <div className="flex justify-between"><span className="text-muted-foreground">Booking</span><span className="font-mono text-xs">{ticket.relatedBookingId}</span></div>}
                {ticket.relatedPaymentReference && <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="font-mono text-xs">{ticket.relatedPaymentReference}</span></div>}
              </CardContent>
            </Card>
          </>
        }
      >
        {/* Conversation */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4 text-primary" aria-hidden /> Conversation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Original message */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{customer?.firstName ?? "Customer"} {customer?.lastName ?? ""}</p>
                <span className="text-xs text-muted-foreground">{formatDateTime(ticket.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-foreground/90 text-pretty">{ticket.message}</p>
            </div>

            {/* Replies */}
            {ticket.replies.map((r) => (
              <div
                key={r.id}
                className={`rounded-lg border p-4 ${r.internal ? "border-warning/30 bg-warning/5" : r.author === "support" ? "border-primary/20 bg-primary/5" : "border-border bg-muted/30"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {r.author === "support" ? (r.authorName ?? "Support Agent") : (customer?.firstName ?? "Customer")}
                    </p>
                    {r.internal && <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground text-xs"><Lock className="mr-1 h-2.5 w-2.5" aria-hidden />Internal</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-foreground/90 text-pretty">{r.message}</p>
              </div>
            ))}

            {/* Reply box */}
            {!isClosed && (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <Label htmlFor="reply">Your response</Label>
                <Textarea
                  id="reply"
                  rows={4}
                  placeholder="Type your reply to the customer…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground" htmlFor="internal">
                    <Checkbox id="internal" checked={internalReply} onCheckedChange={(v) => setInternalReply(v === true)} />
                    <Lock className="h-3 w-3" aria-hidden /> Internal note (not visible to customer)
                  </label>
                  <Button onClick={handleReply} disabled={submitting || !reply.trim()}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Send className="mr-2 h-4 w-4" aria-hidden />}
                    {internalReply ? "Add internal note" : "Send reply"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Internal notes */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lock className="h-4 w-4 text-warning-foreground" aria-hidden /> Internal notes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="note">Add internal note (agents only)</Label>
              <Textarea id="note" rows={2} placeholder="Notes visible only to support staff…" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button size="sm" onClick={handleAddNote} disabled={submitting || !note.trim()}>Add note</Button>
            </div>
            <Separator />
            {(ticket.internalNotes ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No internal notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {(ticket.internalNotes ?? []).map((n) => (
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

        {/* Audit timeline */}
        <AuditTimeline logs={auditLogs} title="Ticket activity" />
      </DetailLayout>
    </div>
  );
}
