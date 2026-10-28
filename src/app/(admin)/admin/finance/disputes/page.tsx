"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { DisputeStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn, formatDateTime } from "@/lib/utils/format";
import { Loader2 } from "lucide-react";

interface Dispute {
  id: string;
  reference: string;
  booking_id: string;
  student_id: string;
  landlord_id: string;
  subject: string;
  description: string;
  status: string;
  amount_kobo: number;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function FinanceDisputesPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<Dispute[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 20;
  const isSupabaseAuth = session?.authenticated === true;

  const fetchPage = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/finance/disputes?${params}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load");
      else { setRows(data.items ?? []); setTotal(data.total ?? 0); }
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); }
    finally { setLoading(false); }
  }, [isSupabaseAuth, page, pageSize, q, status]);

  React.useEffect(() => { fetchPage(); }, [fetchPage]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="Finance operations" title="Disputes" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Finance Admin account.
        </CardContent></Card>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Disputes"
        description="Read-only list of disputes raised against bookings. The dispute workflow is currently read-only — there is no resolution RPC or UI mutation yet. Refunds and support tickets are tracked separately."
        breadcrumbs={[{ label: "Finance Admin", href: "/admin/finance" }, { label: "Disputes" }]}
      />
      <DemoModeBanner message="Live data — disputes table is real. The create/update workflow is not yet defined; this view exposes only persisted records." />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Input placeholder="Search reference or subject…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="h-9 w-64" />
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="under_investigation">Under investigation</SelectItem>
              <SelectItem value="evidence_requested">Evidence requested</SelectItem>
              <SelectItem value="resolved_in_favor_of_student">Resolved for student</SelectItem>
              <SelectItem value="resolved_in_favor_of_landlord">Resolved for landlord</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
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
              <div className="py-12 text-center text-sm text-muted-foreground">No disputes found.</div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((d) => (
                  <li key={d.id} className="space-y-2 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{d.reference}</p>
                          <DisputeStatusBadge status={d.status as any} />
                        </div>
                        <p className="text-sm">{d.subject}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Opened {formatDateTime(d.created_at)}
                          {d.resolved_at && ` · Resolved ${formatDateTime(d.resolved_at)}`}
                        </p>
                        {d.resolution_notes && (
                          <p className="text-xs italic text-muted-foreground">Resolution: {d.resolution_notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Booking{" "}
                          <Link href={`/admin/bookings?ref=${d.booking_id}`} className="font-mono text-primary hover:underline">
                            {d.booking_id.slice(0, 8)}…
                          </Link>
                          {" · "}Student{" "}
                          <span className="font-mono">{d.student_id.slice(0, 8)}…</span>
                          {" · "}Landlord{" "}
                          <span className="font-mono">{d.landlord_id.slice(0, 8)}…</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNgn(d.amount_kobo)}</p>
                        <p className="text-xs text-muted-foreground">in dispute</p>
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
            <span className="flex h-9 items-center px-3 text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
