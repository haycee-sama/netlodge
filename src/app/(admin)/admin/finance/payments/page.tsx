"use client";

import * as React from "react";
import { Receipt, Loader2, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn, formatDateTime } from "@/lib/utils/format";

export default function AdminFinancePaymentsPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
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
      const res = await fetch(`/api/admin/finance/payments?${params}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load");
      else { setRows(data.items ?? []); setTotal(data.total ?? 0); }
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); }
    finally { setLoading(false); }
  }, [isSupabaseAuth, page, pageSize, q, status]);

  React.useEffect(() => { fetchPage(); }, [fetchPage]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-7xl"><AdminPageHeader title="Payments" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const successful = rows.filter((r) => r.status === "successful");
  const grossTotal = successful.reduce((s, p) => s + p.amount_kobo, 0);
  const feeTotal = successful.reduce((s, p) => s + p.fee_kobo, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Finance operations" title="Payments" description="All payment transactions. Amounts are backend-verified." breadcrumbs={[{ label: "Finance Admin", href: "/admin/finance" }, { label: "Payments" }]} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="space-y-1 p-4"><p className="text-xs text-muted-foreground">Gross (this page)</p><p className="text-xl font-bold">{formatNgn(grossTotal)}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 p-4"><p className="text-xs text-muted-foreground">Fees (this page)</p><p className="text-xl font-bold text-destructive">−{formatNgn(feeTotal)}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 p-4"><p className="text-xs text-muted-foreground">Net (this page)</p><p className="text-xl font-bold text-success">{formatNgn(grossTotal - feeTotal)}</p></CardContent></Card>
      </div>
      <Card><CardContent className="flex flex-wrap items-center gap-2 p-4">
        <Input placeholder="Search reference…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="h-9 w-48" />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}><SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">All statuses</SelectItem><SelectItem value="initiated">Initiated</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="successful">Successful</SelectItem><SelectItem value="failed">Failed</SelectItem>
        </SelectContent></Select>
        <Button variant="ghost" size="sm" className="h-9 ml-auto" onClick={fetchPage} disabled={loading}>{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}</Button>
      </CardContent></Card>
      {error ? <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No payments found.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{p.reference}</p><PaymentStatusBadge status={p.status} />{p.confirmed_by_backend && <Badge variant="outline" className="text-xs text-success">Backend-verified</Badge>}</div>
                  <p className="text-xs text-muted-foreground">{p.channel.toUpperCase()} · {formatDateTime(p.initiated_at)}{p.gateway_reference && ` · ${p.gateway_reference}`}</p>
                  {p.failure_reason && <p className="text-xs text-destructive">{p.failure_reason}</p>}
                </div>
                <div className="text-right"><p className="font-medium">{formatNgn(p.amount_kobo)}</p><p className="text-xs text-muted-foreground">fee {formatNgn(p.fee_kobo)}</p></div>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
      {total > pageSize && (
        <div className="flex items-center justify-between text-sm"><p className="text-muted-foreground">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</p>
          <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><span className="flex h-9 items-center px-3 text-xs">Page {page} of {totalPages}</span><Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button></div>
        </div>
      )}
    </div>
  );
}
