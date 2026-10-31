"use client";

import * as React from "react";
import { Receipt, Download, Loader2, FileDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { fetchLandlordPayments, type LandlordPaymentWithRelations } from "@/lib/supabase/payment-service";
import { formatNgn, formatDateTime } from "@/lib/utils/format";
import { exportPaymentsCsv } from "@/lib/utils/csv-export";
import { downloadPaymentReceiptPdf } from "@/lib/utils/receipt-pdf";

export default function LandlordTransactionsPage() {
  const { session } = useAuth();
  const { t } = useI18n();
  const [payments, setPayments] = React.useState<LandlordPaymentWithRelations[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) {
      setLoading(false);
      return;
    }
    fetchLandlordPayments().then((res) => {
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setPayments(res.data);
      }
      setLoading(false);
    });
  }, [isSupabaseAuth]);

  // RLS already restricts to payments on this landlord's bookings; we filter again client-side as defense-in-depth.
  const myPayments = payments.filter((p) => p.bookings?.properties?.landlord_id === session?.userId);

  const successful = myPayments.filter((p) => p.status === "successful");
  const total = successful.reduce((s, p) => s + p.amount_kobo, 0);
  const fees = successful.reduce((s, p) => s + p.fee_kobo, 0);
  const net = total - fees;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow={t("landlord.transactions.eyebrow")}
        title={t("landlord.transactions.title")}
        description={t("landlord.transactions.description")}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportPaymentsCsv(myPayments)}
            disabled={myPayments.length === 0}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden /> {t("landlord.transactions.exportCsv")}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs text-muted-foreground">{t("landlord.transactions.grossReceived")}</p>
            <p className="font-display text-2xl font-bold">{formatNgn(total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs text-muted-foreground">{t("landlord.transactions.paymentFees")}</p>
            <p className="font-display text-2xl font-bold text-destructive">−{formatNgn(fees)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs text-muted-foreground">{t("landlord.transactions.netBeforeFee")}</p>
            <p className="font-display text-2xl font-bold text-success">{formatNgn(net)}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : !isSupabaseAuth ? (
        <EmptyState
          icon={<Receipt className="h-5 w-5" aria-hidden />}
          title={t("landlord.transactions.noTransactions.title")}
          description={t("landlord.transactions.signInPrompt")}
        />
      ) : error ? (
        <EmptyState
          icon={<Receipt className="h-5 w-5" aria-hidden />}
          title={t("landlord.transactions.couldNotLoad")}
          description={error}
          action={<Button variant="outline" onClick={() => window.location.reload()}>{t("common.retry")}</Button>}
        />
      ) : myPayments.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-5 w-5" aria-hidden />}
          title={t("landlord.transactions.noTransactions.title")}
          description={t("landlord.transactions.noTransactions.desc")}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {myPayments.map((p) => {
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
                        {booking && ` · ${t("student.payments.bookingRef", { ref: booking.reference })}`}
                        {booking?.properties && ` · ${booking.properties.name}`}
                        {p.gateway_reference && ` · ${t("student.payments.gateway", { ref: p.gateway_reference })}`}
                      </p>
                      {p.failure_reason && (
                        <p className="text-xs text-destructive">{t("student.payments.reason", { reason: p.failure_reason })}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{formatNgn(p.amount_kobo)}</p>
                        <p className="text-xs text-muted-foreground">{t("landlord.payouts.fee", { amount: formatNgn(p.fee_kobo) })}</p>
                      </div>
                      {p.status === "successful" && p.confirmed_by_backend && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadPaymentReceiptPdf(p, {
                              recipientLabel: "landlord",
                              recipientName: session ? `${session.firstName} ${session.lastName}`.trim() : undefined,
                              recipientEmail: session?.email,
                            })
                          }
                          className="shrink-0"
                        >
                          <FileDown className="mr-2 h-3.5 w-3.5" aria-hidden />
                          <span className="hidden sm:inline">{t("landlord.transactions.receipt")}</span>
                          <span className="sm:hidden">{t("landlord.transactions.receiptPdf")}</span>
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
