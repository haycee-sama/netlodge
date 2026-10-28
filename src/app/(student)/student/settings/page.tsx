"use client";

import * as React from "react";
import { Bell, Globe, Mail, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-components";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export default function StudentSettingsPage() {
  const { session } = useAuth();
  const [emailNotif, setEmailNotif] = React.useState(true);
  const [smsNotif, setSmsNotif] = React.useState(false);
  const [marketing, setMarketing] = React.useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Preferences"
        description="Customise your NetLodge experience — appearance, notifications and locale."
      />

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Colour theme</Label>
          <p className="text-xs text-muted-foreground">Choose Light, Dark, or follow your system preference.</p>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" aria-hidden />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Email notifications", desc: "Booking updates, payment confirmations", value: emailNotif, setter: setEmailNotif },
            { label: "SMS notifications", desc: "Critical alerts only", value: smsNotif, setter: setSmsNotif },
            { label: "Marketing communications", desc: "New campuses, special offers", value: marketing, setter: setMarketing },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <Switch
                checked={n.value}
                onCheckedChange={(v) => {
                  n.setter(v);
                  toast.success(`${n.label} ${v ? "enabled" : "disabled"}`);
                }}
                aria-label={n.label}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Locale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" aria-hidden />
            Locale
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="language">Language</Label>
            <Select defaultValue="en">
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English (Nigeria)</SelectItem>
                <SelectItem value="ig">Igbo</SelectItem>
                <SelectItem value="yo">Yoruba</SelectItem>
                <SelectItem value="ha">Hausa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Select defaultValue="ngn">
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ngn">Nigerian Naira (₦)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" aria-hidden />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{session?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="capitalize">{session?.role}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
