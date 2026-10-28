"use client";

import * as React from "react";
import { BarChart3, Loader2, Users, Building2, CalendarCheck, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn } from "@/lib/utils/format";

export default function AdminReportsPage() {
  const { session } = useAuth();
  const [metrics, setMetrics] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    fetch("/api/admin/metrics", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { setMetrics(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isSupabaseAuth]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Reports" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Platform oversight" title="Reports" description="Cross-platform metrics from live database records." breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Reports" }]} />
      {metrics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries({ student: "Students", landlord: "Landlords", property_manager: "Managers", agent: "Agents", verification_officer: "VOs", support_staff: "Support", finance_admin: "Finance", super_admin: "Super Admins" }).map(([role, label]) => (
              <Card key={role}><CardContent className="space-y-1 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{metrics.users?.[role] ?? 0}</p></CardContent></Card>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="space-y-1 p-5"><div className="flex items-center gap-2"><Building2 className="h-4 w-4" /><p className="text-xs text-muted-foreground">Properties</p></div><p className="text-2xl font-bold">{metrics.properties?.total ?? 0}</p></CardContent></Card>
            <Card><CardContent className="space-y-1 p-5"><div className="flex items-center gap-2"><CalendarCheck className="h-4 w-4" /><p className="text-xs text-muted-foreground">Bookings</p></div><p className="text-2xl font-bold">{metrics.bookings?.total ?? 0}</p></CardContent></Card>
            <Card><CardContent className="space-y-1 p-5"><div className="flex items-center gap-2"><Wallet className="h-4 w-4" /><p className="text-xs text-muted-foreground">Payments received</p></div><p className="text-2xl font-bold">{formatNgn(metrics.payments?.total_kobo ?? 0)}</p></CardContent></Card>
          </div>
        </>
      ) : <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Could not load metrics.</CardContent></Card>}
    </div>
  );
}
