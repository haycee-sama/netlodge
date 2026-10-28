"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { SupportTicketStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatRelativeTime, formatDateTime } from "@/lib/utils/format";
import { Loader2, LifeBuoy, Plus, MessageSquare, ArrowLeft, Send, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Ticket {
  id: string;
  reference: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  message: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  first_response_at: string | null;
}

interface TicketDetail extends Ticket {
  messages: { id: string; author_id: string; author_role: string; author_name: string | null; message: string; internal: boolean; created_at: string }[];
}

interface Message {
  id: string;
  author_id: string;
  author_role: string;
  author_name: string | null;
  message: string;
  internal: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: "bookings", label: "Bookings" },
  { value: "payments", label: "Payments" },
  { value: "verification", label: "Verification" },
  { value: "account", label: "Account" },
  { value: "general", label: "General" },
];

export default function StudentSupportPage() {
  const { session } = useAuth();
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  const fetchTickets = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/student/support/tickets", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load");
      else setTickets(data.items ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); }
    finally { setLoading(false); }
  }, [isSupabaseAuth]);

  React.useEffect(() => { fetchTickets(); }, [fetchTickets]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader eyebrow="Support" title="Help & support" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real account to view and create support tickets.
        </CardContent></Card>
      </div>
    );
  }

  if (selectedId) {
    return <TicketDetailView ticketId={selectedId} onBack={() => { setSelectedId(null); fetchTickets(); }} />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Support"
        title="Help & support"
        description="View your support tickets and create new ones. Our team responds during business hours."
        actions={<NewTicketDialog onCreated={fetchTickets} />}
      />

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchTickets}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="h-5 w-5" aria-hidden />}
          title="No support tickets"
          description="You haven't created any tickets yet. Click 'New ticket' to get help."
          action={<NewTicketDialog onCreated={fetchTickets} />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className="flex w-full flex-col gap-1 p-4 text-left hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{t.subject}</p>
                        <PriorityBadge priority={t.priority as any} />
                        <SupportTicketStatusBadge status={t.status as any} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.reference} · {t.category} · opened {formatRelativeTime(t.created_at)}
                        {t.first_response_at && ` · responded ${formatRelativeTime(t.first_response_at)}`}
                      </p>
                    </div>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
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

function NewTicketDialog({ onCreated }: { onCreated: () => void }) {
  const [subject, setSubject] = React.useState("");
  const [category, setCategory] = React.useState("general");
  const [priority, setPriority] = React.useState("medium");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit() {
    if (subject.length < 5) { toast.error("Subject must be at least 5 characters"); return; }
    if (message.length < 10) { toast.error("Message must be at least 10 characters"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/student/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject, category, priority, message }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Could not create ticket", { description: data.error }); return; }
      toast.success("Ticket created", { description: "Our team will respond within 24 hours." });
      setSubject(""); setCategory("general"); setPriority("medium"); setMessage("");
      onCreated();
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> New ticket</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a support ticket</DialogTitle>
          <DialogDescription>Describe your issue and our team will respond within 24 hours.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="subject">Subject (5–200 chars)</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Brief summary of your issue" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="message">Message (10–5000 chars)</Label>
            <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={5000} placeholder="Describe your issue in detail…" />
            <p className="text-xs text-muted-foreground">{message.length}/5000</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TicketDetailView({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const [ticket, setTicket] = React.useState<TicketDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reply, setReply] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const fetchTicket = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/student/support/tickets/${ticketId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load");
      else setTicket(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); }
    finally { setLoading(false); }
  }, [ticketId]);

  React.useEffect(() => { fetchTicket(); }, [fetchTicket]);

  async function handleReply() {
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/student/support/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: reply }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Could not send reply", { description: data.error }); return; }
      toast.success("Reply sent");
      setReply("");
      await fetchTicket();
    } finally { setSubmitting(false); }
  }

  async function handleClose() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/student/support/tickets/${ticketId}/close`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Could not close ticket", { description: data.error }); return; }
      toast.success("Ticket closed");
      await fetchTicket();
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="mx-auto max-w-3xl"><div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></div>;

  if (error || !ticket) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to tickets</Button>
        <Card><CardContent className="p-6 text-center text-sm text-destructive">{error || "Ticket not found"}</CardContent></Card>
      </div>
    );
  }

  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to tickets</Button>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">{ticket.subject}</h1>
          <PriorityBadge priority={ticket.priority as any} />
          <SupportTicketStatusBadge status={ticket.status as any} />
        </div>
        <p className="text-xs text-muted-foreground">
          {ticket.reference} · {ticket.category} · opened {formatDateTime(ticket.created_at)}
          {ticket.first_response_at && ` · first response ${formatRelativeTime(ticket.first_response_at)}`}
        </p>
      </div>

      {/* Original message */}
      <Card>
        <CardHeader><CardTitle className="text-base">Your message</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
        </CardContent>
      </Card>

      {/* Conversation */}
      {ticket.messages.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Conversation ({ticket.messages.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ticket.messages.map((m) => {
              const isOwn = m.author_role === "student" || m.author_id === ticket.messages?.[0]?.author_id;
              return (
                <div key={m.id} className={`rounded-md p-3 ${isOwn ? "bg-muted/40" : "border border-primary/20 bg-primary/5"}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-medium">
                      {m.author_name ?? m.author_role}
                      <Badge variant="outline" className="ml-2 text-xs">{m.author_role.replace(/_/g, " ")}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(m.created_at)}</p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Reply box */}
      {!isClosed ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Reply</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="Type your reply…" maxLength={5000} />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{reply.length}/5000</p>
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={submitting}><XCircle className="mr-2 h-4 w-4" /> Close ticket</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Close this ticket?</AlertDialogTitle>
                      <AlertDialogDescription>Closing will end the conversation. You can still view the ticket but cannot reply.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClose}>Confirm close</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button onClick={handleReply} disabled={submitting || !reply.trim()}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send reply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            This ticket is {ticket.status}. You can no longer reply.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
