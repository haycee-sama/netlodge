"use client";

import * as React from "react";
import { Bell, Globe, Moon, Sun, Monitor, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/shared/page-components";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useI18n } from "@/lib/i18n/context";
import { useNotificationPrefs } from "@/lib/hooks/use-notification-prefs";

export default function LandlordSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const { prefs, loading, error, updatePref, savingKey } = useNotificationPrefs();

  const notifItems: {
    key: keyof typeof prefs;
    label: string;
    desc: string;
  }[] = [
    { key: "email_enabled", label: t("common.settings.notif.emailLabel"), desc: t("landlord.settings.notif.emailDesc") },
    { key: "push_enabled", label: t("common.settings.notif.pushLabel"), desc: t("landlord.settings.notif.pushDesc") },
    { key: "urgent_alerts", label: t("common.settings.notif.urgentLabel"), desc: t("common.settings.notif.urgentDesc") },
    { key: "sms_enabled", label: t("common.settings.notif.smsLabel"), desc: t("common.settings.notif.smsDesc") },
    { key: "daily_digest", label: t("common.settings.notif.digestLabel"), desc: t("landlord.settings.notif.digestDesc") },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow={t("common.settings.eyebrow")} title={t("common.settings.title")} description={t("landlord.settings.description")} />

      <Card>
        <CardHeader><CardTitle className="text-base">{t("common.settings.appearance")}</CardTitle></CardHeader>
        <CardContent>
          <Label>{t("common.settings.colourTheme")}</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { value: "light", icon: Sun, label: t("landlord.settings.light") },
              { value: "dark", icon: Moon, label: t("landlord.settings.dark") },
              { value: "system", icon: Monitor, label: t("landlord.settings.system") },
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
            {t("common.settings.notifications")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{t("common.settings.couldNotLoadPrefs", { error })}</span>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" aria-hidden />
            {t("common.settings.locale")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("common.settings.language")}</Label>
            <LanguageSwitcher />
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.settings.currency")}</Label>
            <Select defaultValue="ngn">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ngn">{t("common.settings.currencyNgn")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
