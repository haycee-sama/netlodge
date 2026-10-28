"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, DemoModeBanner, DetailLayout } from "@/components/admin/admin-page-components";
import { PayoutStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn, formatDateTime, formatRelativeTime } from "@/lib/utils/format";
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react";

interface PayoutDetail {
  payout: {
    id: string;
    reference: string;
    landlord_id: string;
    booking_id: string;
    gross_kobo: number;
    platform_fee_kobo: number;
    net_kobo: number;
    status: string;
    settled_at: string | null;
    bank_account_masked: string;
    scheduled_for: string;
    approved_by: string | null;
    approved_at: string | null;
    rejection_reason: string | null;
    reversal_reason: string | null;
    provider_reference: string | null;
    eligibility_flags: string[];
    created_at: string;
  };
  booking: { id: string; reference: string; property_id: string; properties?: { id: string; name: string } | null } | null;
  ledger: Array<{
    id: string;
    entry_type: string;
    reference: string;
    debit_kobo: number;
    credit_kobo: number;
    description: string;
    created_at: string;
  }>;
  audit: Array<{
    id: string;
    timestamp: string;
    actor_email: string;
    action: string;
    summary: string;
    severity: string;
  }>;
}

export default function FinancePayoutDetailPage() {
  const params = useParams<{ payoutId: string }>();
  const payoutId = params?.payoutId;
  const { session } = useAuth();
  const [data, setData] = React.useState<PayoutDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth || !payoutId) { setLoading(false); return; }
    setLoading(true); setError(null);
    fetch(`/api/admin/finance/payouts/${payoutId}`, { credentials: "include" })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) { setError(body.error || `Failed (${r.status})`); setData(null); }
        else { setData(body); setError(null); }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Network error"))
      .finally(() => setLoading(false));
  }, [isSupabaseAuth, payoutId]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <AdminPageHeader eyebrow="Finance operations" title="Payout detail" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Finance Admin account.
        </CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <AdminPageHeader eyebrow="Finance operations" title="Payout detail" />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
            <p className="text-sm font-medium">{error ?? "Payout not found"}</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/finance/payouts"><ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back to payouts</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { payout, booking, ledger, audit } = data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title={`Payout ${payout.reference}`}
        description="Read-only payout detail. Approval and rejection happen on the payouts list — this view does not mutate state."
        breadcrumbs={[
          { label: "Finance Admin", href: "/admin/finance" },
          { label: "Payouts", href: "/admin/finance/payouts" },
          { label: payout.reference },
        ]}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/finance/payouts"><ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back</Link>
          </Button>
        }
      />
      <DemoModeBanner message="Live data — payout record, ledger entries, and audit trail from the database. Bank account numbers are stored masked and never decrypted." />

      <DetailLayout
        sidebar={<PayoutSidebar payout={payout} />}
      >
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold">{payout.reference}</h2>
              <PayoutStatusBadge status={payout.status as any} />
              {payout.eligibility_flags.length > 0 && payout.eligibility_flags.map((f) => (
                <Badge key={f} variant="outline" className="text-xs text-warning-foreground">{f}</Badge>
              ))}
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Gross amount" value={formatNgn(payout.gross_kobo)} />
              <Field label="Platform fee" value={formatNgn(payout.platform_fee_kobo)} />
              <Field label="Net to landlord" value={formatNgn(payout.net_kobo)} emphasize />
              <Field label="Bank account (masked)" value={payout.bank_account_masked} />
              <Field label="Scheduled for" value={formatDateTime(payout.scheduled_for)} />
              <Field label="Created at" value={formatDateTime(payout.created_at)} />
              {payout.settled_at && <Field label="Settled at" value={formatDateTime(payout.settled_at)} />}
              {payout.approved_at && <Field label="Approved at" value={formatDateTime(payout.approved_at)} />}
              {payout.provider_reference && <Field label="Provider reference" value={payout.provider_reference} mono />}
              {payout.rejection_reason && <Field label="Rejection reason" value={payout.rejection_reason} tone="danger" />}
              {payout.reversal_reason && <Field label="Reversal reason" value={payout.reversal_reason} tone="danger" />}
            </dl>
            {booking && (
              <div className="space-y-1 border-t border-border pt-4 text-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Booking</p>
                <p>
                  <Link href={`/admin/bookings?ref=${booking.reference}`} className="font-medium text-primary hover:underline">
                    {booking.reference}
                  </Link>
                  {booking.properties?.name && (
                    <span className="text-muted-foreground"> · {booking.properties.name}</span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <p className="p-4 text-sm font-medium">Ledger entries</p>
            {ledger.length === 0 ? (
              <p className="px-4 pb-6 text-xs text-muted-foreground">No ledger entries reference this payout.</p>
            ) : (
              <ul className="divide-y divide-border">
                {ledger.map((l) => (
                  <li key={l.id} className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{l.entry_type}</Badge>
                      <span className="font-mono text-xs">{l.reference}</span>
                      <span className="ml-auto text-xs text-muted-foreground" title={formatDateTime(l.created_at)}>
                        {formatRelativeTime(l.created_at)}
                      </span>
                    </div>
                    <p className="text-sm">{l.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Debit {formatNgn(l.debit_kobo)} · Credit {formatNgn(l.credit_kobo)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <p className="p-4 text-sm font-medium">Audit trail</p>
            {audit.length === 0 ? (
              <p className="px-4 pb-6 text-xs text-muted-foreground">No audit entries reference this payout.</p>
            ) : (
              <ul className="divide-y divide-border">
                {audit.map((a) => (
                  <li key={a.id} className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-medium ${a.severity === "critical" ? "text-destructive" : a.severity === "warning" ? "text-warning-foreground" : "text-muted-foreground"}`}>
                        {a.severity.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs">{a.action}</span>
                      <span className="ml-auto text-xs text-muted-foreground" title={formatDateTime(a.timestamp)}>
                        {formatRelativeTime(a.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm">{a.summary}</p>
                    <p className="text-xs text-muted-foreground">By {a.actor_email}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </DetailLayout>
    </div>
  );
}

function PayoutSidebar({ payout }: { payout: PayoutDetail["payout"] }) {
  return (
    <>
      <Card>
        <CardContent className="space-y-2 p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">At a glance</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><PayoutStatusBadge status={payout.status as any} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Net</span><span className="font-medium">{formatNgn(payout.net_kobo)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Landlord</span><span className="font-mono text-xs">{payout.landlord_id.slice(0, 8)}…</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payout ID</span><span className="font-mono text-xs">{payout.id.slice(0, 8)}…</span></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Privacy</p>
          <p>Bank account numbers are stored masked at creation time. This page never decrypts them.</p>
          <p>Landlord identifiers are shown truncated to limit PII exposure. Use the admin users tool for full lookup.</p>
          <p>Provider references are shown only when they exist on the record.</p>
        </CardContent>
      </Card>
    </>
  );
}

function Field({
  label, value, mono = false, emphasize = false, tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasize?: boolean;
  tone?: "danger";
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`text-sm ${emphasize ? "font-semibold" : ""} ${mono ? "font-mono" : ""} ${tone === "danger" ? "text-destructive" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
