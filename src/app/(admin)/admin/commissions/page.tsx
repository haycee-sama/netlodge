"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import type { PlatformSetting } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";
import { Loader2, Save, ShieldCheck } from "lucide-react";

export default function AdminCommissionsPage() {
  const { session } = useAuth();
  const [settings, setSettings] = React.useState<PlatformSetting[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [values, setValues] = React.useState<Record<string, string>>({});

  const actorId = session?.userId ?? "dev_super_admin_1";

  React.useEffect(() => {
    getRepositories().platformSettings.listByCategory("commission").then((s) => {
      setSettings(s);
      const v: Record<string, string> = {};
      s.forEach((x) => { v[x.key] = x.value; });
      setValues(v);
      setLoading(false);
    });
  }, []);

  async function save(key: string) {
    setSaving(key);
    try {
      await getRepositories().platformSettings.update(key, { actorId, value: values[key] });
      toast.success("Setting updated", { description: `${key} saved. Audit entry recorded.` });
    } catch (e) {
      toast.error("Could not save", { description: e instanceof Error ? e.message : "Please try again." });
    } finally { setSaving(null); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        eyebrow="Configuration"
        title="Commission & booking policies"
        description="Commission rates, service fees, and booking hold durations. Changes to these settings affect all new bookings."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Commissions" }]}
      />
      <DemoModeBanner message="Commission changes require reauthentication in production. Each change is audit-logged with before/after values." />

      {loading ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-5">
            {settings.map((s) => (
              <div key={s.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">{s.label}</Label>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                  {s.requiresReauth && (
                    <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">
                      <ShieldCheck className="mr-1 h-3 w-3" aria-hidden /> Reauth required
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type={s.type === "number" || s.type === "percentage" ? "number" : "text"}
                    value={values[s.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                    className="flex-1"
                  />
                  {s.unit && <span className="text-xs text-muted-foreground">{s.unit}</span>}
                  <Button size="sm" onClick={() => save(s.key)} disabled={saving === s.key}>
                    {saving === s.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" aria-hidden />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground/70">Last updated {formatRelativeTime(s.updatedAt)}</p>
                <Separator />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
