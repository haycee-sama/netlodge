"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { IntegrationStatusBadge } from "@/components/shared/status-badges";
import { integrationHealth } from "@/lib/data/admin-fixtures";
import { formatRelativeTime } from "@/lib/utils/format";
import { Activity, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export default function AdminSystemHealthPage() {
  const operational = integrationHealth.filter((i) => i.status === "operational").length;
  const degraded = integrationHealth.filter((i) => i.status === "degraded").length;
  const outage = integrationHealth.filter((i) => i.status === "outage").length;

  const overallStatus = outage > 0 ? "outage" : degraded > 0 ? "degraded" : "operational";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        eyebrow="Trust & system"
        title="System health"
        description="Real-time status of all platform integrations and services."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "System health" }]}
      />
      <DemoModeBanner message="Integration status is fixture-based in demo mode. In production, this page polls a health-check endpoint every 30 seconds." />

      <Card className={overallStatus === "operational" ? "border-success/30 bg-success/5" : overallStatus === "degraded" ? "border-warning/30 bg-warning/5" : "border-destructive/30 bg-destructive/5"}>
        <CardContent className="flex items-center gap-4 p-6">
          {overallStatus === "operational" ? <CheckCircle2 className="h-10 w-10 text-success" aria-hidden /> : overallStatus === "degraded" ? <AlertTriangle className="h-10 w-10 text-warning-foreground" aria-hidden /> : <XCircle className="h-10 w-10 text-destructive" aria-hidden />}
          <div>
            <p className="font-display text-xl font-bold capitalize">{overallStatus}</p>
            <p className="text-sm text-muted-foreground">
              {operational} operational · {degraded} degraded · {outage} in outage
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {integrationHealth.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <Activity className={`h-4 w-4 ${i.status === "operational" ? "text-success" : i.status === "degraded" ? "text-warning-foreground" : "text-destructive"}`} aria-hidden />
                  <div>
                    <p className="text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.category} · {i.uptime24h}% uptime · {i.avgResponseMs}ms avg response</p>
                    {i.lastSuccessAt && <p className="text-xs text-muted-foreground">Last success: {formatRelativeTime(i.lastSuccessAt)}</p>}
                    {i.lastError && <p className="text-xs text-destructive">Last error: {i.lastError} ({i.lastErrorAt ? formatRelativeTime(i.lastErrorAt) : "—"})</p>}
                  </div>
                </div>
                <IntegrationStatusBadge status={i.status} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
