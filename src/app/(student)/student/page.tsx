"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search, Heart, CalendarCheck, CreditCard, Bell, LifeBuoy,
  ArrowRight, Building2, Sparkles, Loader2, AlertCircle, Wallet,
  Clock, CheckCircle2, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState, SectionHeading } from "@/components/shared/page-components";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { useOnboardingGate } from "@/lib/hooks/use-onboarding-gate";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime, formatNgn } from "@/lib/utils/format";

interface StudentBooking {
  id: string;
  reference: string;
  status: string;
  total_kobo: number;
  outstanding_kobo: number;
  paid_kobo: number;
  check_in: string;
  check_out: string;
  hold_expires_at: string | null;
  created_at: string;
  rentable_units?: { identifier: string };
  properties?: { name: string; slug: string };
}

interface StudentNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  href: string | null;
}

interface StudentPayment {
  id: string;
  reference: string;
  amount_kobo: number;
  status: string;
  initiated_at: string;
}

export default function StudentDashboardPage() {
  const { session } = useAuth();
  const { t } = useI18n();
  const { completed: onboardingCompleted } = useOnboardingGate();
  const [bookings, setBookings] = React.useState<StudentBooking[]>([]);
  const [notifications, setNotifications] = React.useState<StudentNotification[]>([]);
  const [payments, setPayments] = React.useState<StudentPayment[]>([]);
  const [savedCount, setSavedCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    const uid = session!.userId;

    Promise.allSettled([
      supabase.from("bookings")
        .select(`*, rentable_units(identifier), properties(name, slug)`)
        .eq("student_id", uid)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("notifications")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("saved_properties")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid),
      supabase.from("payments")
        .select("id, reference, amount_kobo, status, initiated_at")
        .eq("student_id", uid)
        .order("initiated_at", { ascending: false })
        .limit(3),
    ]).then(([bRes, nRes, sRes, pRes]) => {
      const errors: string[] = [];

      if (bRes.status === "fulfilled" && bRes.value.data) {
        setBookings(bRes.value.data as StudentBooking[]);
      } else if (bRes.status === "rejected") {
        errors.push("bookings");
      }

      if (nRes.status === "fulfilled" && nRes.value.data) {
        setNotifications(nRes.value.data as StudentNotification[]);
      } else if (nRes.status === "rejected") {
        errors.push("notifications");
      }

      if (sRes.status === "fulfilled") {
        setSavedCount(sRes.value.count ?? 0);
      }

      if (pRes.status === "fulfilled" && pRes.value.data) {
        setPayments(pRes.value.data as StudentPayment[]);
      } else if (pRes.status === "rejected") {
        errors.push("payments");
      }

      if (errors.length > 0) {
        setError(t("student.dashboard.couldNotLoad", { items: errors.join(", ") }));
      }
      setLoading(false);
    });
  }, [session, isSupabaseAuth]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader eyebrow={t("student.dashboard.eyebrow")} title={t("student.dashboard.title")} />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          {t("student.dashboard.signInPrompt")}
        </CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeBookings = bookings.filter((b) => ["confirmed", "active", "pending_payment", "payment_initiated"].includes(b.status));
  const pendingPaymentBookings = bookings.filter((b) => ["pending_payment", "payment_initiated"].includes(b.status));
  const totalOutstanding = activeBookings.reduce((s, b) => s + (b.outstanding_kobo ?? 0), 0);
  const totalPaid = bookings.reduce((s, b) => s + (b.paid_kobo ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={t("student.dashboard.eyebrow")}
        title={t("student.dashboard.welcome", { name: session?.firstName ?? "" })}
        description={t("student.dashboard.welcomeDesc")}
      />

      {/* Onboarding gate banner */}
      {onboardingCompleted === false && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                <AlertCircle className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="font-medium">{t("student.dashboard.completeProfile")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("student.dashboard.completeProfileDesc")}
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href="/student/onboarding">
                {t("student.dashboard.completeProfileAction")}
                <ArrowRight className="ml-2 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-2 p-3 text-xs text-warning-foreground">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Needs attention — bookings awaiting payment */}
      {pendingPaymentBookings.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                  <Clock className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="font-medium">
                    {pendingPaymentBookings.length === 1
                      ? t("student.dashboard.bookingAwaiting.singular", { n: pendingPaymentBookings.length })
                      : t("student.dashboard.bookingAwaiting.plural", { n: pendingPaymentBookings.length })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pendingPaymentBookings.length === 1
                      ? t("student.dashboard.bookingAwaitingDesc.singular")
                      : t("student.dashboard.bookingAwaitingDesc.plural")}
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="shrink-0">
                <Link href={`/student/bookings/${pendingPaymentBookings[0].id}`}>
                  {t("student.dashboard.payNow")}
                  <ArrowRight className="ml-2 h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("student.dashboard.activeBookings")}
          value={activeBookings.length}
          icon={<CalendarCheck className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label={t("student.dashboard.outstanding")}
          value={totalOutstanding > 0 ? formatNgn(totalOutstanding) : "₦0"}
          icon={<Wallet className="h-4 w-4" aria-hidden />}
          hint={totalOutstanding > 0 ? t("student.dashboard.awaitingPayment") : t("student.dashboard.allSettled")}
        />
        <StatCard
          label={t("student.dashboard.totalPaid")}
          value={formatNgn(totalPaid)}
          icon={<CreditCard className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label={t("student.dashboard.savedProperties")}
          value={savedCount}
          icon={<Heart className="h-4 w-4" aria-hidden />}
        />
      </div>

      {/* Recent bookings */}
      <section>
        <SectionHeading
          title={t("student.dashboard.recentBookings")}
          action={<Button asChild variant="ghost" size="sm"><Link href="/student/bookings">{t("student.dashboard.viewAll")}</Link></Button>}
        />
        {bookings.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
            title={t("student.dashboard.noBookings.title")}
            description={t("student.dashboard.noBookings.desc")}
            action={<Button asChild><Link href="/properties">{t("student.dashboard.browseProperties")}</Link></Button>}
          />
        ) : (
          <Card className="mt-4">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {bookings.map((b) => {
                  const isPending = ["pending_payment", "payment_initiated"].includes(b.status);
                  const isExpired = b.hold_expires_at && new Date(b.hold_expires_at) < new Date() && isPending;
                  return (
                    <li key={b.id}>
                      <Link href={`/student/bookings/${b.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium">{b.properties?.name ?? "Property"}</p>
                          <p className="text-xs text-muted-foreground">
                            {b.reference} · {formatRelativeTime(b.created_at)}
                            {b.rentable_units && ` · Unit ${b.rentable_units.identifier}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <Price kobo={b.total_kobo} />
                            <p className={`text-xs ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>
                              {isExpired ? t("student.dashboard.holdExpired") : b.outstanding_kobo > 0 ? t("student.dashboard.outstanding") : t("student.dashboard.paid")}
                            </p>
                          </div>
                          <BookingStatusBadge status={b.status as any} />
                          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Two-column: notifications + payments */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent notifications */}
        {notifications.length > 0 && (
          <section>
            <SectionHeading
              title={t("student.dashboard.recentNotifications")}
              action={<Button asChild variant="ghost" size="sm"><Link href="/student/notifications">{t("student.dashboard.viewAll")}</Link></Button>}
            />
            <Card className="mt-4">
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {notifications.slice(0, 4).map((n) => (
                    <li key={n.id} className={`flex items-start gap-3 p-4 ${!n.read ? "bg-primary/5" : ""}`}>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(n.created_at)}</p>
                      </div>
                      {!n.read && <Badge variant="outline" className="text-xs text-primary">{t("student.dashboard.new")}</Badge>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Recent payments */}
        {payments.length > 0 && (
          <section>
            <SectionHeading
              title={t("student.dashboard.recentPayments")}
              action={<Button asChild variant="ghost" size="sm"><Link href="/student/payments">{t("student.dashboard.viewAll")}</Link></Button>}
            />
            <Card className="mt-4">
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium">{p.reference}</p>
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(p.initiated_at)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Price kobo={p.amount_kobo} />
                        <Badge
                          variant={p.status === "successful" ? "default" : p.status === "failed" ? "destructive" : "outline"}
                          className="text-xs"
                        >
                          {p.status}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      {/* Quick links */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/student/search", icon: Search, label: t("student.dashboard.searchAccommodation") },
          { href: "/student/saved", icon: Heart, label: t("student.dashboard.savedProperties") },
          { href: "/student/payments", icon: CreditCard, label: t("student.dashboard.paymentHistory") },
          { href: "/student/support", icon: LifeBuoy, label: t("student.dashboard.getSupport") },
        ].map((q) => (
          <Link key={q.href} href={q.href}>
            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><q.icon className="h-4 w-4" aria-hidden /></div>
                <p className="flex-1 text-sm font-medium">{q.label}</p>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
