"use client";

import * as React from "react";
import { Bell, Globe, Mail, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-components";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useAuth } from "@/lib/auth/auth-context";
import { useNotificationPrefs } from "@/lib/hooks/use-notification-prefs";

export default function StudentSettingsPage() {
  const { session } = useAuth();
  const { prefs, loading, error, updatePref, savingKey } = useNotificationPrefs();

  const notifItems: {
    key: keyof typeof prefs;
    label: string;
    desc: string;
  }[] = [
    { key: "email_enabled", label: "Email notifications", desc: "Booking updates, payment confirmations" },
    { key: "sms_enabled", label: "SMS notifications", desc: "Critical alerts only (may incur charges)" },
    { key: "push_enabled", label: "Push notifications", desc: "Real-time alerts in your browser" },
    { key: "urgent_alerts", label: "Urgent alerts", desc: "Booking expirations, payment failures" },
    { key: "daily_digest", label: "Daily digest", desc: "A summary of your activity each day" },
  ];

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
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>Could not load preferences: {error}</span>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : (
            notifItems.map((n) => (
              <div key={n.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
                <Switch
                  checked={prefs[n.key]}
                  onCheckedChange={(v) => updatePref(n.key, v)}
                  disabled={savingKey === n.key}
                  aria-label={n.label}
                />
              </div>
            ))
          )}
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
