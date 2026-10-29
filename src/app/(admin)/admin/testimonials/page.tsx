"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime } from "@/lib/utils/format";
import { Loader2, Plus, CheckCircle2, XCircle, Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/admin-page-components";

interface Testimonial {
  id: string;
  author_name: string;
  author_role: string;
  author_university: string | null;
  author_level: string | null;
  quote: string;
  rating: number | null;
  status: string;
  published: boolean;
  display_order: number;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  landlord: "Landlord",
  parent: "Parent",
  staff: "Staff" };

export default function AdminTestimonialsPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<Testimonial[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState("all");
  const [submitting, setSubmitting] = React.useState(false);
  const isSupabaseAuth = session?.authenticated === true;

  const fetchPage = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({});
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/testimonials?${params}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load");
      else { setRows(data.items ?? []); setTotal(data.total ?? 0); }
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); }
    finally { setLoading(false); }
  }, [isSupabaseAuth, status]);

  React.useEffect(() => { fetchPage(); }, [fetchPage]);

  async function handleReview(testimonialId: string, action: "approve" | "reject", notes: string) {
    if (action === "reject" && !notes.trim()) { toast.error("A rejection reason is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/testimonials/${testimonialId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, reviewNotes: notes || null }) });
      const data = await res.json();
      if (!res.ok) { toast.error("Review failed", { description: data.error }); return; }
      toast.success(`Testimonial ${action}d`, {
        description: action === "approve" ? "It is now published on the homepage." : "It has been removed from the queue." });
      await fetchPage();
    } finally { setSubmitting(false); }
  }

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="Configuration" title="Testimonials" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Super Admin account.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Configuration"
        title="Testimonials"
        description="Review testimonials submitted by users and create new ones. Only approved testimonials appear on the public homepage."
        breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Testimonials" }]}
        actions={<CreateTestimonialDialog onCreated={fetchPage} submitting={submitting} />}
      />

      <Card>
        <CardContent className="flex items-center gap-2 p-4">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-9 ml-auto" onClick={fetchPage} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
            <span>{error}</span><Button variant="outline" size="sm" onClick={fetchPage}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {!error && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground" aria-hidden />
                <p className="text-sm font-medium">No testimonials found</p>
                <p className="text-xs text-muted-foreground max-w-md">
                  {status === "pending" ? "No pending reviews. New submissions will appear here." : status === "approved" ? "No approved testimonials yet. Approve a pending one to publish it on the homepage." : "No testimonials match this filter."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((t) => (
                  <li key={t.id} className="space-y-2 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{t.author_name}</p>
                          <Badge variant="outline" className="text-xs">{ROLE_LABELS[t.author_role] ?? t.author_role}</Badge>
                          <StatusBadge status={t.status} />
                          {t.rating && (
                            <Badge variant="outline" className="text-xs gap-0.5">
                              <Star className="h-3 w-3 fill-primary text-primary" aria-hidden />
                              {t.rating}
                            </Badge>
                          )}
                          <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(t.created_at)}</span>
                        </div>
                        <p className="text-sm italic text-foreground">&ldquo;{t.quote}&rdquo;</p>
                        <p className="text-xs text-muted-foreground">
                          {t.author_university && `University: ${t.author_university}`}
                          {t.author_level && ` · Level: ${t.author_level}`}
                          {t.reviewed_at && ` · Reviewed ${formatDateTime(t.reviewed_at)}`}
                        </p>
                        {t.review_notes && <p className="text-xs italic text-muted-foreground">Notes: {t.review_notes}</p>}
                      </div>
                      {t.status === "pending" && (
                        <div className="flex gap-2">
                          <ReviewDialog
                            action="approve"
                            onSubmit={(notes) => handleReview(t.id, "approve", notes)}
                            submitting={submitting}
                          />
                          <ReviewDialog
                            action="reject"
                            onSubmit={(notes) => handleReview(t.id, "reject", notes)}
                            submitting={submitting}
                          />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <p className="text-xs text-muted-foreground text-center">{total} testimonial{total === 1 ? "" : "s"} total</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge variant="outline" className="text-xs text-success">Approved</Badge>;
  if (status === "rejected") return <Badge variant="outline" className="text-xs text-destructive">Rejected</Badge>;
  return <Badge variant="outline" className="text-xs text-warning-foreground">Pending</Badge>;
}

function ReviewDialog({
  action,
  onSubmit,
  submitting }: {
  action: "approve" | "reject";
  onSubmit: (notes: string) => void;
  submitting: boolean;
}) {
  const [notes, setNotes] = React.useState("");
  const isApprove = action === "approve";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={isApprove ? "default" : "outline"} disabled={submitting}>
          {isApprove ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <XCircle className="mr-1.5 h-3.5 w-3.5" />}
          {isApprove ? "Approve" : "Reject"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isApprove ? "Approve testimonial?" : "Reject testimonial?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isApprove
              ? "Approved testimonials are published on the public homepage immediately."
              : "A rejection reason is required. The testimonial will not appear on the homepage."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {!isApprove && (
          <div className="space-y-2">
            <Label htmlFor="rejectNotes">Reason</Label>
            <Textarea id="rejectNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Why is this testimonial being rejected?" />
          </div>
        )}
        {isApprove && (
          <div className="space-y-2">
            <Label htmlFor="approveNotes">Notes (optional)</Label>
            <Textarea id="approveNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Internal notes (not shown publicly)" />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setNotes("")}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => { onSubmit(notes); setNotes(""); }}>
            Confirm {isApprove ? "approval" : "rejection"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CreateTestimonialDialog({
  onCreated,
  submitting }: {
  onCreated: () => void;
  submitting: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [authorName, setAuthorName] = React.useState("");
  const [authorRole, setAuthorRole] = React.useState("student");
  const [authorUniversity, setAuthorUniversity] = React.useState("");
  const [authorLevel, setAuthorLevel] = React.useState("");
  const [quote, setQuote] = React.useState("");
  const [rating, setRating] = React.useState("");

  async function handleCreate() {
    if (!authorName.trim() || !quote.trim()) { toast.error("Author name and quote are required"); return; }
    try {
      const res = await fetch("/api/admin/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          authorName: authorName.trim(),
          authorRole,
          authorUniversity: authorUniversity.trim() || undefined,
          authorLevel: authorLevel.trim() || undefined,
          quote: quote.trim(),
          rating: rating ? Number(rating) : undefined }) });
      const data = await res.json();
      if (!res.ok) { toast.error("Failed to create testimonial", { description: data.error }); return; }
      toast.success("Testimonial created", { description: "It is now in the pending queue — approve it to publish." });
      setAuthorName(""); setAuthorUniversity(""); setAuthorLevel(""); setQuote(""); setRating(""); setAuthorRole("student");
      setOpen(false);
      onCreated();
    } catch (e) {
      toast.error("Network error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> New testimonial</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create testimonial</DialogTitle>
          <DialogDescription>
            Add a testimonial from a real user. The testimonial is created with status=&ldquo;pending&rdquo; — you must approve it before it appears on the homepage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="authorName">Author name *</Label>
              <Input id="authorName" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Adaeze Okonkwo" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="authorRole">Author role *</Label>
              <Select value={authorRole} onValueChange={setAuthorRole}>
                <SelectTrigger id="authorRole"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="landlord">Landlord</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="authorUniversity">University (optional)</Label>
              <Input id="authorUniversity" value={authorUniversity} onChange={(e) => setAuthorUniversity(e.target.value)} placeholder="UNILAG" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="authorLevel">Level / course (optional)</Label>
              <Input id="authorLevel" value={authorLevel} onChange={(e) => setAuthorLevel(e.target.value)} placeholder="300-level, Mass Communication" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="quote">Quote *</Label>
            <Textarea id="quote" value={quote} onChange={(e) => setQuote(e.target.value)} rows={4} placeholder="The actual testimonial text — must be a genuine review from the named person." />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rating">Rating (optional, 1-5)</Label>
            <Input id="rating" type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} placeholder="5" />
            <p className="text-xs text-muted-foreground">Only set a rating if you are confident it is genuine.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create testimonial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
