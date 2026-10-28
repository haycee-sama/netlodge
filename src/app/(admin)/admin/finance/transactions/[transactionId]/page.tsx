"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, DemoModeBanner, DetailLayout } from "@/components/admin/admin-page-components";
import { PaymentStatusBadge, RefundStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn, formatDateTime, formatRelativeTime } from "@/lib/utils/format";
import { Loader2, ArrowLeft, AlertTriangle, ExternalLink } from "lucide-react";

interface PaymentDetail {
  payment: {
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
    receipt_url: string | null;
  };
  booking: { id: string; reference: string; property_id: string; properties?: { id: string; name: string } | null } | null;
  refunds: Array<{
    id: string;
    reference: string;
    amount_kobo: number;
    status: string;
    reason: string;
    created_at: string;
    reviewed_at: string | null;
  }>;
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

const STATUS_DEFINITION: Record<string, string> = {
  initiated: "Payment record created. Awaiting customer to complete checkout on Paystack.",
  pending: "Customer has been redirected to Paystack. Waiting for webhook confirmation.",
  successful: "Paystack confirmed the payment AND our backend has independently verified it (confirmed_by_backend=true).",
  failed: "Payment was declined or failed at the gateway. No money moved.",
  refunded: "All or part of the payment has been refunded. Linked refunds appear below.",
  reversed: "Payment was reversed after settlement (e.g. chargeback).",
};

export default function FinanceTransactionDetailPage() {
  const params = useParams<{ transactionId: string }>();
  const transactionId = params?.transactionId;
  const { session } = useAuth();
  const [data, setData] = React.useState<PaymentDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth || !transactionId) { setLoading(false); return; }
    setLoading(true); setError(null);
    fetch(`/api/admin/finance/payments/${transactionId}`, { credentials: "include" })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) { setError(body.error || `Failed (${r.status})`); setData(null); }
        else { setData(body); setError(null); }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Network error"))
      .finally(() => setLoading(false));
  }, [isSupabaseAuth, transactionId]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <AdminPageHeader eyebrow="Finance operations" title="Transaction detail" />
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
        <AdminPageHeader eyebrow="Finance operations" title="Transaction detail" />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
            <p className="text-sm font-medium">{error ?? "Transaction not found"}</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/finance/transactions"><ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back to transactions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { payment, booking, refunds, ledger, audit } = data;
  const totalRefunded = refunds
    .filter((r) => ["completed", "processing", "approved", "under_review", "requested"].includes(r.status))
    .reduce((s, r) => s + r.amount_kobo, 0);
  const refundableBalance = payment.amount_kobo - totalRefunded;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title={`Transaction ${payment.reference}`}
        description="Read-only payment detail. Status definitions are documented below — never mark a payment successful based on client data."
        breadcrumbs={[
          { label: "Finance Admin", href: "/admin/finance" },
          { label: "Transactions", href: "/admin/finance/transactions" },
          { label: payment.reference },
        ]}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/finance/transactions"><ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back</Link>
          </Button>
        }
      />
      <DemoModeBanner message="Live data — payment record, linked refunds, ledger entries, and audit trail. Sensitive payment instrument data is never stored or exposed." />

      <DetailLayout
        sidebar={<TransactionSidebar payment={payment} refundableBalance={refundableBalance} />}
      >
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold">{payment.reference}</h2>
              <PaymentStatusBadge status={payment.status as any} />
              {payment.confirmed_by_backend && (
                <Badge variant="outline" className="text-xs text-success">Backend-verified</Badge>
              )}
              <Badge variant="outline" className="text-xs uppercase">{payment.channel}</Badge>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount" value={formatNgn(payment.amount_kobo)} emphasize />
              <Field label="Fee (Paystack)" value={formatNgn(payment.fee_kobo)} />
              <Field label="Net" value={formatNgn(payment.net_kobo)} />
              <Field label="Currency" value={payment.currency} />
              <Field label="Initiated at" value={formatDateTime(payment.initiated_at)} />
              {payment.confirmed_at && <Field label="Confirmed at" value={formatDateTime(payment.confirmed_at)} />}
              {payment.gateway_reference && <Field label="Gateway reference" value={payment.gateway_reference} mono />}
              {payment.receipt_url && (
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Receipt</dt>
                  <dd>
                    <a
                      href={payment.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Open receipt <ExternalLink className="h-3 w-3" />
                    </a>
                  </dd>
                </div>
              )}
              {payment.failure_reason && <Field label="Failure reason" value={payment.failure_reason} tone="danger" />}
            </dl>
            <div className="border-t border-border pt-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Status definition</p>
              <p className="mt-1 text-sm text-muted-foreground">{STATUS_DEFINITION[payment.status] ?? "Unknown status."}</p>
            </div>
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
            <p className="p-4 text-sm font-medium">Linked refunds ({refunds.length})</p>
            {refunds.length === 0 ? (
              <p className="px-4 pb-6 text-xs text-muted-foreground">No refunds have been requested against this payment.</p>
            ) : (
              <ul className="divide-y divide-border">
                {refunds.map((r) => (
                  <li key={r.id} className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs">{r.reference}</span>
                      <RefundStatusBadge status={r.status as any} />
                      <span className="ml-auto text-xs text-muted-foreground" title={formatDateTime(r.created_at)}>
                        {formatRelativeTime(r.created_at)}
                      </span>
                    </div>
                    <p className="text-sm">{formatNgn(r.amount_kobo)} · {r.reason.replace(/_/g, " ")}</p>
                    {r.reviewed_at && (
                      <p className="text-xs text-muted-foreground">Reviewed {formatDateTime(r.reviewed_at)}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <p className="p-4 text-sm font-medium">Ledger entries</p>
            {ledger.length === 0 ? (
              <p className="px-4 pb-6 text-xs text-muted-foreground">No ledger entries reference this payment.</p>
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
              <p className="px-4 pb-6 text-xs text-muted-foreground">No audit entries reference this payment.</p>
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

function TransactionSidebar({
  payment, refundableBalance,
}: {
  payment: PaymentDetail["payment"];
  refundableBalance: number;
}) {
  return (
    <>
      <Card>
        <CardContent className="space-y-2 p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">At a glance</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><PaymentStatusBadge status={payment.status as any} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium">{formatNgn(payment.amount_kobo)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Refundable</span><span className="font-medium">{formatNgn(refundableBalance)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-mono text-xs">{payment.student_id.slice(0, 8)}…</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment ID</span><span className="font-mono text-xs">{payment.id.slice(0, 8)}…</span></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Status semantics</p>
          <p>A payment is only marked "successful" after our backend independently verifies it with Paystack (confirmed_by_backend=true). Client-side payment reports are never trusted.</p>
          <p>Paystack secret keys are never exposed. Receipt URLs are returned only when Paystack provides them.</p>
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
