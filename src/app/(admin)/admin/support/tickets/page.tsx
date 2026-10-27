"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { SupportTicketStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatRelativeTime } from "@/lib/utils/format";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Ticket {
  id: string;
  reference: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  escalated: boolean;
  escalated_to: string | null;
  created_at: string;
  updated_at: string;
}

export default function SupportTicketsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [rows, setRows] = React.useState<Ticket[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [priority, setPriority] = React.useState("all");
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
      if (priority !== "all") params.set("priority", priority);
      const res = await fetch(`/api/admin/support/tickets?${params}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load");
        if (res.status === 403) toast.error("Access denied", { description: "Support Staff or Super Admin role required." });
      } else { setRows(data.items ?? []); setTotal(data.total ?? 0); }
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); }
    finally { setLoading(false); }
  }, [isSupabaseAuth, page, pageSize, q, status, priority]);

  React.useEffect(() => { fetchPage(); }, [fetchPage]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="Support operations" title="Ticket queue" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Support Staff account.
        </CardContent></Card>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Support operations"
        title="Ticket queue"
        description="Live support tickets from the database. Use filters to find open, urgent, or escalated cases."
        breadcrumbs={[{ label: "Support Agent", href: "/admin/support" }, { label: "Tickets" }]}
      />
      <DemoModeBanner message="Live data — every action (assign, escalate, resolve) is server-authorized and audit-logged." />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Input placeholder="Search subject or reference…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="h-9 w-56" />
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="awaiting_user">Awaiting user</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={(v) => { setPriority(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
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
              <div className="py-12 text-center text-sm text-muted-foreground">No tickets found.</div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/support/tickets/${t.id}`)}
                      className="flex w-full flex-col gap-1 p-4 text-left hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{t.subject}</p>
                          <PriorityBadge priority={t.priority as any} />
                          {t.escalated && <Badge variant="outline" className="text-destructive">Escalated → {t.escalated_to?.replace(/_/g, " ")}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t.reference} · {t.category} · {formatRelativeTime(t.created_at)}
                        </p>
                      </div>
                      <SupportTicketStatusBadge status={t.status as any} />
                    </button>
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
