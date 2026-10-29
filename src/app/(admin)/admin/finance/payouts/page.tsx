"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PayoutStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn, formatDateTime } from "@/lib/utils/format";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/admin-page-components";

interface Payout {
  id: string;
  reference: string;
  landlord_id: string;
  booking_id: string;
  gross_kobo: number;
  platform_fee_kobo: number;
  net_kobo: number;
  status: string;
  settled_at: string | null;
  bank_account_masked: string;
  scheduled_for: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  provider_reference: string | null;
  eligibility_flags: string[];
  created_at: string;
}

export default function FinancePayoutsPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<Payout[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const pageSize = 20;
  const isSupabaseAuth = session?.authenticated === true;

  const fetchPage = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/finance/payouts?${params}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load");
      else { setRows(data.items ?? []); setTotal(data.total ?? 0); }
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); }
    finally { setLoading(false); }
  }, [isSupabaseAuth, page, pageSize, status]);

  React.useEffect(() => { fetchPage(); }, [fetchPage]);

  async function handleApprove(payoutId: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/payouts/${payoutId}/approve`, {
        method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) { toast.error("Approve failed", { description: data.error }); return; }
      toast.success("Payout approved", { description: "Status moved to in_flight. No live transfer initiated." });
      await fetchPage();
    } finally { setSubmitting(false); }
  }

  async function handleReject(payoutId: string, reason: string) {
    if (!reason.trim()) { toast.error("A rejection reason is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/payouts/${payoutId}/reject`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ reason }) });
      const data = await res.json();
      if (!res.ok) { toast.error("Reject failed", { description: data.error }); return; }
      toast.success("Payout rejected");
      await fetchPage();
    } finally { setSubmitting(false); }
  }

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="Finance operations" title="Payouts" />
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
        title="Payouts"
        description="Review and approve landlord payouts. Approval does NOT trigger a live transfer — it moves the payout to in_flight for separate settlement."
        breadcrumbs={[{ label: "Finance Admin", href: "/admin/finance" }, { label: "Payouts" }]}
      />

      <Card>
        <CardContent className="flex items-center gap-2 p-4">
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_flight">In flight</SelectItem>
              <SelectItem value="settled">Settled</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="reversed">Reversed</SelectItem>
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
              <div className="py-12 text-center text-sm text-muted-foreground">No payouts found.</div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((p) => (
                  <li key={p.id} className="space-y-2 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/admin/finance/payouts/${p.id}`} className="font-medium text-primary hover:underline">
                            {p.reference}
                          </Link>
                          <PayoutStatusBadge status={p.status as any} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Landlord {p.landlord_id} · Bank {p.bank_account_masked} · Scheduled {formatDateTime(p.scheduled_for)}
                          {p.approved_at && ` · Approved ${formatDateTime(p.approved_at)}`}
                        </p>
                        {p.eligibility_flags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {p.eligibility_flags.map((f) => <Badge key={f} variant="outline" className="text-xs">{f}</Badge>)}
                          </div>
                        )}
                        {p.rejection_reason && <p className="text-xs text-destructive">Rejection: {p.rejection_reason}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNgn(p.net_kobo)}</p>
                        <p className="text-xs text-muted-foreground">gross {formatNgn(p.gross_kobo)} · fee {formatNgn(p.platform_fee_kobo)}</p>
                        {p.status === "scheduled" && (
                          <div className="mt-2 flex gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" disabled={submitting}>Approve</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Approve payout?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Approval moves the payout to in_flight. No live bank transfer is initiated. Self-approval is blocked.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleApprove(p.id)}>Confirm approval</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <RejectDialog onReject={(reason) => handleReject(p.id, reason)} submitting={submitting} />
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

function RejectDialog({ onReject, submitting }: { onReject: (reason: string) => void; submitting: boolean }) {
  const [reason, setReason] = React.useState("");
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={submitting}>Reject</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject payout?</AlertDialogTitle>
          <AlertDialogDescription>A rejection reason is required.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="payoutRejectReason">Reason</Label>
          <Textarea id="payoutRejectReason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setReason("")}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => { onReject(reason); setReason(""); }}>Confirm rejection</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
