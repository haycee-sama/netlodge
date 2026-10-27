"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { IntegrationStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { integrationHealth } from "@/lib/data/admin-fixtures";
import type { IntegrationHealth } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";
import { Loader2, Power, PowerOff } from "lucide-react";

export default function AdminIntegrationsPage() {
  const { session } = useAuth();
  const [integrations, setIntegrations] = React.useState<IntegrationHealth[]>(integrationHealth);
  const [toggleTarget, setToggleTarget] = React.useState<IntegrationHealth | null>(null);
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const actorId = session?.userId ?? "dev_super_admin_1";

  async function handleToggle() {
    if (!toggleTarget) return;
    if (!reason.trim()) { toast.error("A reason is required"); return; }
    setSubmitting(true);
    try {
      await getRepositories().integrationHealth.toggle(toggleTarget.id, { actorId, enabled: !toggleTarget.enabled, reason });
      toast.success(`${toggleTarget.name} ${toggleTarget.enabled ? "disabled" : "enabled"}`);
      setIntegrations((arr) => arr.map((i) => i.id === toggleTarget.id ? { ...i, enabled: !i.enabled } : i));
      setToggleTarget(null); setReason("");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        eyebrow="Trust & system"
        title="Integrations"
        description="Monitor and manage external service integrations. Disabling an integration is a high-severity action."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Integrations" }]}
      />
      <DemoModeBanner />

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {integrations.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${i.status === "operational" ? "bg-success/10 text-success" : i.status === "degraded" ? "bg-warning/10 text-warning-foreground" : i.status === "outage" ? "bg-destructive/10 text-destructive" : "bg-info/10 text-info"}`}>
                    {i.status === "operational" ? <Power className="h-4 w-4" aria-hidden /> : <PowerOff className="h-4 w-4" aria-hidden />}
                  </div>
                  <div>
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.category} · {i.uptime24h}% uptime · {i.avgResponseMs}ms avg</p>
                    {i.lastError && <p className="text-xs text-destructive">Last error: {i.lastError} ({i.lastErrorAt ? formatRelativeTime(i.lastErrorAt) : "—"})</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IntegrationStatusBadge status={i.status} />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => { setToggleTarget(i); setReason(""); }}>
                        {i.enabled ? "Disable" : "Enable"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{i.enabled ? "Disable" : "Enable"} {i.name}?</DialogTitle>
                        <DialogDescription>
                          {i.enabled
                            ? "Disabling an integration will interrupt all dependent workflows. This action is audit-logged as critical. A reason is required."
                            : "Enabling an integration will resume all dependent workflows."}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-1.5">
                        <Label htmlFor="reason">Reason (required)</Label>
                        <Textarea id="reason" rows={3} placeholder="e.g. Scheduled maintenance, security incident, etc." value={reason} onChange={(e) => setReason(e.target.value)} />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setToggleTarget(null)}>Cancel</Button>
                        <Button onClick={handleToggle} disabled={submitting || !reason.trim()}>
                          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                          Confirm {i.enabled ? "disable" : "enable"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
