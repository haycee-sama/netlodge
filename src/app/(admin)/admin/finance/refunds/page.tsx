"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RefundStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn, formatDateTime } from "@/lib/utils/format";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/admin-page-components";

interface Refund {
  id: string;
  reference: string;
  payment_id: string;
  payment_reference: string;
  booking_id: string;
  amount_kobo: number;
  currency: string;
  reason: string;
  reason_detail: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  provider_reference: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  created_at: string;
}

const REFUND_REASONS = [
  { value: "booking_cancelled_within_24h", label: "Booking cancelled within 24h" },
  { value: "landlord_failed_to_confirm", label: "Landlord failed to confirm" },
  { value: "duplicate_payment", label: "Duplicate payment" },
  { value: "failed_payment", label: "Failed payment" },
  { value: "service_not_delivered", label: "Service not delivered" },
  { value: "mutual_agreement", label: "Mutual agreement" },
  { value: "policy_violation", label: "Policy violation" },
  { value: "other", label: "Other" },
];

export default function FinanceRefundsPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<Refund[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 20;
  const isSupabaseAuth = session?.authenticated === true;

  // New refund form
  const [paymentId, setPaymentId] = React.useState("");
  const [amountKobo, setAmountKobo] = React.useState("");
  const [reason, setReason] = React.useState("booking_cancelled_within_24h");
  const [reasonDetail, setReasonDetail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const fetchPage = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/finance/refunds?${params}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load");
      else { setRows(data.items ?? []); setTotal(data.total ?? 0); }
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); }
    finally { setLoading(false); }
  }, [isSupabaseAuth, page, pageSize, status]);

  React.useEffect(() => { fetchPage(); }, [fetchPage]);

  async function handleCreate() {
    if (!paymentId.trim() || !amountKobo || !reasonDetail.trim()) {
      toast.error("All fields are required");
      return;
    }
    const amt = Number(amountKobo);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paymentId, amountKobo: amt, reason, reasonDetail }) });
      const data = await res.json();
      if (!res.ok) { toast.error("Failed to create refund", { description: data.error }); return; }
      toast.success("Refund request created", { description: "It is now in the review queue." });
      setPaymentId(""); setAmountKobo(""); setReasonDetail("");
      await fetchPage();
    } finally { setSubmitting(false); }
  }

  async function handleReview(refundId: string, action: "approve" | "reject", notes: string) {
    if (action === "reject" && !notes.trim()) { toast.error("A rejection reason is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/refunds/${refundId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, notes }) });
      const data = await res.json();
      if (!res.ok) { toast.error("Review failed", { description: data.error }); return; }
      toast.success(`Refund ${action}d`, { description: data.providerReference ? `Provider ref: ${data.providerReference}` : undefined });
      await fetchPage();
    } finally { setSubmitting(false); }
  }

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="Finance operations" title="Refunds" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Finance Admin account.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Refunds"
        description="Review and process refund requests. Approvals call the Paystack refund API (test mode only) and record the provider reference."
        breadcrumbs={[{ label: "Finance Admin", href: "/admin/finance" }, { label: "Refunds" }]}
        actions={
          <Dialog>
            <DialogTrigger asChild>
              <Button><RotateCcw className="mr-2 h-4 w-4" /> New refund</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create refund request</DialogTitle>
                <DialogDescription>Enter the payment ID, amount (in kobo), and reason. The system validates the refundable balance before creating the request.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="paymentId">Payment ID</Label>
                  <Input id="paymentId" value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="uuid of the successful payment" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="amountKobo">Amount (kobo)</Label>
                  <Input id="amountKobo" type="number" value={amountKobo} onChange={(e) => setAmountKobo(e.target.value)} placeholder="e.g. 560000" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reason">Reason</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger id="reason"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REFUND_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reasonDetail">Reason detail (required)</Label>
                  <Textarea id="reasonDetail" value={reasonDetail} onChange={(e) => setReasonDetail(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create refund
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="flex items-center gap-2 p-4">
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="requested">Requested</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
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
              <div className="py-12 text-center text-sm text-muted-foreground">No refunds found.</div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.id} className="space-y-2 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{r.reference}</p>
                          <RefundStatusBadge status={r.status as any} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Payment {r.payment_reference} · {formatDateTime(r.created_at)}
                          {r.provider_reference && ` · Provider ${r.provider_reference}`}
                        </p>
                        <p className="text-xs">Reason: {r.reason.replace(/_/g, " ")} — {r.reason_detail}</p>
                        {r.review_notes && <p className="text-xs italic text-muted-foreground">Notes: {r.review_notes}</p>}
                        {r.failure_reason && <p className="text-xs text-destructive">Failure: {r.failure_reason}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNgn(r.amount_kobo)}</p>
                        {(r.status === "requested" || r.status === "under_review") && (
                          <div className="mt-2 flex gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" disabled={submitting}>Approve</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Approve refund?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will call the Paystack refund API (test mode). The refund will move to "processing" until the provider confirms completion.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <Textarea placeholder="Optional review notes…" onChange={(e) => (r.review_notes = e.target.value)} />
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleReview(r.id, "approve", r.review_notes ?? "")}>
                                    Confirm approval
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" disabled={submitting}>Reject</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reject refund?</AlertDialogTitle>
                                  <AlertDialogDescription>A rejection reason is required.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <Textarea placeholder="Reason for rejection…" onChange={(e) => (r.review_notes = e.target.value)} />
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleReview(r.id, "reject", r.review_notes ?? "")}>
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
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page === Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
