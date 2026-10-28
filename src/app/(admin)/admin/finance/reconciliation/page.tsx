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
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn, formatDateTime } from "@/lib/utils/format";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Reconciliation {
  id: string;
  internal_reference: string;
  provider_reference: string | null;
  internal_amount_kobo: number;
  provider_amount_kobo: number | null;
  internal_settled_at: string | null;
  provider_settled_at: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  matched: "text-success",
  unmatched_provider: "text-warning-foreground",
  unmatched_internal: "text-warning-foreground",
  amount_discrepancy: "text-destructive",
  duplicate_reference: "text-destructive",
  settlement_date_mismatch: "text-warning-foreground",
  resolved: "text-muted-foreground",
};

export default function FinanceReconciliationPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<Reconciliation[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const pageSize = 20;
  const isSupabaseAuth = session?.authenticated === true;

  // Run reconciliation dialog
  const [runOpen, setRunOpen] = React.useState(false);
  const [runFrom, setRunFrom] = React.useState("");
  const [runTo, setRunTo] = React.useState("");

  const fetchPage = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/finance/reconciliation?${params}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load");
      else { setRows(data.items ?? []); setTotal(data.total ?? 0); }
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); }
    finally { setLoading(false); }
  }, [isSupabaseAuth, page, pageSize, status]);

  React.useEffect(() => { fetchPage(); }, [fetchPage]);

  async function handleRun() {
    if (!runFrom || !runTo) { toast.error("From and To dates are required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/reconciliation/run", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ from: new Date(runFrom).toISOString(), to: new Date(runTo).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Reconciliation run failed", { description: data.error }); return; }
      toast.success("Reconciliation complete", {
        description: `${data.total} total · ${data.inserted} new · ${data.skipped} skipped · ${data.discrepancies} discrepancies`,
      });
      setRunOpen(false); setRunFrom(""); setRunTo("");
      await fetchPage();
    } finally { setSubmitting(false); }
  }

  async function handleResolve(recordId: string, notes: string) {
    if (!notes.trim()) { toast.error("Resolution notes are required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/reconciliation/${recordId}/resolve`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Resolve failed", { description: data.error }); return; }
      toast.success("Record resolved");
      await fetchPage();
    } finally { setSubmitting(false); }
  }

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="Finance operations" title="Reconciliation" />
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
        title="Reconciliation"
        description="Compare local payment records with Paystack's verified status. Discrepancies are flagged for manual review — never auto-fixed."
        breadcrumbs={[{ label: "Finance Admin", href: "/admin/finance" }, { label: "Reconciliation" }]}
        actions={
          <Dialog open={runOpen} onOpenChange={setRunOpen}>
            <DialogTrigger asChild>
              <Button><RefreshCw className="mr-2 h-4 w-4" /> Run reconciliation</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Run reconciliation pass</DialogTitle>
                <DialogDescription>
                  Select a date range. The system will fetch all successful payments in that range, create reconciliation records, and verify each with Paystack. Idempotent — safe to re-run.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="runFrom">From</Label>
                  <Input id="runFrom" type="datetime-local" value={runFrom} onChange={(e) => setRunFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="runTo">To</Label>
                  <Input id="runTo" type="datetime-local" value={runTo} onChange={(e) => setRunTo(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRunOpen(false)}>Cancel</Button>
                <Button onClick={handleRun} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Run pass
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <DemoModeBanner message="Live data — reconciliation is idempotent. Discrepancies are flagged for human review, never auto-fixed." />

      <Card>
        <CardContent className="flex items-center gap-2 p-4">
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="unmatched_provider">Unmatched (provider)</SelectItem>
              <SelectItem value="unmatched_internal">Unmatched (internal)</SelectItem>
              <SelectItem value="amount_discrepancy">Amount discrepancy</SelectItem>
              <SelectItem value="duplicate_reference">Duplicate reference</SelectItem>
              <SelectItem value="settlement_date_mismatch">Settlement date mismatch</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
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
              <div className="py-12 text-center text-sm text-muted-foreground">
                No reconciliation records yet. Click "Run reconciliation" to start a pass.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.id} className="space-y-2 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{r.internal_reference}</p>
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[r.status] ?? ""}`}>{r.status.replace(/_/g, " ")}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Internal: {formatNgn(r.internal_amount_kobo)} · Provider: {r.provider_amount_kobo ? formatNgn(r.provider_amount_kobo) : "—"}
                          {r.provider_reference && ` · Provider ref ${r.provider_reference}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Internal settled: {r.internal_settled_at ? formatDateTime(r.internal_settled_at) : "—"}
                          {r.provider_settled_at && ` · Provider settled: ${formatDateTime(r.provider_settled_at)}`}
                        </p>
                        {r.resolution_notes && <p className="text-xs italic text-muted-foreground">Resolution: {r.resolution_notes}</p>}
                      </div>
                      {r.status !== "resolved" && r.status !== "matched" && (
                        <ResolveDialog onResolve={(notes) => handleResolve(r.id, notes)} submitting={submitting} />
                      )}
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

function ResolveDialog({ onResolve, submitting }: { onResolve: (notes: string) => void; submitting: boolean }) {
  const [notes, setNotes] = React.useState("");
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={submitting}>Resolve</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resolve discrepancy?</AlertDialogTitle>
          <AlertDialogDescription>
            Mark this record as resolved. Resolution notes are required and audit-logged. The underlying payment record is NOT modified — this only marks the reconciliation record.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="recNotes">Resolution notes (required)</Label>
          <Textarea id="recNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="e.g. Verified with Paystack dashboard — amount matches after fee adjustment." />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setNotes("")}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => { onResolve(notes); setNotes(""); }}>Confirm resolution</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
