"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { StatCard, SectionHeading } from "@/components/shared/page-components";
import { IntegrationStatusBadge, VerificationBadge, SupportTicketStatusBadge } from "@/components/shared/status-badges";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers, integrationHealth, systemAnnouncements } from "@/lib/data/admin-fixtures";
import { properties as allProperties, rooms as allRooms, bookings as allBookings } from "@/lib/data/fixtures";
import { formatRelativeTime } from "@/lib/utils/format";
import { Users, Building2, DoorOpen, CalendarCheck, BadgeCheck, Ticket, Activity, AlertTriangle, Wallet, Megaphone } from "lucide-react";

export default function SuperAdminOverviewPage() {
  const [verificationPending, setVerificationPending] = React.useState(0);
  const [openTickets, setOpenTickets] = React.useState(0);
  const [pendingPayouts, setPendingPayouts] = React.useState(0);

  React.useEffect(() => {
    Promise.all([
      getRepositories().verification.listAll({ status: "pending", pageSize: 1 }),
      getRepositories().support.listAll({ pageSize: 100 }),
      getRepositories().payouts.listAll({ status: "scheduled", pageSize: 1 }),
    ]).then(([v, t, p]) => {
      setVerificationPending(v.total);
      setOpenTickets(t.items.filter((x) => x.status === "open" || x.status === "in_progress").length);
      setPendingPayouts(p.total);
    });
  }, []);

  const students = allUsers.filter((u) => u.role === "student").length;
  const landlords = allUsers.filter((u) => u.role === "landlord").length;
  const managers = allUsers.filter((u) => u.role === "manager").length;
  const agents = allUsers.filter((u) => u.role === "agent").length;
  const admins = allUsers.filter((u) => ["verification_officer", "support_staff", "finance_admin", "super_admin"].includes(u.role)).length;
  const totalProperties = allProperties.length;
  const totalRooms = allRooms.length;
  const availableRooms = allRooms.filter((r) => r.status === "available").length;
  const occupiedRooms = allRooms.filter((r) => r.status === "occupied").length;
  const activeBookings = allBookings.filter((b) => ["confirmed", "active"].includes(b.status)).length;
  const degradedIntegrations = integrationHealth.filter((i) => i.status !== "operational");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Platform control center"
        title="Platform overview"
        description="Real-time visibility into NetLodge's marketplace, operations, and system health."
        breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Overview" }]}
      />
      <DemoModeBanner message="All metrics are derived from fixture data and clearly labelled as development data. In production, every figure comes from a real API response — no fabricated numbers." />

      {/* User metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={students} icon={<Users className="h-4 w-4" aria-hidden />} />
        <StatCard label="Landlords" value={landlords} icon={<Building2 className="h-4 w-4" aria-hidden />} />
        <StatCard label="Managers + Agents" value={managers + agents} hint={`${managers} managers, ${agents} agents`} icon={<Users className="h-4 w-4" aria-hidden />} />
        <StatCard label="Admin staff" value={admins} icon={<BadgeCheck className="h-4 w-4" aria-hidden />} />
      </div>

      {/* Marketplace metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Properties" value={totalProperties} icon={<Building2 className="h-4 w-4" aria-hidden />} />
        <StatCard label="Rooms" value={totalRooms} hint={`${availableRooms} available, ${occupiedRooms} occupied`} icon={<DoorOpen className="h-4 w-4" aria-hidden />} />
        <StatCard label="Active bookings" value={activeBookings} icon={<CalendarCheck className="h-4 w-4" aria-hidden />} />
        <StatCard label="Pending verifications" value={verificationPending} icon={<BadgeCheck className="h-4 w-4" aria-hidden />} />
      </div>

      {/* Operations metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open support tickets" value={openTickets} icon={<Ticket className="h-4 w-4" aria-hidden />} />
        <StatCard label="Pending payouts" value={pendingPayouts} icon={<Wallet className="h-4 w-4" aria-hidden />} />
        <StatCard label="Degraded integrations" value={degradedIntegrations.length} hint={degradedIntegrations.length > 0 ? "Needs attention" : "All operational"} icon={<AlertTriangle className="h-4 w-4" aria-hidden />} />
        <StatCard label="Active announcements" value={systemAnnouncements.filter((a) => a.active).length} icon={<Megaphone className="h-4 w-4" aria-hidden />} />
      </div>

      {/* Integration health */}
      <section>
        <SectionHeading
          eyebrow="System"
          title="Integration health"
          action={<Button asChild variant="ghost" size="sm"><Link href="/admin/system-health">View all</Link></Button>}
        />
        <Card className="mt-4">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {integrationHealth.slice(0, 5).map((i) => (
                <li key={i.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Activity className={`h-4 w-4 ${i.status === "operational" ? "text-success" : i.status === "degraded" ? "text-warning-foreground" : "text-destructive"}`} aria-hidden />
                    <div>
                      <p className="text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">{i.category} · {i.uptime24h}% uptime · {i.avgResponseMs}ms avg</p>
                    </div>
                  </div>
                  <IntegrationStatusBadge status={i.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Quick links */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/admin/users", icon: Users, label: "Manage users" },
          { href: "/admin/audit-logs", icon: Activity, label: "Audit logs" },
          { href: "/admin/integrations", icon: AlertTriangle, label: "Integrations" },
          { href: "/admin/settings", icon: BadgeCheck, label: "Platform settings" },
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
      </section>
    </div>
  );
}
