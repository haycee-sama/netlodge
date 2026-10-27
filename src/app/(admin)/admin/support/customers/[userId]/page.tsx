"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AdminPageHeader, DemoModeBanner, DetailLayout } from "@/components/admin/admin-page-components";
import { RoleBadge, SupportTicketStatusBadge, VerificationBadge } from "@/components/shared/status-badges";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import { bookings as allBookings, payments as allPayments } from "@/lib/data/fixtures";
import type { User, SupportTicket, Booking, Payment } from "@/lib/types";
import { formatRelativeTime, formatDateTime, formatNgn } from "@/lib/utils/format";
import { ArrowLeft, Mail, Phone, Calendar, CreditCard, Ticket } from "lucide-react";

export default function SupportCustomerDetailPage() {
  const params = useParams<{ userId: string }>();
  const [user, setUser] = React.useState<User | null>(null);
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);

  React.useEffect(() => {
    if (!params.userId) return;
    getRepositories().users.getById(params.userId).then(setUser);
    getRepositories().support.listAll({ pageSize: 100 }).then((r) => {
      setTickets(r.items.filter((t) => t.userId === params.userId));
    });
    setBookings(allBookings.filter((b) => b.studentId === params.userId));
    setPayments(allPayments.filter((p) => p.studentId === params.userId));
  }, [params.userId]);

  if (!user) return <div className="mx-auto max-w-5xl"><p className="text-sm text-muted-foreground">Loading…</p></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/support/customers"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to customers</Link></Button>
      <AdminPageHeader
        eyebrow="Customer profile"
        title={`${user.firstName} ${user.lastName}`}
        description={user.email}
        breadcrumbs={[{ label: "Support", href: "/admin/support" }, { label: "Customers", href: "/admin/support/customers" }, { label: user.email }]}
        actions={<RoleBadge role={user.role} active={user.active} />}
      />
      <DemoModeBanner />

      <DetailLayout
        sidebar={
          <Card>
            <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" aria-hidden /><span>{user.email}</span></div>
              {user.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" aria-hidden /><span>{user.phone}</span></div>}
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span>{formatRelativeTime(user.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last seen</span><span>{user.lastSeenAt ? formatRelativeTime(user.lastSeenAt) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email verified</span><Badge variant="outline" className={user.emailVerified ? "text-success" : "text-warning-foreground"}>{user.emailVerified ? "Yes" : "No"}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone verified</span><Badge variant="outline" className={user.phoneVerified ? "text-success" : "text-warning-foreground"}>{user.phoneVerified ? "Yes" : "No"}</Badge></div>
              {!user.active && (
                <>
                  <Separator />
                  <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    Account suspended — {user.statusReason}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        }
      >
        {/* Support tickets */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Ticket className="h-4 w-4 text-primary" aria-hidden /> Support tickets ({tickets.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {tickets.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">No support tickets.</p>
            ) : (
              <ul className="divide-y divide-border">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link href={`/admin/support/tickets/${t.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.subject}</p>
                        <p className="text-xs text-muted-foreground">{t.reference} · {t.category} · {formatRelativeTime(t.createdAt)}</p>
                      </div>
                      <SupportTicketStatusBadge status={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Bookings (if student) */}
        {user.role === "student" && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4 text-primary" aria-hidden /> Bookings ({bookings.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {bookings.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">No bookings.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {bookings.map((b) => (
                    <li key={b.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-mono text-xs font-medium">{b.reference}</p>
                        <p className="text-xs text-muted-foreground">{formatNgn(b.totalKobo)} · {formatRelativeTime(b.createdAt)}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">{b.status.replace("_", " ")}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payments (if student) */}
        {user.role === "student" && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4 text-primary" aria-hidden /> Payments ({payments.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">No payments.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-mono text-xs font-medium">{p.reference}</p>
                        <p className="text-xs text-muted-foreground">{formatNgn(p.amountKobo)} · {p.channel} · {formatRelativeTime(p.initiatedAt)}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">{p.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </DetailLayout>
    </div>
  );
}
