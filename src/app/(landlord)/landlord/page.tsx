"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2, DoorOpen, CalendarCheck, Banknote, AlertCircle, Plus,
  Loader2, CheckCircle2, TrendingUp, Wallet, Clock, ChevronRight,
  ArrowRight, Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState, SectionHeading } from "@/components/shared/page-components";
import { PropertyStatusBadge, VerificationBadge, BookingStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { fetchLandlordProperties, fetchLandlordBookings, fetchLandlordVerificationCases } from "@/lib/supabase/landlord-service";
import { formatNgn, formatRelativeTime } from "@/lib/utils/format";

export default function LandlordDashboardPage() {
  const { session } = useAuth();
  const { t } = useI18n();
  const [properties, setProperties] = React.useState<any[]>([]);
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [verification, setVerification] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!session?.userId || !isSupabaseAuth) {
      setLoading(false);
      return;
    }
    Promise.allSettled([
      fetchLandlordProperties(),
      fetchLandlordBookings(),
      fetchLandlordVerificationCases(),
    ]).then(([propsRes, bookingsRes, verifRes]) => {
      const errors: string[] = [];

      if (propsRes.status === "fulfilled" && propsRes.value.data) {
        setProperties(propsRes.value.data);
      } else if (propsRes.status === "rejected" || (propsRes.status === "fulfilled" && propsRes.value.error)) {
        errors.push("properties");
      }

      if (bookingsRes.status === "fulfilled" && bookingsRes.value.data) {
        setBookings(bookingsRes.value.data);
      } else if (bookingsRes.status === "rejected" || (bookingsRes.status === "fulfilled" && bookingsRes.value.error)) {
        errors.push("bookings");
      }

      if (verifRes.status === "fulfilled" && verifRes.value.data) {
        setVerification(verifRes.value.data);
      } else if (verifRes.status === "rejected" || (verifRes.status === "fulfilled" && verifRes.value.error)) {
        errors.push("verification");
      }

      if (errors.length > 0) {
        setError(t("landlord.dashboard.couldNotLoad", { items: errors.join(", ") }));
      }
      setLoading(false);
    });
  }, [session, isSupabaseAuth]);

  const totalUnits = properties.reduce((s, p) => s + (p.total_units || 0), 0);
  const availableUnits = properties.reduce((s, p) => s + (p.available_units || 0), 0);
  const occupiedUnits = properties.reduce((s, p) => s + (p.occupied_units || 0), 0);
  const heldUnits = properties.reduce((s, p) => s + (p.held_units || 0), 0);
  const occupancyRate = totalUnits > 0 ? Math.round(((occupiedUnits + heldUnits) / totalUnits) * 100) : 0;

  const pendingBookings = bookings.filter((b) => ["pending_payment", "payment_initiated"].includes(b.status));
  const confirmedBookings = bookings.filter((b) => ["confirmed", "active"].includes(b.status));
  const pendingVerification = verification.filter((v) => v.verification_status === "pending" || v.verification_status === "under_review");

  // Revenue: sum of paid_kobo from confirmed/active bookings
  const totalRevenue = confirmedBookings.reduce((s, b) => s + (b.paid_kobo ?? 0), 0);
  // Pending revenue: outstanding from pending bookings
  const pendingRevenue = pendingBookings.reduce((s, b) => s + (b.outstanding_kobo ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={t("landlord.dashboard.eyebrow", { name: session?.firstName ?? "" })}
        title={t("landlord.dashboard.title")}
        description={t("landlord.dashboard.description")}
        actions={
          <Button asChild>
            <Link href="/landlord/properties/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              {t("landlord.dashboard.addProperty")}
            </Link>
          </Button>
        }
      />

      {!isSupabaseAuth && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-2 p-3 text-xs text-warning-foreground">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{t("landlord.dashboard.signInPrompt")}</span>
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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : (
        <>
          {/* Needs attention */}
          {(pendingBookings.length > 0 || pendingVerification.length > 0) && (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                      <Clock className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{t("landlord.dashboard.needsAttention")}</p>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {pendingBookings.length > 0 && (
                          <span>{pendingBookings.length === 1 ? t("landlord.dashboard.pendingBooking.singular", { n: pendingBookings.length }) : t("landlord.dashboard.pendingBooking.plural", { n: pendingBookings.length })}</span>
                        )}
                        {pendingVerification.length > 0 && (
                          <span>{pendingVerification.length === 1 ? t("landlord.dashboard.pendingVerification.singular", { n: pendingVerification.length }) : t("landlord.dashboard.pendingVerification.plural", { n: pendingVerification.length })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {pendingBookings.length > 0 && (
                      <Button asChild size="sm" variant="outline" className="shrink-0">
                        <Link href="/landlord/bookings">{t("landlord.dashboard.viewBookings")}</Link>
                      </Button>
                    )}
                    {pendingVerification.length > 0 && (
                      <Button asChild size="sm" className="shrink-0">
                        <Link href="/landlord/verification">{t("landlord.dashboard.checkVerification")}</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t("landlord.dashboard.totalRevenue")}
              value={formatNgn(totalRevenue)}
              icon={<Banknote className="h-4 w-4" aria-hidden />}
              hint={confirmedBookings.length === 1 ? t("landlord.dashboard.revenueHint.singular", { n: confirmedBookings.length }) : t("landlord.dashboard.revenueHint.plural", { n: confirmedBookings.length })}
            />
            <StatCard
              label={t("landlord.dashboard.pendingRevenue")}
              value={pendingRevenue > 0 ? formatNgn(pendingRevenue) : "₦0"}
              icon={<Wallet className="h-4 w-4" aria-hidden />}
              hint={pendingRevenue > 0 ? t("landlord.dashboard.pendingRevenueHint", { n: pendingBookings.length }) : t("landlord.dashboard.noPendingPayments")}
            />
            <StatCard
              label={t("landlord.dashboard.occupancy")}
              value={`${occupancyRate}%`}
              icon={<Percent className="h-4 w-4" aria-hidden />}
              hint={t("landlord.dashboard.occupancyHint", { occupied: occupiedUnits, held: heldUnits, available: availableUnits })}
            />
            <StatCard
              label={t("landlord.dashboard.totalUnits")}
              value={totalUnits}
              icon={<DoorOpen className="h-4 w-4" aria-hidden />}
              hint={properties.length === 1 ? t("landlord.dashboard.unitsHint.singular", { n: properties.length }) : t("landlord.dashboard.unitsHint.plural", { n: properties.length })}
            />
          </div>

          {/* Properties */}
          <section>
            <SectionHeading
              eyebrow={t("landlord.dashboard.portfolio")}
              title={t("landlord.dashboard.yourProperties")}
              action={<Button asChild variant="ghost" size="sm"><Link href="/landlord/properties">{t("landlord.dashboard.allProperties")}</Link></Button>}
            />
            {properties.length === 0 ? (
              <EmptyState
                className="mt-4"
                icon={<Building2 className="h-5 w-5" aria-hidden />}
                title={t("landlord.dashboard.noProperties.title")}
                description={t("landlord.dashboard.noProperties.desc")}
                action={<Button asChild size="sm"><Link href="/landlord/properties/new"><Plus className="mr-2 h-4 w-4" aria-hidden />{t("landlord.dashboard.addProperty")}</Link></Button>}
              />
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((p) => {
                  const propUnits = p.total_units || 0;
                  const propOccupied = p.occupied_units || 0;
                  const propHeld = p.held_units || 0;
                  const propAvail = p.available_units || 0;
                  const propOccRate = propUnits > 0 ? Math.round(((propOccupied + propHeld) / propUnits) * 100) : 0;
                  return (
                    <Card key={p.id} className="flex flex-col">
                      <CardContent className="flex flex-1 flex-col space-y-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/landlord/properties/${p.id}`} className="space-y-1">
                            <p className="font-medium leading-tight hover:text-primary">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.public_address_line}</p>
                          </Link>
                          <PropertyStatusBadge status={p.status} />
                        </div>
                        <div className="flex items-center gap-2">
                          <VerificationBadge status={p.verification_status} />
                        </div>

                        {/* Occupancy bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{t("landlord.dashboard.occupancyLabel")}</span>
                            <span className="font-medium">{propOccRate}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${propOccRate}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-md bg-muted/40 p-2">
                            <p className="font-semibold text-foreground">{propUnits}</p>
                            <p className="text-muted-foreground">{t("landlord.dashboard.total")}</p>
                          </div>
                          <div className="rounded-md bg-success/10 p-2">
                            <p className="font-semibold text-success">{propAvail}</p>
                            <p className="text-muted-foreground">{t("landlord.dashboard.available")}</p>
                          </div>
                          <div className="rounded-md bg-info/10 p-2">
                            <p className="font-semibold text-info">{propOccupied}</p>
                            <p className="text-muted-foreground">{t("landlord.dashboard.occupied")}</p>
                          </div>
                        </div>
                        <div className="mt-auto flex items-center justify-between text-xs pt-1">
                          <Price kobo={p.price_from_kobo} fromLabel period="/yr" />
                          <Link href={`/landlord/properties/${p.id}/rooms`} className="text-primary hover:underline">{t("landlord.dashboard.manageRooms")} →</Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent bookings + Quick actions */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent bookings */}
            <section className="lg:col-span-2">
              <SectionHeading
                eyebrow={t("landlord.dashboard.activity")}
                title={t("landlord.dashboard.recentBookings")}
                action={bookings.length > 0 ? <Button asChild variant="ghost" size="sm"><Link href="/landlord/bookings">{t("landlord.dashboard.viewAll")}</Link></Button> : undefined}
              />
              {bookings.length === 0 ? (
                <EmptyState
                  className="mt-4"
                  icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
                  title={t("landlord.dashboard.noBookings.title")}
                  description={t("landlord.dashboard.noBookings.desc")}
                />
              ) : (
                <Card className="mt-4">
                  <CardContent className="p-0">
                    <ul className="divide-y divide-border">
                      {bookings.slice(0, 5).map((b) => (
                        <li key={b.id}>
                          <Link href={`/landlord/bookings/${b.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-medium">{b.properties?.name ?? "Property"}</p>
                                <BookingStatusBadge status={b.status} />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {b.reference} · {formatRelativeTime(b.created_at)}
                                {b.rentable_units && ` · Unit ${b.rentable_units.identifier}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <Price kobo={b.total_kobo} compact />
                                {b.outstanding_kobo > 0 && (
                                  <p className="text-xs text-warning">{formatNgn(b.outstanding_kobo)} {t("landlord.dashboard.due")}</p>
                                )}
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Quick actions */}
            <section>
              <SectionHeading title={t("landlord.dashboard.quickActions")} />
              <div className="mt-4 space-y-3">
                {[
                  { href: "/landlord/properties/new", icon: Plus, label: t("landlord.dashboard.addProperty"), desc: t("landlord.dashboard.addPropertyDesc") },
                  { href: "/landlord/payouts", icon: Banknote, label: t("nav.landlord.payouts"), desc: t("landlord.dashboard.payoutsDesc") },
                  { href: "/landlord/transactions", icon: TrendingUp, label: t("nav.landlord.transactions"), desc: t("landlord.dashboard.transactionsDesc") },
                  { href: "/landlord/verification", icon: CheckCircle2, label: t("nav.landlord.verification"), desc: pendingVerification.length > 0 ? t("landlord.dashboard.verificationDescPending", { n: pendingVerification.length }) : t("landlord.dashboard.verificationDescAllVerified") },
                ].map((q) => (
                  <Link key={q.href} href={q.href}>
                    <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <q.icon className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{q.label}</p>
                          <p className="text-xs text-muted-foreground">{q.desc}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
