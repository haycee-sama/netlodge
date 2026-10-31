"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCard, Download, Receipt, Loader2, CheckCircle2, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { fetchStudentPayments, type PaymentWithBooking } from "@/lib/supabase/payment-service";
import { formatNgn, formatDateTime } from "@/lib/utils/format";
import { downloadPaymentReceiptPdf } from "@/lib/utils/receipt-pdf";

export default function StudentPaymentsPage() {
  const { session } = useAuth();
  const { t } = useI18n();
  const [payments, setPayments] = React.useState<PaymentWithBooking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) {
      setLoading(false);
      return;
    }
    fetchStudentPayments().then((res) => {
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setPayments(res.data);
      }
      setLoading(false);
    });
  }, [isSupabaseAuth]);

  const successful = payments.filter((p) => p.status === "successful");
  const pending = payments.filter((p) => ["initiated", "pending"].includes(p.status));
  const totalPaid = successful.reduce((s, p) => s + p.amount_kobo, 0);
  const totalPending = pending.reduce((s, p) => s + p.amount_kobo, 0);
  // Total paid this year
  const thisYear = new Date().getFullYear();
  const paidThisYear = successful
    .filter((p) => new Date(p.initiated_at).getFullYear() === thisYear)
    .reduce((s, p) => s + p.amount_kobo, 0);

  function downloadReceipt(p: PaymentWithBooking) {
    downloadPaymentReceiptPdf(p, {
      recipientLabel: "student",
      recipientName: session ? `${session.firstName} ${session.lastName}`.trim() : undefined,
      recipientEmail: session?.email,
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={t("nav.student.payments")}
        title={t("student.payments.title")}
        description={t("student.payments.description")}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" aria-hidden />
              <p className="text-xs text-muted-foreground">{t("student.payments.paidThisYear")}</p>
            </div>
            <p className="font-display text-2xl font-bold text-success">{formatNgn(paidThisYear)}</p>
            <p className="text-xs text-muted-foreground">{successful.length === 1 ? t("student.payments.successfulPayments.singular", { n: successful.length }) : t("student.payments.successfulPayments.plural", { n: successful.length })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" aria-hidden />
              <p className="text-xs text-muted-foreground">{t("student.payments.pendingPayments")}</p>
            </div>
            <p className="font-display text-2xl font-bold text-warning">{pending.length}</p>
            {totalPending > 0 && <p className="text-xs text-muted-foreground">{t("student.payments.awaiting", { amount: formatNgn(totalPending) })}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
              <p className="text-xs text-muted-foreground">{t("student.payments.backendVerified")}</p>
            </div>
            <p className="font-display text-2xl font-bold">
              {successful.filter((p) => p.confirmed_by_backend).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : !isSupabaseAuth ? (
        <EmptyState
          icon={<CreditCard className="h-5 w-5" aria-hidden />}
          title={t("student.payments.noPayments.title")}
          description={t("student.payments.signInPrompt")}
          action={<Button asChild><Link href="/login">{t("common.signIn")}</Link></Button>}
        />
      ) : error ? (
        <EmptyState
          icon={<CreditCard className="h-5 w-5" aria-hidden />}
          title={t("student.payments.couldNotLoad")}
          description={error}
          action={<Button variant="outline" onClick={() => window.location.reload()}>{t("common.retry")}</Button>}
        />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-5 w-5" aria-hidden />}
          title={t("student.payments.noPayments.title")}
          description={t("student.payments.noPayments.desc")}
          action={<Button asChild><Link href="/properties">{t("student.dashboard.browseProperties")}</Link></Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {payments.map((p) => {
                const booking = p.bookings;
                return (
                  <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{p.reference}</p>
                        <PaymentStatusBadge status={p.status} />
                        {p.confirmed_by_backend && (
                          <Badge variant="outline" className="text-xs text-success">{t("student.payments.backendVerified")}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.channel.toUpperCase()} · {formatDateTime(p.initiated_at)}
                        {p.gateway_reference && ` · ${t("student.payments.gateway", { ref: p.gateway_reference })}`}
                      </p>
                      {p.failure_reason && (
                        <p className="text-xs text-destructive">{t("student.payments.reason", { reason: p.failure_reason })}</p>
                      )}
                      {booking && (
                        <Link
                          href={`/student/bookings/${booking.id}`}
                          className="inline-block text-xs text-primary hover:underline"
                        >
                          {t("student.payments.bookingRef", { ref: booking.reference })}
                          {booking.properties ? ` · ${booking.properties.name}` : ""}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Price kobo={p.amount_kobo} />
                        <p className="text-xs text-muted-foreground">
                          {t("student.payments.fee", { amount: formatNgn(p.fee_kobo) })}
                        </p>
                      </div>
                      {p.status === "successful" && p.confirmed_by_backend && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReceipt(p)}
                        >
                          <Download className="mr-2 h-3.5 w-3.5" aria-hidden />
                          {t("student.payments.downloadReceipt")}
                        </Button>
                      )}
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
