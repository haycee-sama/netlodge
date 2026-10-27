"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { ReconciliationStatusBadge } from "@/components/shared/status-badges";
import { StatCard } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import type { ReconciliationRecord, ReconciliationStatus } from "@/lib/types";
import { formatRelativeTime, formatNgn } from "@/lib/utils/format";
import { toast } from "sonner";
import { Scale, Loader2, CheckCircle2 } from "lucide-react";

const STATUS_OPTIONS: { value: "all" | ReconciliationStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "matched", label: "Matched" },
  { value: "unmatched_provider", label: "Unmatched (provider)" },
  { value: "unmatched_internal", label: "Unmatched (internal)" },
  { value: "amount_discrepancy", label: "Amount discrepancy" },
  { value: "duplicate_reference", label: "Duplicate reference" },
  { value: "settlement_date_mismatch", label: "Settlement date mismatch" },
  { value: "resolved", label: "Resolved" },
];

export default function FinanceReconciliationPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<ReconciliationRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<"all" | ReconciliationStatus>("all");
  const [resolveTarget, setResolveTarget] = React.useState<ReconciliationRecord | null>(null);
  const [resolveNotes, setResolveNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [running, setRunning] = React.useState(false);

  const actorId = session?.userId ?? "dev_finance_1";

  React.useEffect(() => {
    setLoading(true);
    getRepositories().reconciliation.listAll({ status: status === "all" ? undefined : status, pageSize: 100 }).then((r) => {
      setRows(r.items); setLoading(false);
    });
  }, [status]);

  const matched = rows.filter((r) => r.status === "matched").length;
  const unmatched = rows.filter((r) => r.status === "unmatched_internal" || r.status === "unmatched_provider").length;
  const discrepancies = rows.filter((r) => r.status === "amount_discrepancy" || r.status === "duplicate_reference" || r.status === "settlement_date_mismatch").length;

  async function handleRunReconciliation() {
    setRunning(true);
    try {
      const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const to = new Date().toISOString().slice(0, 10);
      const result = await getRepositories().reconciliation.runReconciliation({ actorId, from, to });
      toast.success("Reconciliation complete", { description: `${result.matched} matched, ${result.unmatched} unmatched, ${result.discrepancies} discrepancies.` });
      // Refresh
      getRepositories().reconciliation.listAll({ status: status === "all" ? undefined : status, pageSize: 100 }).then((r) => setRows(r.items));
    } finally { setRunning(false); }
  }

  async function handleResolve() {
    if (!resolveTarget) return;
    if (!resolveNotes.trim()) { toast.error("Resolution notes are required"); return; }
    setSubmitting(true);
    try {
      await getRepositories().reconciliation.resolve(resolveTarget.id, { resolverId: actorId, notes: resolveNotes });
      toast.success("Discrepancy resolved");
      setResolveNotes(""); setResolveTarget(null);
      getRepositories().reconciliation.listAll({ status: status === "all" ? undefined : status, pageSize: 100 }).then((r) => setRows(r.items));
    } finally { setSubmitting(false); }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Reconciliation"
        description="Compare internal payment records against Paystack settlement reports. Matched transactions are confirmed; discrepancies require investigation."
        breadcrumbs={[{ label: "Finance", href: "/admin/finance" }, { label: "Reconciliation" }]}
        actions={
          <Button onClick={handleRunReconciliation} disabled={running}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Scale className="mr-2 h-4 w-4" aria-hidden />}
            Run reconciliation
          </Button>
        }
      />
      <DemoModeBanner message="In demo mode, 'Run reconciliation' returns a summary based on existing fixture records. In production, this fetches the Paystack settlement report for the date range and matches it against internal payment records." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Matched" value={matched} icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} />
        <StatCard label="Unmatched" value={unmatched} icon={<Scale className="h-4 w-4" aria-hidden />} />
        <StatCard label="Discrepancies" value={discrepancies} icon={<Scale className="h-4 w-4" aria-hidden />} />
      </div>

      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); }}>
          <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No reconciliation records. Run a reconciliation pass to populate.</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs font-medium">{r.internalReference}</p>
                      <ReconciliationStatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Internal: {formatNgn(r.internalAmountKobo)} · Provider: {r.providerReference ?? "—"} ({r.providerAmountKobo ? formatNgn(r.providerAmountKobo) : "—"})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Internal settled: {r.internalSettledAt ? formatRelativeTime(r.internalSettledAt) : "—"} · Provider settled: {r.providerSettledAt ? formatRelativeTime(r.providerSettledAt) : "—"}
                    </p>
                    {r.resolutionNotes && <p className="text-xs italic text-muted-foreground">Resolved: "{r.resolutionNotes}"</p>}
                  </div>
                  {r.status !== "matched" && r.status !== "resolved" && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => { setResolveTarget(r); setResolveNotes(""); }}>Resolve</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Resolve discrepancy</DialogTitle>
                          <DialogDescription>Document how this reconciliation discrepancy was resolved. The resolution is audit-logged.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-1.5">
                          <Label htmlFor="rnotes">Resolution notes (required)</Label>
                          <Textarea id="rnotes" rows={4} placeholder="e.g. Confirmed with Paystack support — settlement was delayed by 1 day due to public holiday." value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancel</Button>
                          <Button onClick={handleResolve} disabled={submitting || !resolveNotes.trim()}>
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />}
                            Mark resolved
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
