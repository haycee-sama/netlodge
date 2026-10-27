"use client";

import * as React from "react";
import { Share2, Copy, TrendingUp, MousePointerClick, UserPlus, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn } from "@/lib/utils/format";
import { toast } from "sonner";

interface Referral { code: string; clicks: number; signups: number; conversions: number; earningsKobo: number; }

export default function AgentReferralsPage() {
  const { session } = useAuth();
  const [referral] = React.useState<Referral>({
    code: "ADA-EZ-2024",
    clicks: 142,
    signups: 23,
    conversions: 5,
    earningsKobo: 2500000,
  });
  const [copied, setCopied] = React.useState(false);
  const link = `https://netlodge.example/r/${referral.code}`;

  function copy() {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow="Referrals" title="Your referral programme" description="Share your unique link and earn when students complete bookings." />

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/10">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" aria-hidden />
            <p className="font-display text-lg font-semibold">Your referral link</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={link} className="font-mono text-sm" />
            <Button onClick={copy}>{copied ? <><CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />Copied</> : <><Copy className="mr-2 h-4 w-4" aria-hidden />Copy</>}</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this link with prospective students. You earn ₦5,000 for every student who completes a booking using your link.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total clicks" value={referral.clicks} icon={<MousePointerClick className="h-4 w-4" aria-hidden />} />
        <StatCard label="Signups" value={referral.signups} hint={`${Math.round((referral.signups / referral.clicks) * 100)}% conversion`} icon={<UserPlus className="h-4 w-4" aria-hidden />} />
        <StatCard label="Completed bookings" value={referral.conversions} icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} />
        <StatCard label="Earnings" value={formatNgn(referral.earningsKobo)} icon={<TrendingUp className="h-4 w-4" aria-hidden />} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">How it works</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span><div><p className="font-medium">Share your link</p><p className="text-muted-foreground">Post it on WhatsApp, Telegram, or send directly to prospective students.</p></div></li>
            <li className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span><div><p className="font-medium">Student signs up</p><p className="text-muted-foreground">When they register via your link, they're tagged as your referral.</p></div></li>
            <li className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span><div><p className="font-medium">They complete a booking</p><p className="text-muted-foreground">Once their booking is confirmed by the backend, your referral earns.</p></div></li>
            <li className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">4</span><div><p className="font-medium">You get paid</p><p className="text-muted-foreground">Earnings are settled to your bank account alongside agent payouts.</p></div></li>
          </ol>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Note:</strong> Referral earnings are only credited after the backend confirms a booking's payment. The browser cannot grant referral credit.
        </CardContent>
      </Card>
    </div>
  );
}
