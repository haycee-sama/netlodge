"use client";

import * as React from "react";
import { Bell, Globe, Mail, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-components";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { useNotificationPrefs } from "@/lib/hooks/use-notification-prefs";

export default function StudentSettingsPage() {
  const { session } = useAuth();
  const { t } = useI18n();
  const { prefs, loading, error, updatePref, savingKey } = useNotificationPrefs();

  const notifItems: {
    key: keyof typeof prefs;
    label: string;
    desc: string;
  }[] = [
    { key: "email_enabled", label: t("common.settings.notif.emailLabel"), desc: t("common.settings.notif.emailDesc") },
    { key: "sms_enabled", label: t("common.settings.notif.smsLabel"), desc: t("common.settings.notif.smsDesc") },
    { key: "push_enabled", label: t("common.settings.notif.pushLabel"), desc: t("common.settings.notif.pushDesc") },
    { key: "urgent_alerts", label: t("common.settings.notif.urgentLabel"), desc: t("common.settings.notif.urgentDesc") },
    { key: "daily_digest", label: t("common.settings.notif.digestLabel"), desc: t("common.settings.notif.digestDesc") },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={t("common.settings.eyebrow")}
        title={t("common.settings.title")}
        description={t("common.settings.description")}
      />

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("common.settings.appearance")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>{t("common.settings.colourTheme")}</Label>
          <p className="text-xs text-muted-foreground">{t("common.settings.colourThemeDesc")}</p>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Notifications */}
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

      {/* Locale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" aria-hidden />
            {t("common.settings.locale")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="language">{t("common.settings.language")}</Label>
            <LanguageSwitcher />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">{t("common.settings.currency")}</Label>
            <Select defaultValue="ngn">
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ngn">{t("common.settings.currencyNgn")}</SelectItem>
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
            {t("common.settings.account")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("common.profile.email")}</span>
            <span>{session?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("common.settings.role")}</span>
            <span className="capitalize">{session?.role}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
