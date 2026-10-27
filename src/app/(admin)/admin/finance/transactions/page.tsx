"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn, formatDateTime, formatRelativeTime } from "@/lib/utils/format";
import { Loader2 } from "lucide-react";

interface Payment {
  id: string;
  reference: string;
  gateway_reference: string | null;
  booking_id: string;
  student_id: string;
  amount_kobo: number;
  fee_kobo: number;
  net_kobo: number;
  currency: string;
  channel: string;
  status: string;
  confirmed_by_backend: boolean;
  initiated_at: string;
  confirmed_at: string | null;
  failure_reason: string | null;
  bookings?: { id: string; reference: string; property_id: string; properties?: { id: string; name: string } };
}

export default function FinanceTransactionsPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<Payment[]>([]);
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

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="Finance operations" title="Transactions" />
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
        title="Transactions"
        description="Every payment processed through Paystack. All statuses are backend-verified."
        breadcrumbs={[{ label: "Finance Admin", href: "/admin/finance" }, { label: "Transactions" }]}
      />
      <DemoModeBanner message="Live data — backend-verified payment records." />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Input placeholder="Search reference…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="h-9 w-56" />
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="initiated">Initiated</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="successful">Successful</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
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
              <div className="py-12 text-center text-sm text-muted-foreground">No transactions found.</div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((p) => (
                  <li key={p.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{p.reference}</p>
                        <PaymentStatusBadge status={p.status as any} />
                        {p.confirmed_by_backend && <Badge variant="outline" className="text-xs text-success">Backend-verified</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.channel.toUpperCase()} · {formatDateTime(p.initiated_at)}
                        {p.bookings?.properties && ` · ${p.bookings.properties.name}`}
                        {p.gateway_reference && ` · Gateway ${p.gateway_reference}`}
                      </p>
                      {p.failure_reason && <p className="text-xs text-destructive">Reason: {p.failure_reason}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatNgn(p.amount_kobo)}</p>
                      <p className="text-xs text-muted-foreground">fee {formatNgn(p.fee_kobo)}</p>
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
