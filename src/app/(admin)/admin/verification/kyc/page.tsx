"use client";

/**
 * Admin KYC review page.
 *
 * Lets verification officers review Tier 2 KYC submissions stored in the
 * `kyc_verifications` table. Officers can:
 *   - Browse submissions grouped by status (Pending / Approved / Rejected / All)
 *   - View the uploaded document image, document number, and submission date
 *   - Approve a pending submission (status -> 'approved', sets reviewed_by/at)
 *   - Reject a pending submission with a required reason (status -> 'rejected')
 *
 * RLS on `kyc_verifications` allows verification_officer + super_admin to read
 * all rows and to UPDATE them. We use the authenticated browser Supabase
 * client (`createClient`) so the user's JWT is sent on every request.
 */

import * as React from "react";
import {
  ShieldCheck,
  XCircle,
  CheckCircle2,
  Clock,
  FileImage,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatDate, formatRelativeTime } from "@/lib/utils/format";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type KycStatus = "pending" | "approved" | "rejected";

interface KycSubmission {
  id: string;
  user_id: string;
  tier: number;
  status: KycStatus;
  document_type: string | null;
  document_url: string | null;
  document_number: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type StatusTab = "pending" | "approved" | "rejected" | "all";

/* ------------------------------------------------------------------ */
/* Display helpers                                                    */
/* ------------------------------------------------------------------ */

const DOCUMENT_LABELS: Record<string, string> = {
  student_id: "Student ID",
  nin: "NIN slip",
  nin_slip: "NIN slip",
  drivers_license: "Driver's license",
  passport: "Passport",
  voters_card: "Voter's card",
};

function documentLabel(type: string | null): string {
  if (!type) return "Document";
  if (DOCUMENT_LABELS[type]) return DOCUMENT_LABELS[type];
  // Fallback: title-case with spaces instead of underscores.
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const STATUS_BADGE: Record<KycStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  approved: {
    label: "Approved",
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  rejected: {
    label: "Rejected",
    className:
      "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  },
};

/** Truncate a UUID for compact display, e.g. `a1b2c3d4…f0e1`. */
function shortUuid(id: string): string {
  if (!id) return "—";
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

const TABS: { value: StatusTab; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminKycReviewPage() {
  const { session } = useAuth();
  const supabaseRef = React.useRef<ReturnType<typeof createClient> | null>(null);

  const [submissions, setSubmissions] = React.useState<KycSubmission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<StatusTab>("pending");

  // Approval in-flight indicator (per submission id).
  const [approvingId, setApprovingId] = React.useState<string | null>(null);

  // Reject dialog state.
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectTarget, setRejectTarget] = React.useState<KycSubmission | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [rejecting, setRejecting] = React.useState(false);

  const isAuthed = session?.authenticated === true;

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }

  const fetchSubmissions = React.useCallback(async () => {
    if (!isAuthed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data, error: queryError } = await supabase
        .from("kyc_verifications")
        .select(
          "id, user_id, tier, status, document_type, document_url, document_number, reviewed_by, reviewed_at, rejection_reason, notes, created_at, updated_at",
        )
        .eq("tier", 2)
        .order("created_at", { ascending: false });

      if (queryError) throw new Error(queryError.message);

      setSubmissions((data ?? []) as KycSubmission[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load submissions";
      setError(msg);
      toast.error("Could not load KYC submissions", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [isAuthed]);

  React.useEffect(() => {
    void fetchSubmissions();
  }, [fetchSubmissions]);

  /* ---------------- Actions ---------------- */

  async function handleApprove(sub: KycSubmission) {
    if (!session?.userId) {
      toast.error("You must be signed in to review submissions");
      return;
    }
    setApprovingId(sub.id);
    try {
      const supabase = getSupabase();
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("kyc_verifications")
        .update({
          status: "approved",
          reviewed_by: session.userId,
          reviewed_at: now,
          // Clear any prior rejection reason so the row reflects the latest
          // decision.
          rejection_reason: null,
          updated_at: now,
        })
        .eq("id", sub.id);

      if (updateError) throw new Error(updateError.message);

      toast.success("Submission approved", {
        description: `${documentLabel(sub.document_type)} from ${shortUuid(
          sub.user_id,
        )} is now verified.`,
      });
      await fetchSubmissions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Approve failed";
      toast.error("Could not approve submission", { description: msg });
    } finally {
      setApprovingId(null);
    }
  }

  function openRejectDialog(sub: KycSubmission) {
    setRejectTarget(sub);
    setRejectReason("");
    setRejectOpen(true);
  }

  async function confirmReject() {
    const sub = rejectTarget;
    if (!sub) return;
    if (!session?.userId) {
      toast.error("You must be signed in to review submissions");
      return;
    }
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("A rejection reason is required");
      return;
    }

    setRejecting(true);
    try {
      const supabase = getSupabase();
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("kyc_verifications")
        .update({
          status: "rejected",
          reviewed_by: session.userId,
          reviewed_at: now,
          rejection_reason: reason,
          updated_at: now,
        })
        .eq("id", sub.id);

      if (updateError) throw new Error(updateError.message);

      toast.success("Submission rejected", {
        description: `${documentLabel(sub.document_type)} from ${shortUuid(
          sub.user_id,
        )} has been rejected.`,
      });
      setRejectOpen(false);
      setRejectTarget(null);
      setRejectReason("");
      await fetchSubmissions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Reject failed";
      toast.error("Could not reject submission", { description: msg });
    } finally {
      setRejecting(false);
    }
  }

  /* ---------------- Derived state ---------------- */

  const counts = React.useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: submissions.length };
    for (const s of submissions) {
      if (s.status === "pending") c.pending += 1;
      else if (s.status === "approved") c.approved += 1;
      else if (s.status === "rejected") c.rejected += 1;
    }
    return c;
  }, [submissions]);

  const visible = React.useMemo(() => {
    if (activeTab === "all") return submissions;
    return submissions.filter((s) => s.status === activeTab);
  }, [submissions, activeTab]);

  /* ---------------- Render ---------------- */

  if (!isAuthed) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader eyebrow="Identity verification" title="KYC submissions" />
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Sign in with a verification officer account to review KYC submissions.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Identity verification"
        title="KYC submissions"
        description="Review Tier 2 identity documents submitted by students. Approve or reject each submission — decisions are timestamped and attributed to your account."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchSubmissions()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
            )}
            Refresh
          </Button>
        }
      />

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => void fetchSubmissions()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusTab)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              {t.label}
              <Badge
                variant="secondary"
                className="ml-1 rounded-sm px-1.5 py-0 text-[10px] font-semibold tabular-nums"
              >
                {counts[t.value]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Single content panel — the active tab controls the filtered list. */}
        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
              <span className="ml-3 text-sm text-muted-foreground">Loading submissions…</span>
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              className="mt-2"
              icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
              title={
                activeTab === "pending"
                  ? "No pending submissions"
                  : activeTab === "approved"
                    ? "No approved submissions"
                    : activeTab === "rejected"
                      ? "No rejected submissions"
                      : "No KYC submissions yet"
              }
              description={
                activeTab === "pending"
                  ? "Students' Tier 2 identity documents will appear here for review as soon as they submit them."
                  : "Submissions matching this filter will appear here."
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((sub) => (
                <KycCard
                  key={sub.id}
                  submission={sub}
                  approving={approvingId === sub.id}
                  onApprove={() => void handleApprove(sub)}
                  onReject={() => openRejectDialog(sub)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject confirmation dialog */}
      <AlertDialog
        open={rejectOpen}
        onOpenChange={(open) => {
          // Block closing while a rejection is being written to the DB.
          if (rejecting) return;
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
          setRejectOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" aria-hidden />
              Reject this submission?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {rejectTarget
                ? `You are about to reject the ${documentLabel(
                    rejectTarget.document_type,
                  ).toLowerCase()} submitted by ${shortUuid(rejectTarget.user_id)}. The student will be able to resubmit after fixing the issue.`
                : "The student will be able to resubmit after fixing the issue."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5">
            <label
              htmlFor="kyc-reject-reason"
              className="text-xs font-medium text-foreground"
            >
              Rejection reason <span className="text-destructive">*</span>
            </label>
            <Input
              id="kyc-reject-reason"
              autoFocus
              placeholder="e.g. Photo is blurry — please retake with all four corners visible"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              disabled={rejecting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !rejecting && rejectReason.trim()) {
                  e.preventDefault();
                  void confirmReject();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              This reason is stored on the record and shown to the student.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmReject();
              }}
              disabled={rejecting || !rejectReason.trim()}
              className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
            >
              {rejecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Rejecting…
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" aria-hidden />
                  Reject submission
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Submission card                                                    */
/* ------------------------------------------------------------------ */

interface KycCardProps {
  submission: KycSubmission;
  approving: boolean;
  onApprove: () => void;
  onReject: () => void;
}

function KycCard({ submission, approving, onApprove, onReject }: KycCardProps) {
  const status = submission.status;
  const badge = STATUS_BADGE[status];

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Document image */}
      <div className="relative aspect-video w-full overflow-hidden border-b border-border bg-muted/40">
        {submission.document_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={submission.document_url}
            alt={`${documentLabel(submission.document_type)} uploaded by ${submission.user_id}`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Hide broken images and show a placeholder instead.
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <FileImage className="h-8 w-8" aria-hidden />
            <span className="text-xs">No image attached</span>
          </div>
        )}

        {/* Status pill overlaid on the image */}
        <div className="absolute right-2 top-2">
          <Badge className={badge.className}>
            {status === "approved" && <CheckCircle2 className="h-3 w-3" aria-hidden />}
            {status === "rejected" && <XCircle className="h-3 w-3" aria-hidden />}
            {status === "pending" && <Clock className="h-3 w-3" aria-hidden />}
            {badge.label}
          </Badge>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {/* Header: user id + document type */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="font-mono text-xs text-muted-foreground" title={submission.user_id}>
              {shortUuid(submission.user_id)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Submitted {formatRelativeTime(submission.created_at)}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            <FileImage className="h-3 w-3" aria-hidden />
            {documentLabel(submission.document_type)}
          </Badge>
        </div>

        {/* Document number */}
        {submission.document_number && (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Document number
            </p>
            <p className="font-mono text-sm">{submission.document_number}</p>
          </div>
        )}

        {/* Rejection reason (only for rejected rows) */}
        {status === "rejected" && submission.rejection_reason && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">
            <p className="flex items-center gap-1.5 font-medium">
              <XCircle className="h-3.5 w-3.5" aria-hidden /> Rejection reason
            </p>
            <p className="mt-1 text-pretty">{submission.rejection_reason}</p>
          </div>
        )}

        {/* Reviewer info (only for already-reviewed rows) */}
        {status !== "pending" && submission.reviewed_at && (
          <p className="text-[11px] text-muted-foreground">
            Reviewed {formatRelativeTime(submission.reviewed_at)} ·{" "}
            <span className="font-mono">{shortUuid(submission.reviewed_by ?? "")}</span>
          </p>
        )}

        {/* Submission date footer (absolute) */}
        <p className="text-[11px] text-muted-foreground">
          Submitted on {formatDate(submission.created_at)}
        </p>

        {/* Actions — only for pending submissions */}
        {status === "pending" && (
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={onApprove}
              disabled={approving}
              className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-300"
            >
              {approving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                  Approving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Approve
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={approving}
              className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/60"
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
