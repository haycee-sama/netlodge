"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { DisputeStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import type { Dispute, DisputeStatus } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

const STATUS_OPTIONS: { value: "all" | DisputeStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "under_investigation", label: "Under investigation" },
  { value: "evidence_requested", label: "Evidence requested" },
  { value: "resolved_in_favor_of_student", label: "For student" },
  { value: "resolved_in_favor_of_landlord", label: "For landlord" },
  { value: "closed", label: "Closed" },
];

export default function FinanceDisputesPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<Dispute[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<"all" | DisputeStatus>("all");
  const [resolveTarget, setResolveTarget] = React.useState<Dispute | null>(null);
  const [resolveStatus, setResolveStatus] = React.useState<DisputeStatus>("resolved_in_favor_of_student");
  const [resolveNotes, setResolveNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const resolverId = session?.userId ?? "dev_super_admin_1";

  React.useEffect(() => {
    setLoading(true);
    getRepositories().disputes.listAll({ status: status === "all" ? undefined : status, pageSize: 100 }).then((r) => {
      setRows(r.items); setLoading(false);
    });
  }, [status]);

  async function handleResolve() {
    if (!resolveTarget) return;
    if (!resolveNotes.trim()) { toast.error("Resolution notes are required"); return; }
    setSubmitting(true);
    try {
      await getRepositories().disputes.resolve(resolveTarget.id, { resolverId, status: resolveStatus, notes: resolveNotes });
      toast.success("Dispute resolved");
      setResolveNotes(""); setResolveTarget(null);
      getRepositories().disputes.listAll({ status: status === "all" ? undefined : status, pageSize: 100 }).then((r) => setRows(r.items));
    } finally { setSubmitting(false); }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Disputes"
        description="Booking disputes between students and landlords. Investigate evidence and resolve fairly."
        breadcrumbs={[{ label: "Finance", href: "/admin/finance" }, { label: "Disputes" }]}
      />
      <DemoModeBanner />

      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); }}>
          <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No disputes found.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {rows.map((d) => {
                const student = allUsers.find((u) => u.id === d.studentId);
                const landlord = allUsers.find((u) => u.id === d.landlordId);
                const isOpen = d.status === "open" || d.status === "under_investigation" || d.status === "evidence_requested";
                return (
                  <li key={d.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs font-medium">{d.reference}</p>
                          <DisputeStatusBadge status={d.status} />
                        </div>
                        <p className="text-sm font-medium">{d.subject}</p>
                        <p className="text-xs text-muted-foreground">{d.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Student: {student?.email ?? d.studentId} · Landlord: {landlord?.email ?? d.landlordId} · opened {formatRelativeTime(d.openedAt)}
                        </p>
                        {d.evidence.length > 0 && (
                          <p className="text-xs text-muted-foreground">{d.evidence.length} evidence file(s) attached</p>
                        )}
                        {d.resolutionNotes && <p className="text-xs italic text-muted-foreground">Resolution: "{d.resolutionNotes}"</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Price kobo={d.amountKobo} />
                        {isOpen && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => { setResolveTarget(d); setResolveNotes(""); }}>
                                <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden /> Resolve
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Resolve dispute {d.reference}?</DialogTitle>
                                <DialogDescription>Document the resolution. This action is audit-logged.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-3">
                                <div className="space-y-1.5">
                                  <Label>Resolution</Label>
                                  <Select value={resolveStatus} onValueChange={(v) => setResolveStatus(v as DisputeStatus)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="resolved_in_favor_of_student">In favor of student</SelectItem>
                                      <SelectItem value="resolved_in_favor_of_landlord">In favor of landlord</SelectItem>
                                      <SelectItem value="closed">Closed (no action)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor="dnotes">Resolution notes (required)</Label>
                                  <Textarea id="dnotes" rows={4} value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancel</Button>
                                <Button onClick={handleResolve} disabled={submitting || !resolveNotes.trim()}>
                                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />}
                                  Confirm resolution
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
