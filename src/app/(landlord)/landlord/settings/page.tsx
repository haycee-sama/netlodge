"use client";

import * as React from "react";
import { Bell, Globe, Moon, Sun, Monitor, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/shared/page-components";
import { toast } from "sonner";

export default function LandlordSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [emailNotif, setEmailNotif] = React.useState(true);
  const [bookingAlerts, setBookingAlerts] = React.useState(true);
  const [payoutAlerts, setPayoutAlerts] = React.useState(true);
  const [marketing, setMarketing] = React.useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Settings" title="Preferences" description="Customise your NetLodge experience." />

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
          {[
            { label: "Email notifications", desc: "Booking updates & payout settlements", value: emailNotif, setter: setEmailNotif },
            { label: "Booking alerts", desc: "Instant alerts for new bookings & holds", value: bookingAlerts, setter: setBookingAlerts },
            { label: "Payout alerts", desc: "When payouts are settled to your account", value: payoutAlerts, setter: setPayoutAlerts },
            { label: "Marketing communications", desc: "New features & promotional offers", value: marketing, setter: setMarketing },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between">
              <div><p className="text-sm font-medium">{n.label}</p><p className="text-xs text-muted-foreground">{n.desc}</p></div>
              <Switch checked={n.value} onCheckedChange={(v) => { n.setter(v); toast.success(`${n.label} ${v ? "enabled" : "disabled"}`); }} aria-label={n.label} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4 text-primary" aria-hidden />Locale</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Language</Label>
            <Select defaultValue="en"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="en">English (Nigeria)</SelectItem>
              <SelectItem value="ig">Igbo</SelectItem>
              <SelectItem value="yo">Yoruba</SelectItem>
              <SelectItem value="ha">Hausa</SelectItem>
            </SelectContent></Select>
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select defaultValue="ngn"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="ngn">Nigerian Naira (₦)</SelectItem>
            </SelectContent></Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-start gap-2 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Preferences are saved to local storage in demo mode.</span>
        </CardContent>
      </Card>
    </div>
  );
}
