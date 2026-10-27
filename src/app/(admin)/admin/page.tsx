"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { StatCard, SectionHeading } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn } from "@/lib/utils/format";
import { Users, Building2, DoorOpen, CalendarCheck, BadgeCheck, Ticket, Wallet, AlertTriangle, Loader2, Activity } from "lucide-react";

interface Metrics {
  users: Record<string, number>;
  users_by_status: Record<string, number>;
  properties: { by_status: Record<string, number>; by_verification: Record<string, number>; total: number };
  rentable_units: { by_status: Record<string, number>; total: number };
  bookings: { by_status: Record<string, number>; total: number };
  payments: { by_status: Record<string, number>; total_kobo: number; count: number };
  verification_cases: { by_status: Record<string, number>; total: number };
  support_tickets: { open: number; total: number };
}

const ROLE_LABELS: Record<string, string> = {
  student: "Students",
  landlord: "Landlords",
  property_manager: "Managers",
  agent: "Agents",
  verification_officer: "Verification Officers",
  support_staff: "Support Staff",
  finance_admin: "Finance Admins",
  super_admin: "Super Admins",
};

export default function SuperAdminOverviewPage() {
  const { session } = useAuth();
  const [m, setM] = React.useState<Metrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    fetch(`/api/admin/metrics`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setM(data);
        setLoading(false);
      })
      .catch((e) => { setError(e instanceof Error ? e.message : "Network error"); setLoading(false); });
  }, [isSupabaseAuth]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="Platform control center" title="Platform overview" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Super Admin account to view platform metrics.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Platform control center"
        title="Platform overview"
        description="Real-time visibility into NetLodge's marketplace, operations, and system health — all derived from live database queries."
        breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Overview" }]}
      />
      <DemoModeBanner message="Live data — every figure comes from a real database query. No fabricated counts." />

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : m ? (
        <>
          {/* User metrics */}
          <section>
            <SectionHeading title="User metrics" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <StatCard
                  key={role}
                  label={label}
                  value={m.users[role] ?? 0}
                  icon={<Users className="h-4 w-4" aria-hidden />}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {Object.entries(m.users_by_status).map(([status, count]) => (
                <Badge key={status} variant="outline" className={status === "suspended" ? "border-destructive/30 text-destructive" : "text-success"}>
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </section>

          {/* Marketplace metrics */}
          <section>
            <SectionHeading title="Properties & rooms" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total properties" value={m.properties.total} icon={<Building2 className="h-4 w-4" aria-hidden />} />
              <StatCard label="Total units" value={m.rentable_units.total} hint={`${m.rentable_units.by_status.available ?? 0} available, ${m.rentable_units.by_status.occupied ?? 0} occupied`} icon={<DoorOpen className="h-4 w-4" aria-hidden />} />
              <StatCard label="Active bookings" value={(m.bookings.by_status.confirmed ?? 0) + (m.bookings.by_status.active ?? 0)} hint={`${m.bookings.total} total`} icon={<CalendarCheck className="h-4 w-4" aria-hidden />} />
              <StatCard label="Pending verifications" value={m.verification_cases.by_status.pending ?? 0} hint={`${m.verification_cases.total} total cases`} icon={<BadgeCheck className="h-4 w-4" aria-hidden />} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {Object.entries(m.properties.by_status).map(([status, count]) => (
                <Badge key={status} variant="outline">Property {status}: {count}</Badge>
              ))}
              {Object.entries(m.properties.by_verification).map(([status, count]) => (
                <Badge key={status} variant="outline" className={status === "approved" ? "text-success" : status === "rejected" ? "text-destructive" : ""}>
                  Verification {status}: {count}
                </Badge>
              ))}
            </div>
          </section>

          {/* Operations metrics */}
          <section>
            <SectionHeading title="Operations & finance" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Open support tickets" value={m.support_tickets.open} hint={`${m.support_tickets.total} total`} icon={<Ticket className="h-4 w-4" aria-hidden />} />
              <StatCard label="Successful payments" value={m.payments.by_status.successful ?? 0} hint={`${m.payments.count} total transactions`} icon={<Wallet className="h-4 w-4" aria-hidden />} />
              <StatCard label="Total received (NGN)" value={formatNgn(m.payments.total_kobo)} icon={<Wallet className="h-4 w-4" aria-hidden />} />
              <StatCard label="Verification cases" value={m.verification_cases.total} hint={`${m.verification_cases.by_status.pending ?? 0} pending`} icon={<BadgeCheck className="h-4 w-4" aria-hidden />} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {Object.entries(m.payments.by_status).map(([status, count]) => (
                <Badge key={status} variant="outline" className={status === "successful" ? "text-success" : status === "failed" ? "text-destructive" : ""}>
                  Payments {status}: {count}
                </Badge>
              ))}
            </div>
          </section>

          {/* Quick links */}
          <section>
            <SectionHeading title="Quick links" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: "/admin/users", icon: Users, label: "Manage users" },
                { href: "/admin/audit-logs", icon: Activity, label: "Audit logs" },
                { href: "/admin/verification/queue", icon: BadgeCheck, label: "Verification queue" },
                { href: "/admin/settings", icon: AlertTriangle, label: "Platform settings" },
              ].map((q) => (
                <Link key={q.href} href={q.href}>
                  <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><q.icon className="h-4 w-4" aria-hidden /></div>
                      <p className="flex-1 text-sm font-medium">{q.label}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
