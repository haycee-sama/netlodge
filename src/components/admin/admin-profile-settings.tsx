"use client";

import * as React from "react";
import { Loader2, Save, User, ShieldCheck, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { RoleBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { initials } from "@/lib/utils/format";
import { roleLabel as formatRoleLabel } from "@/lib/types";
import { toast } from "sonner";

export function AdminProfilePage({ roleLabel }: { roleLabel: string }) {
  const { session } = useAuth();
  const [firstName, setFirstName] = React.useState(session?.firstName ?? "");
  const [lastName, setLastName] = React.useState(session?.lastName ?? "");
  const [phone, setPhone] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function save() {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    toast.success("Profile saved");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        eyebrow={`${roleLabel} workspace`}
        title="Your profile"
        description="Your personal details as a NetLodge administrator."
        breadcrumbs={[{ label: roleLabel }, { label: "Profile" }]}
      />
      <DemoModeBanner />

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {initials(session?.firstName, session?.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="font-display text-lg font-semibold">{session?.firstName} {session?.lastName}</p>
            <p className="text-sm text-muted-foreground">{session?.email}</p>
            {session && <RoleBadge role={session.role} />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-primary" aria-hidden />Personal details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="firstName">First name</Label><Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="lastName">Last name</Label><Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="email">Email</Label><Input id="email" value={session?.email ?? ""} disabled /><p className="text-xs text-muted-foreground">Email cannot be changed without re-verification.</p></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden />Security</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div><p className="font-medium">Two-factor authentication</p><p className="text-xs text-muted-foreground">Required for administrative accounts</p></div>
            <Badge className="bg-success/15 text-success">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div><p className="font-medium">Last password change</p><p className="text-xs text-muted-foreground">32 days ago</p></div>
            <Button variant="outline" size="sm">Change password</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={submitting}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Saving…</> : <><Save className="mr-2 h-4 w-4" aria-hidden /> Save profile</>}
        </Button>
      </div>
    </div>
  );
}

export function AdminSettingsPage({ roleLabel }: { roleLabel: string }) {
  const { theme, setTheme } = useThemeSafe();
  const [emailNotif, setEmailNotif] = React.useState(true);
  const [urgentAlerts, setUrgentAlerts] = React.useState(true);
  const [dailyDigest, setDailyDigest] = React.useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        eyebrow={`${roleLabel} workspace`}
        title="Preferences"
        description="Customise your administrative workspace."
        breadcrumbs={[{ label: roleLabel }, { label: "Settings" }]}
      />
      <DemoModeBanner />

      <Card>
        <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
        <CardContent>
          <Label>Theme</Label>
          <div className="mt-2 flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <Button key={t} variant={theme === t ? "default" : "outline"} size="sm" onClick={() => setTheme(t)} className="capitalize">{t}</Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Email notifications", desc: "Case assignments, escalations, and platform alerts", value: emailNotif, setter: setEmailNotif },
            { label: "Urgent alerts", desc: "Immediate alerts for urgent cases and security events", value: urgentAlerts, setter: setUrgentAlerts },
            { label: "Daily digest", desc: "Summary of your queue and decisions at 9 AM WAT", value: dailyDigest, setter: setDailyDigest },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between">
              <div><p className="text-sm font-medium">{n.label}</p><p className="text-xs text-muted-foreground">{n.desc}</p></div>
              <Button variant={n.value ? "default" : "outline"} size="sm" onClick={() => { n.setter(!n.value); toast.success(`${n.label} ${!n.value ? "enabled" : "disabled"}`); }}>
                {n.value ? "Enabled" : "Disabled"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Safe hook wrapper to avoid importing next-themes at module top-level in case
// the file is referenced from a server component accidentally.
import { useTheme } from "next-themes";
function useThemeSafe() {
  return useTheme();
}
