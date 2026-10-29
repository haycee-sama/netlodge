"use client";

import * as React from "react";
import { Bell, Moon, Sun, Monitor, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/shared/page-components";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useNotificationPrefs } from "@/lib/hooks/use-notification-prefs";

export default function ManagerSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { prefs, loading, error, updatePref, savingKey } = useNotificationPrefs();

  const notifItems: {
    key: keyof typeof prefs;
    label: string;
    desc: string;
  }[] = [
    { key: "email_enabled", label: "Email notifications", desc: "Booking & inspection updates" },
    { key: "push_enabled", label: "Push notifications", desc: "New bookings & holds alerts" },
    { key: "urgent_alerts", label: "Urgent alerts", desc: "Booking expirations, maintenance issues" },
    { key: "daily_digest", label: "Daily digest", desc: "A summary of your properties each day" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Settings" title="Preferences" />

      <Card>
        <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
        <CardContent>
          <Label>Theme</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { value: "light", icon: Sun, label: "Light" },
              { value: "dark", icon: Moon, label: "Dark" },
              { value: "system", icon: Monitor, label: "System" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition-colors ${theme === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}
              >
                <opt.icon className="h-4 w-4" aria-hidden />{opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader><CardTitle className="text-base">Locale</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Language</Label>
            <LanguageSwitcher />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <span className="text-sm text-muted-foreground">Nigerian Naira (₦)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
