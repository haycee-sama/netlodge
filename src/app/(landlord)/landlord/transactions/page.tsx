"use client";

import * as React from "react";
import { Receipt, Download, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { bookings as allBookings } from "@/lib/data/fixtures";
import type { Payment } from "@/lib/types";
import { formatNgn, formatDateTime } from "@/lib/utils/format";
import { toast } from "sonner";

export default function LandlordTransactionsPage() {
  const { session } = useAuth();
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!session) return;
    // For demo: aggregate all payments linked to landlord bookings
    const landlordBookings = allBookings.filter((b) => b.propertyId); // all of them in fixtures
    Promise.all(landlordBookings.map((b) => getRepositories().payments.listByBooking(b.id))).then((rs) => {
      setPayments(rs.flat());
      setLoading(false);
    });
  }, [session]);

  const total = payments.filter((p) => p.status === "successful").reduce((s, p) => s + p.amountKobo, 0);
  const fees = payments.filter((p) => p.status === "successful").reduce((s, p) => s + p.feeKobo, 0);
  const net = total - fees;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Finances"
        title="Transactions"
        description="Every payment received across all your properties. All statuses are backend-verified."
        actions={
          <Button variant="outline" size="sm" onClick={() => toast.info("Export", { description: "CSV download in production." })}>
            <Download className="mr-2 h-4 w-4" aria-hidden /> Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="space-y-1 p-5"><p className="text-xs text-muted-foreground">Gross received</p><p className="font-display text-2xl font-bold">{formatNgn(total)}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 p-5"><p className="text-xs text-muted-foreground">Payment fees</p><p className="font-display text-2xl font-bold text-destructive">−{formatNgn(fees)}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 p-5"><p className="text-xs text-muted-foreground">Net (before platform fee)</p><p className="font-display text-2xl font-bold text-success">{formatNgn(net)}</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden /></div>
      ) : payments.length === 0 ? (
        <EmptyState icon={<Receipt className="h-5 w-5" aria-hidden />} title="No transactions yet" description="Payments will appear here when students book your rooms." />
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
                        {p.confirmedByBackend && <Badge variant="outline" className="text-xs text-success">Backend-verified</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.channel.toUpperCase()} · {formatDateTime(p.initiatedAt)}
                        {booking && ` · Booking ${booking.reference}`}
                        {p.gatewayReference && ` · Gateway ${p.gatewayReference}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatNgn(p.amountKobo)}</p>
                      <p className="text-xs text-muted-foreground">fee {formatNgn(p.feeKobo)}</p>
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
