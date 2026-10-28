"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, User, Send, Lock } from "lucide-react";
import { AdminPageHeader, DemoModeBanner, DetailLayout } from "@/components/admin/admin-page-components";
import { SupportTicketStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";

interface Message {
  id: string;
  author_id: string;
  author_role: string;
  author_name: string | null;
  message: string;
  internal: boolean;
  created_at: string;
}

interface TicketDetail {
  id: string;
  reference: string;
  user_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  message: string;
  assigned_to: string | null;
  team: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  sla_due_at: string | null;
  escalated: boolean;
  escalated_to: string | null;
  escalated_reason: string | null;
  created_at: string;
  updated_at: string;
  messages: Message[];
  user?: { id: string; email: string; first_name: string; last_name: string };
}

export default function SupportTicketDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const { session } = useAuth();
  const [ticket, setTicket] = React.useState<TicketDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState<null | string>(null);

  // Message form
  const [message, setMessage] = React.useState("");
  const [internal, setInternal] = React.useState(false);

  // Escalate form
  const [escalateTo, setEscalateTo] = React.useState<"verification_officer" | "finance_admin" | "super_admin">("super_admin");
  const [escalateReason, setEscalateReason] = React.useState("");

  const isSupabaseAuth = session?.authenticated === true;

  const fetchTicket = React.useCallback(async () => {
    if (!params.ticketId || !isSupabaseAuth) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/support/tickets/${params.ticketId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load");
      else setTicket(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); }
    finally { setLoading(false); }
  }, [params.ticketId, isSupabaseAuth]);

  React.useEffect(() => { fetchTicket(); }, [fetchTicket]);

  async function callUpdate(action: string, value?: string, reason?: string) {
    if (!ticket) return false;
    setSubmitting(action);
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticket.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, value, reason }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Action failed", { description: data.error }); return false; }
      toast.success(`${action.replace(/_/g, " ")} succeeded`);
      await fetchTicket();
      return true;
    } finally { setSubmitting(null); }
  }

  async function handleSendMessage() {
    if (!ticket || !message.trim()) return;
    setSubmitting("message");
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message, internal }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Could not send message", { description: data.error }); return; }
      toast.success(internal ? "Internal note added" : "Reply sent");
      setMessage(""); setInternal(false);
      await fetchTicket();
    } finally { setSubmitting(null); }
  }

  async function handleAssignToMe() {
    if (!session?.userId) return;
    await callUpdate("assign", session.userId);
  }

  async function handleEscalate() {
    if (!escalateReason.trim()) { toast.error("An escalation reason is required"); return; }
    const ok = await callUpdate("escalate", escalateTo, escalateReason);
    if (ok) setEscalateReason("");
  }

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <AdminPageHeader title="Ticket details" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Support Staff account.
        </CardContent></Card>
      </div>
    );
  }

  if (loading) return <div className="mx-auto max-w-5xl"><div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></div>;

  if (error || !ticket) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Button asChild variant="ghost" size="sm"><Link href="/admin/support/tickets"><ArrowLeft className="mr-2 h-4 w-4" /> Back to tickets</Link></Button>
        <AdminPageHeader title="Ticket not found" />
        <Card><CardContent className="p-6 text-center text-sm text-destructive">{error || "Not found"}</CardContent></Card>
      </div>
    );
  }

  const isClosed = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/support/tickets"><ArrowLeft className="mr-2 h-4 w-4" /> Back to tickets</Link></Button>

      <AdminPageHeader
        eyebrow={ticket.reference}
        title={ticket.subject}
        description={`Opened ${formatRelativeTime(ticket.created_at)}`}
        actions={<>
          <PriorityBadge priority={ticket.priority as any} />
          <SupportTicketStatusBadge status={ticket.status as any} />
          {ticket.escalated && <Badge variant="outline" className="text-destructive">Escalated → {ticket.escalated_to?.replace(/_/g, " ")}</Badge>}
        </>}
      />
      <DemoModeBanner message="Live data — internal notes are never visible to customers (RLS-enforced). Every action is audit-logged." />

      <DetailLayout
        sidebar={
          <div className="space-y-4">
            {/* Customer */}
            {ticket.user && (
              <Card>
                <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{ticket.user.first_name} {ticket.user.last_name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{ticket.user.email}</p>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {!isClosed && (
                  <>
                    {ticket.assigned_to !== session?.userId && (
                      <Button className="w-full" variant="outline" onClick={handleAssignToMe} disabled={submitting === "assign"}>
                        {submitting === "assign" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Assign to me
                      </Button>
                    )}

                    <Select defaultValue={ticket.status} onValueChange={(v) => callUpdate("change_status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="awaiting_user">Awaiting user</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>

                    {!ticket.escalated ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="w-full" variant="outline">Escalate</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Escalate ticket</AlertDialogTitle>
                            <AlertDialogDescription>Escalate to another team. A reason is required.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-2">
                            <Label htmlFor="escalateTo">Escalate to</Label>
                            <Select value={escalateTo} onValueChange={(v) => setEscalateTo(v as any)}>
                              <SelectTrigger id="escalateTo"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="verification_officer">Verification Officer</SelectItem>
                                <SelectItem value="finance_admin">Finance Admin</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Label htmlFor="escalateReason">Reason (required)</Label>
                            <Textarea id="escalateReason" value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} rows={3} />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setEscalateReason("")}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleEscalate}>Confirm escalation</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button className="w-full" variant="outline" onClick={() => callUpdate("de_escalate")}>De-escalate</Button>
                    )}
                  </>
                )}
                {isClosed && (
                  <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                    This ticket is closed. Reopen by changing the status.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Original message */}
          <Card>
            <CardHeader><CardTitle className="text-base">Original message</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
              <Separator className="my-3" />
              <p className="text-xs text-muted-foreground">Category: {ticket.category} · Team: {ticket.team ?? "unassigned"}</p>
              {ticket.escalated_reason && <p className="text-xs text-warning-foreground mt-1">Escalation reason: {ticket.escalated_reason}</p>}
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card>
            <CardHeader><CardTitle className="text-base">Conversation ({ticket.messages.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {ticket.messages.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No replies yet.</p>}
              {ticket.messages.map((m) => (
                <div key={m.id} className={`rounded-md p-3 ${m.internal ? "border border-warning/30 bg-warning/5" : "bg-muted/40"}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-medium">
                      {m.author_name ?? m.author_role} ({m.author_role})
                      {m.internal && <Badge variant="outline" className="ml-2 text-xs text-warning-foreground"><Lock className="mr-1 h-3 w-3" />Internal</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(m.created_at)}</p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Reply box */}
          {!isClosed && (
            <Card>
              <CardHeader><CardTitle className="text-base">Reply</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Type your reply…" />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                    <Lock className="h-3 w-3" /> Internal note (not visible to customer)
                  </label>
                  <Button onClick={handleSendMessage} disabled={submitting === "message" || !message.trim()}>
                    {submitting === "message" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {internal ? "Add internal note" : "Send reply"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DetailLayout>
    </div>
  );
}
