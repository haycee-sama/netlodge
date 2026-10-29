"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VerificationBadge, PriorityBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/admin-page-components";

interface QueueCase {
  id: string;
  reference: string;
  entity_type: string;
  entity_label: string;
  submission_type: string;
  status: string;
  priority: string;
  assigned_officer_id: string | null;
  sla_due_at: string | null;
  submitted_at: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "In review" },
  { value: "needs_information", label: "Needs info" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "student_kyc", label: "Student KYC" },
  { value: "landlord_identity", label: "Landlord identity" },
  { value: "landlord_business", label: "Landlord business" },
  { value: "property_listing", label: "Property listing" },
  { value: "room_evidence", label: "Room evidence" },
  { value: "inspection_report", label: "Inspection report" },
];

const ENTITY_OPTIONS = [
  { value: "all", label: "All entities" },
  { value: "student", label: "Student" },
  { value: "landlord", label: "Landlord" },
  { value: "property", label: "Property" },
  { value: "room", label: "Room" },
];

const PRIORITY_LABEL: Record<string, string> = {
  low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };

export default function VerificationQueuePage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<QueueCase[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [submissionType, setSubmissionType] = React.useState("all");
  const [entityType, setEntityType] = React.useState("all");
  const [overdueOnly, setOverdueOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const isSupabaseAuth = session?.authenticated === true;

  const fetchQueue = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize) });
      if (status !== "all") params.set("status", status);
      if (submissionType !== "all") params.set("submissionType", submissionType);
      if (entityType !== "all") params.set("entityType", entityType);
      if (q) params.set("q", q);
      if (overdueOnly) params.set("overdue", "1");

      const res = await fetch(`/api/admin/verification/queue?${params}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load queue");
        if (res.status === 403) toast.error("Access denied", { description: "You need Verification Officer or Super Admin role." });
      } else {
        setRows(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [isSupabaseAuth, page, pageSize, status, submissionType, entityType, q, overdueOnly]);

  React.useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Verification operations"
        title="Review queue"
        description="All verification submissions across student KYC, landlord identity, property listings, and room evidence."
        breadcrumbs={[{ label: "Verification Officer", href: "/admin/verification" }, { label: "Review queue" }]}
      />

      {!isSupabaseAuth ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Sign in with a real admin account to view the verification queue.
          </CardContent>
        </Card>
      ) : (
        <>

          {/* Filters */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-4">
              <Input
                placeholder="Search reference or label…"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                className="h-9 w-56"
              />
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={submissionType} onValueChange={(v) => { setSubmissionType(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                variant={overdueOnly ? "default" : "outline"}
                size="sm"
                className="h-9"
                onClick={() => { setOverdueOnly((v) => !v); setPage(1); }}
              >
                {overdueOnly ? "Showing overdue" : "Show overdue only"}
              </Button>
              <Button variant="ghost" size="sm" className="h-9 ml-auto" onClick={fetchQueue} disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
              </Button>
            </CardContent>
          </Card>

          {/* Error banner */}
          {error && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={fetchQueue}>Retry</Button>
              </CardContent>
            </Card>
          )}

          {/* Queue table */}
          {!error && (
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : rows.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">No verification cases match your filters.</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {rows.map((c) => {
                      const isOverdue = c.sla_due_at && new Date(c.sla_due_at) < new Date() && ["pending", "under_review", "needs_information"].includes(c.status);
                      return (
                        <li key={c.id}>
                          <Link href={`/admin/verification/${c.id}`} className="flex flex-col gap-1 p-4 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{c.entity_label}</p>
                                <PriorityBadge priority={c.priority as any} />
                                {isOverdue && <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">Overdue</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {c.reference} · {c.submission_type.replace(/_/g, " ")} · submitted {c.submitted_at ? formatRelativeTime(c.submitted_at) : formatRelativeTime(c.created_at)}
                              </p>
                            </div>
                            <VerificationBadge status={c.status as any} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="flex h-9 items-center px-3 text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
