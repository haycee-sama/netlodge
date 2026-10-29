"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCard, Download, Receipt, Loader2, CheckCircle2, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchStudentPayments, type PaymentWithBooking } from "@/lib/supabase/payment-service";
import { formatNgn, formatDateTime } from "@/lib/utils/format";
import { downloadPaymentReceipt } from "@/lib/utils/receipt";

export default function StudentPaymentsPage() {
  const { session } = useAuth();
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
  const totalPaid = successful.reduce((s, p) => s + p.amount_kobo, 0);

  function downloadReceipt(p: PaymentWithBooking) {
    downloadPaymentReceipt(p);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Payments"
        title="Payment history"
        description="Every payment you've made through NetLodge — amounts, fees, and backend-verified statuses."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" aria-hidden />
              <p className="text-xs text-muted-foreground">Total paid (lifetime)</p>
            </div>
            <p className="font-display text-2xl font-bold">{formatNgn(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" aria-hidden />
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
            <p className="font-display text-2xl font-bold">{payments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
              <p className="text-xs text-muted-foreground">Backend-confirmed</p>
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
          title="No payments yet"
          description="Sign in with a real account to view your payment history."
          action={<Button asChild><Link href="/login">Sign in</Link></Button>}
        />
      ) : error ? (
        <EmptyState
          icon={<CreditCard className="h-5 w-5" aria-hidden />}
          title="Could not load payments"
          description={error}
          action={<Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>}
        />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-5 w-5" aria-hidden />}
          title="No payments yet"
          description="When you make your first booking, your payment history will appear here."
          action={<Button asChild><Link href="/properties">Browse properties</Link></Button>}
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
                          <Badge variant="outline" className="text-xs text-success">Backend-verified</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.channel.toUpperCase()} · {formatDateTime(p.initiated_at)}
                        {p.gateway_reference && ` · Gateway: ${p.gateway_reference}`}
                      </p>
                      {p.failure_reason && (
                        <p className="text-xs text-destructive">Reason: {p.failure_reason}</p>
                      )}
                      {booking && (
                        <Link
                          href={`/student/bookings/${booking.id}`}
                          className="inline-block text-xs text-primary hover:underline"
                        >
                          Booking {booking.reference}
                          {booking.properties ? ` · ${booking.properties.name}` : ""}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Price kobo={p.amount_kobo} />
                        <p className="text-xs text-muted-foreground">
                          Fee: {formatNgn(p.fee_kobo)}
                        </p>
                      </div>
                      {p.status === "successful" && p.confirmed_by_backend && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReceipt(p)}
                        >
                          <Download className="mr-2 h-3.5 w-3.5" aria-hidden />
                          Receipt
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
