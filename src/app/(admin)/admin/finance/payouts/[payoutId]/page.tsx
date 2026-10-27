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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { AdminPageHeader, DemoModeBanner, DetailLayout } from "@/components/admin/admin-page-components";
import { AuditTimeline } from "@/components/admin/audit-timeline";
import { PayoutStatusBadge, RoleBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import { bookings as allBookings } from "@/lib/data/fixtures";
import type { Payout, AuditLog } from "@/lib/types";
import { formatDateTime, formatRelativeTime, formatNgn } from "@/lib/utils/format";
import { toast } from "sonner";

export default function FinancePayoutDetailPage() {
  const params = useParams<{ payoutId: string }>();
  const { session } = useAuth();
  const [payout, setPayout] = React.useState<Payout | null>(null);
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");
  const [reverseReason, setReverseReason] = React.useState("");
  const [approveNotes, setApproveNotes] = React.useState("");

  React.useEffect(() => {
    if (!params.payoutId) return;
    Promise.all([
      getRepositories().payouts.getById(params.payoutId),
      getRepositories().auditLogs.list({ resourceType: "payout", resourceId: params.payoutId, pageSize: 50 }),
    ]).then(([p, a]) => { setPayout(p); setAuditLogs(a.items); setLoading(false); });
  }, [params.payoutId]);

  const approverId = session?.userId ?? "dev_finance_1";

  async function refresh() {
    if (!payout) return;
    const p = await getRepositories().payouts.getById(payout.id);
    setPayout(p);
    const a = await getRepositories().auditLogs.list({ resourceType: "payout", resourceId: payout.id, pageSize: 50 });
    setAuditLogs(a.items);
  }

  async function handleApprove() {
    if (!payout) return;
    setSubmitting(true);
    try {
      await getRepositories().payouts.approve(payout.id, approverId, approveNotes);
      toast.success("Payout approved", { description: "Status moved to in-flight. Backend will dispatch the bank transfer." });
      setApproveNotes("");
      await refresh();
    } catch (e) {
      toast.error("Could not approve", { description: e instanceof Error ? e.message : "Please try again." });
    } finally { setSubmitting(false); }
  }

  async function handleReject() {
    if (!payout) return;
    if (!rejectReason.trim()) { toast.error("A rejection reason is required"); return; }
    setSubmitting(true);
    try {
      await getRepositories().payouts.reject(payout.id, approverId, rejectReason);
      toast.success("Payout rejected");
      setRejectReason("");
      await refresh();
    } catch (e) {
      toast.error("Could not reject", { description: e instanceof Error ? e.message : "Please try again." });
    } finally { setSubmitting(false); }
  }

  async function handleReverse() {
    if (!payout) return;
    if (!reverseReason.trim()) { toast.error("A reversal reason is required"); return; }
    setSubmitting(true);
    try {
      await getRepositories().payouts.reverse(payout.id, approverId, reverseReason);
      toast.success("Payout reversed", { description: "Reversal initiated. The bank transfer will be recalled." });
      setReverseReason("");
      await refresh();
    } catch (e) {
      toast.error("Could not reverse", { description: e instanceof Error ? e.message : "Please try again." });
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="mx-auto max-w-5xl"><p className="text-sm text-muted-foreground">Loading payout…</p></div>;
  if (!payout) return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader title="Payout not found" breadcrumbs={[{ label: "Finance", href: "/admin/finance" }, { label: "Not found" }]} />
      <Button asChild variant="outline"><Link href="/admin/finance/payouts">Back to payouts</Link></Button>
    </div>
  );

  const landlord = allUsers.find((u) => u.id === payout.landlordId);
  const booking = allBookings.find((b) => b.id === payout.bookingId);
  const canApprove = payout.status === "scheduled";
  const canReject = payout.status === "scheduled" || payout.status === "in_flight";
  const canReverse = payout.status === "settled" || payout.status === "in_flight";
  const isClosed = payout.status === "settled" || payout.status === "failed" || payout.status === "reversed";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/finance/payouts"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to payouts</Link></Button>
      <AdminPageHeader
        eyebrow={payout.reference}
        title="Payout detail"
        description={`To ${landlord?.firstName ?? "Landlord"} ${landlord?.lastName ?? ""} · ${payout.bankAccountMasked}`}
        breadcrumbs={[{ label: "Finance", href: "/admin/finance" }, { label: "Payouts", href: "/admin/finance/payouts" }, { label: payout.reference }]}
        actions={<PayoutStatusBadge status={payout.status} />}
      />
      <DemoModeBanner />

      <DetailLayout
        sidebar={
          <>
            {/* Actions */}
            <Card>
              <CardHeader><CardTitle className="text-base">Payout actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {isClosed ? (
                  <p className="text-sm text-muted-foreground">This payout is closed. No further actions are available.</p>
                ) : (
                  <>
                    {/* Approve */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full" variant="outline" disabled={submitting || !canApprove}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-success" aria-hidden /> Approve
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Approve payout {payout.reference}?</DialogTitle>
                          <DialogDescription>
                            Approval moves the payout to in-flight and dispatches a bank transfer via Paystack. The payout will only be marked settled after the backend confirms the transfer. This action is audit-logged.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-1.5">
                          <Label htmlFor="approveNotes">Notes (optional)</Label>
                          <Textarea id="approveNotes" rows={3} value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} />
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
                        <Button className="w-full" variant="outline" disabled={submitting || !canReject}>
                          <XCircle className="mr-2 h-4 w-4 text-destructive" aria-hidden /> Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject payout {payout.reference}?</AlertDialogTitle>
                          <AlertDialogDescription>Rejection cancels the payout. A reason is required and will be audit-logged.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-1.5">
                          <Label htmlFor="rejectReason">Rejection reason (required)</Label>
                          <Textarea id="rejectReason" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleReject} disabled={submitting || !rejectReason.trim()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <XCircle className="mr-2 h-4 w-4" aria-hidden />}
                            Confirm rejection
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {/* Reverse */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full" variant="outline" disabled={submitting || !canReverse}>
                          <RotateCcw className="mr-2 h-4 w-4 text-warning-foreground" aria-hidden /> Reverse
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reverse payout {payout.reference}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Reversal attempts to recall the bank transfer. This is a high-severity action and will be audit-logged as critical. A reason is required.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-1.5">
                          <Label htmlFor="reverseReason">Reversal reason (required)</Label>
                          <Textarea id="reverseReason" rows={3} value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleReverse} disabled={submitting || !reverseReason.trim()} className="bg-warning text-warning-foreground hover:bg-warning/90">
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <RotateCcw className="mr-2 h-4 w-4" aria-hidden />}
                            Confirm reversal
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payout metadata */}
            <Card>
              <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{payout.reference}</span></div>
                {payout.providerReference && <div className="flex justify-between"><span className="text-muted-foreground">Provider ref</span><span className="font-mono text-xs">{payout.providerReference}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Bank account</span><span className="text-xs">{payout.bankAccountMasked}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Scheduled</span><span>{formatRelativeTime(payout.scheduledFor)}</span></div>
                {payout.settledAt && <div className="flex justify-between"><span className="text-muted-foreground">Settled</span><span>{formatRelativeTime(payout.settledAt)}</span></div>}
                {payout.approvedAt && <div className="flex justify-between"><span className="text-muted-foreground">Approved</span><span>{formatRelativeTime(payout.approvedAt)}</span></div>}
                {payout.rejectionReason && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">Rejected: {payout.rejectionReason}</div>}
                {payout.reversalReason && <div className="rounded-md bg-warning/10 p-2 text-xs text-warning-foreground">Reversed: {payout.reversalReason}</div>}
              </CardContent>
            </Card>
          </>
        }
      >
        {/* Amounts */}
        <Card>
          <CardHeader><CardTitle className="text-base">Amounts</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Gross (from booking)</span><Price kobo={payout.grossKobo} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Platform fee</span><span className="text-destructive">−{formatNgn(payout.platformFeeKobo)}</span></div>
            <Separator />
            <div className="flex justify-between font-semibold"><span>Net to landlord</span><Price kobo={payout.netKobo} /></div>
          </CardContent>
        </Card>

        {/* Eligibility flags */}
        {payout.eligibilityFlags.length > 0 && (
          <Card className="border-warning/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-warning-foreground" aria-hidden />
                <div>
                  <p className="text-sm font-medium">Eligibility flags</p>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {payout.eligibilityFlags.map((f, i) => <li key={i}>· {f}</li>)}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Related parties */}
        <Card>
          <CardHeader><CardTitle className="text-base">Related</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {landlord && (
              <div>
                <p className="text-xs text-muted-foreground">Landlord</p>
                <div className="flex items-center justify-between">
                  <span>{landlord.firstName} {landlord.lastName}</span>
                  <RoleBadge role={landlord.role} active={landlord.active} />
                </div>
                <p className="text-xs text-muted-foreground">{landlord.email}</p>
              </div>
            )}
            {booking && (
              <div>
                <p className="text-xs text-muted-foreground">Booking</p>
                <Link href="/admin/bookings" className="font-mono text-xs text-primary hover:underline">{booking.reference}</Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backend verification notice */}
        {payout.status === "settled" && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="flex items-start gap-2 p-4 text-sm">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-success" aria-hidden />
              <span><strong className="text-foreground">Backend-verified settlement:</strong> This payout was confirmed settled by the Paystack webhook. The landlord's bank has acknowledged receipt.</span>
            </CardContent>
          </Card>
        )}

        <AuditTimeline logs={auditLogs} title="Payout activity" />
      </DetailLayout>
    </div>
  );
}
