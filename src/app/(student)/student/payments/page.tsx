"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCard, Download, Receipt, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { bookings as allBookings } from "@/lib/data/fixtures";
import type { Payment } from "@/lib/types";
import { formatNgn, formatDateTime } from "@/lib/utils/format";
import { toast } from "sonner";

export default function StudentPaymentsPage() {
  const { session } = useAuth();
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!session) return;
    getRepositories()
      .payments.listByStudent(session.userId || "dev_student_1")
      .then((p) => {
        setPayments(p);
        setLoading(false);
      });
  }, [session]);

  const totalPaid = payments.filter((p) => p.status === "successful").reduce((s, p) => s + p.amountKobo, 0);

  function downloadReceipt(p: Payment) {
    toast.info("Receipt download", {
      description: `In production, this would download a PDF receipt for ${p.reference}.`,
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Payments"
        title="Payment history"
        description="Every payment you've made through NetLodge, with backend-verified statuses."
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs text-muted-foreground">Total paid (lifetime)</p>
            <p className="font-display text-2xl font-bold">{formatNgn(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="font-display text-2xl font-bold">{payments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs text-muted-foreground">Successful</p>
            <p className="font-display text-2xl font-bold">
              {payments.filter((p) => p.status === "successful").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-5 w-5" aria-hidden />}
          title="No payments yet"
          description="When you make your first booking, your payment history will appear here."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {payments.map((p) => {
                const booking = allBookings.find((b) => b.id === p.bookingId);
                return (
                  <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{p.reference}</p>
                        <PaymentStatusBadge status={p.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.channel.toUpperCase()} · {formatDateTime(p.initiatedAt)}
                        {p.gatewayReference && ` · Gateway: ${p.gatewayReference}`}
                      </p>
                      {booking && (
                        <Link
                          href={`/student/bookings/${booking.id}`}
                          className="inline-block text-xs text-primary hover:underline"
                        >
                          Booking {booking.reference}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Price kobo={p.amountKobo} />
                        <p className="text-xs text-muted-foreground">
                          Fee: {formatNgn(p.feeKobo)}
                        </p>
                      </div>
                      {p.status === "successful" && p.confirmedByBackend && (
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
