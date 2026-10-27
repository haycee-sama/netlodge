"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { getRepositories } from "@/lib/repositories";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import { ShieldCheck, AlertTriangle, Lock, KeyRound, Activity } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";

export default function AdminSecurityPage() {
  const [criticalLogs, setCriticalLogs] = React.useState<Awaited<ReturnType<typeof getRepositories>["auditLogs"]["list"]>["items"]>([]);
  const [suspendedUsers, setSuspendedUsers] = React.useState(allUsers.filter((u) => !u.active));

  React.useEffect(() => {
    getRepositories().auditLogs.list({ severity: "critical", pageSize: 20 }).then((r) => setCriticalLogs(r.items));
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        eyebrow="Trust & system"
        title="Security center"
        description="Monitor security events, failed authorization attempts, and account suspensions."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Security" }]}
      />
      <DemoModeBanner />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-5">
          <ShieldCheck className="h-8 w-8 text-success" aria-hidden />
          <div><p className="text-2xl font-bold">2FA</p><p className="text-xs text-muted-foreground">Required for admins</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5">
          <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
          <div><p className="text-2xl font-bold">{criticalLogs.length}</p><p className="text-xs text-muted-foreground">Critical events</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5">
          <Lock className="h-8 w-8 text-warning-foreground" aria-hidden />
          <div><p className="text-2xl font-bold">{suspendedUsers.length}</p><p className="text-xs text-muted-foreground">Suspended accounts</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" aria-hidden /> Critical security events</CardTitle></CardHeader>
        <CardContent className="p-0">
          {criticalLogs.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No critical security events.</p>
          ) : (
            <ul className="divide-y divide-border">
              {criticalLogs.map((log) => (
                <li key={log.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{log.summary}</p>
                      <p className="text-xs text-muted-foreground">{log.actorEmail} · {log.action} · {formatRelativeTime(log.timestamp)}</p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{log.category.replace(/_/g, " ")}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lock className="h-4 w-4 text-warning-foreground" aria-hidden /> Suspended accounts</CardTitle></CardHeader>
        <CardContent className="p-0">
          {suspendedUsers.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No suspended accounts.</p>
          ) : (
            <ul className="divide-y divide-border">
              {suspendedUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{u.firstName} {u.lastName} · {u.email}</p>
                    <p className="text-xs text-muted-foreground">Suspended {u.deactivatedAt ? formatRelativeTime(u.deactivatedAt) : "—"} — {u.statusReason}</p>
                  </div>
                  <Button asChild variant="ghost" size="sm"><a href={`/admin/users/${u.id}`}>Manage</a></Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-info/30 bg-info/5">
        <CardContent className="flex items-start gap-2 p-4 text-sm">
          <KeyRound className="mt-0.5 h-4 w-4 text-info" aria-hidden />
          <div>
            <p className="font-medium">Security policies</p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              <li>· Two-factor authentication is required for all administrative accounts.</li>
              <li>· Sensitive actions (role changes, suspensions, payout approvals, commission changes) require reauthentication.</li>
              <li>· Payouts at or above ₦1,000,000 require dual approval from two finance admins.</li>
              <li>· The last active super administrator cannot be demoted or suspended.</li>
              <li>· Audit logs are append-only — no role has UPDATE or DELETE permissions.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
