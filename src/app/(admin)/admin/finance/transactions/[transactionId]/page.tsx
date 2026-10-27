"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AdminPageHeader, DemoModeBanner, DetailLayout } from "@/components/admin/admin-page-components";
import { AuditTimeline } from "@/components/admin/audit-timeline";
import { PaymentStatusBadge, RoleBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import { bookings as allBookings } from "@/lib/data/fixtures";
import type { Payment, AuditLog } from "@/lib/types";
import { formatDateTime, formatRelativeTime, formatNgn } from "@/lib/utils/format";
import { ArrowLeft, AlertCircle, ShieldCheck } from "lucide-react";

export default function FinanceTransactionDetailPage() {
  const params = useParams<{ transactionId: string }>();
  const [payment, setPayment] = React.useState<Payment | null>(null);
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!params.transactionId) return;
    Promise.all([
      getRepositories().payments.getById(params.transactionId),
      getRepositories().auditLogs.list({ resourceType: "payment", resourceId: params.transactionId, pageSize: 50 }),
    ]).then(([p, a]) => { setPayment(p); setAuditLogs(a.items); setLoading(false); });
  }, [params.transactionId]);

  if (loading) return <div className="mx-auto max-w-5xl"><p className="text-sm text-muted-foreground">Loading transaction…</p></div>;
  if (!payment) return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader title="Transaction not found" breadcrumbs={[{ label: "Finance", href: "/admin/finance" }, { label: "Not found" }]} />
      <Button asChild variant="outline"><Link href="/admin/finance/transactions">Back to transactions</Link></Button>
    </div>
  );

  const student = allUsers.find((u) => u.id === payment.studentId);
  const booking = allBookings.find((b) => b.id === payment.bookingId);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/finance/transactions"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to transactions</Link></Button>
      <AdminPageHeader
        eyebrow={payment.reference}
        title="Transaction detail"
        description={`${payment.channel.toUpperCase()} payment · initiated ${formatRelativeTime(payment.initiatedAt)}`}
        breadcrumbs={[{ label: "Finance", href: "/admin/finance" }, { label: "Transactions", href: "/admin/finance/transactions" }, { label: payment.reference }]}
        actions={<PaymentStatusBadge status={payment.status} />}
      />
      <DemoModeBanner />

      <DetailLayout
        sidebar={
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Transaction</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{payment.reference}</span></div>
                {payment.gatewayReference && <div className="flex justify-between"><span className="text-muted-foreground">Gateway ref</span><span className="font-mono text-xs">{payment.gatewayReference}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Channel</span><span className="uppercase">{payment.channel}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{payment.currency}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Initiated</span><span>{formatDateTime(payment.initiatedAt)}</span></div>
                {payment.confirmedAt && <div className="flex justify-between"><span className="text-muted-foreground">Confirmed</span><span>{formatDateTime(payment.confirmedAt)}</span></div>}
                {payment.failureReason && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{payment.failureReason}</div>}
              </CardContent>
            </Card>

            <Card className={payment.confirmedByBackend ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  {payment.confirmedByBackend ? <ShieldCheck className="h-4 w-4 text-success" aria-hidden /> : <AlertCircle className="h-4 w-4 text-warning-foreground" aria-hidden />}
                  <div>
                    <p className="text-sm font-medium">{payment.confirmedByBackend ? "Backend-verified" : "Not yet verified"}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.confirmedByBackend
                        ? "This payment was confirmed by the Paystack webhook and independently verified by our backend."
                        : "This payment has not been confirmed by the backend. Do not treat as successful until verified."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        }
      >
        {/* Amounts */}
        <Card>
          <CardHeader><CardTitle className="text-base">Amounts</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Gross amount</span><Price kobo={payment.amountKobo} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment provider fee</span><span className="text-destructive">−{formatNgn(payment.feeKobo)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Net to platform</span><span className="font-medium">{formatNgn(payment.netKobo)}</span></div>
            <Separator />
            {booking && (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Booking total</span><span>{formatNgn(booking.totalKobo)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Booking paid</span><span className="text-success">{formatNgn(booking.paidKobo)}</span></div>
                {booking.outstandingKobo > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="text-destructive">{formatNgn(booking.outstandingKobo)}</span></div>}
              </>
            )}
          </CardContent>
        </Card>

        {/* Related parties */}
        <Card>
          <CardHeader><CardTitle className="text-base">Related parties</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {student && (
              <div>
                <p className="text-xs text-muted-foreground">Student</p>
                <div className="flex items-center justify-between">
                  <span>{student.firstName} {student.lastName}</span>
                  <RoleBadge role={student.role} active={student.active} />
                </div>
                <p className="text-xs text-muted-foreground">{student.email}</p>
              </div>
            )}
            {booking && (
              <div>
                <p className="text-xs text-muted-foreground">Booking</p>
                <Link href={`/admin/bookings`} className="font-mono text-xs text-primary hover:underline">{booking.reference}</Link>
              </div>
            )}
          </CardContent>
        </Card>

        <AuditTimeline logs={auditLogs} title="Transaction activity" />
      </DetailLayout>
    </div>
  );
}
