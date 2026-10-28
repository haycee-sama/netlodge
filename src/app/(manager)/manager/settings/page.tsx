"use client";

import * as React from "react";
import { Bell, Moon, Sun, Monitor, Globe, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/shared/page-components";
import { toast } from "sonner";

export default function ManagerSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [emailNotif, setEmailNotif] = React.useState(true);
  const [bookingAlerts, setBookingAlerts] = React.useState(true);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Settings" title="Preferences" />
      <Card>
        <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
        <CardContent>
          <Label>Theme</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[{ value: "light", icon: Sun, label: "Light" }, { value: "dark", icon: Moon, label: "Dark" }, { value: "system", icon: Monitor, label: "System" }].map((opt) => (
              <button key={opt.value} onClick={() => setTheme(opt.value)} className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition-colors ${theme === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}>
                <opt.icon className="h-4 w-4" aria-hidden />{opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-primary" aria-hidden />Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[{ label: "Email notifications", desc: "Booking & inspection updates", value: emailNotif, setter: setEmailNotif }, { label: "Booking alerts", desc: "New bookings & holds", value: bookingAlerts, setter: setBookingAlerts }].map((n) => (
            <div key={n.label} className="flex items-center justify-between">
              <div><p className="text-sm font-medium">{n.label}</p><p className="text-xs text-muted-foreground">{n.desc}</p></div>
              <Switch checked={n.value} onCheckedChange={(v) => { n.setter(v); toast.success(`${n.label} ${v ? "enabled" : "disabled"}`); }} aria-label={n.label} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4 text-primary" aria-hidden />Locale</CardTitle></CardHeader>
        <CardContent>
          <Select defaultValue="en"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="en">English (Nigeria)</SelectItem>
            <SelectItem value="ig">Igbo</SelectItem>
            <SelectItem value="yo">Yoruba</SelectItem>
            <SelectItem value="ha">Hausa</SelectItem>
          </SelectContent></Select>
        </CardContent>
      </Card>
    </div>
  );
}
