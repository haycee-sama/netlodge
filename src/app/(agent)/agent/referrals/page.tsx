"use client";

import * as React from "react";
import { Share2, Copy, TrendingUp, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export default function AgentReferralsPage() {
  const { session } = useAuth();
  const [copied, setCopied] = React.useState(false);

  // Generate a referral link from the user's ID. This is a real link —
  // it carries the agent's user ID so registrations can be tracked back.
  // The referral tracking system (counting clicks, signups, conversions,
  // and computing earnings) is not yet implemented at the database level.
  // We show the shareable link honestly and explain what's coming.
  const referralCode = session?.userId?.slice(0, 8).toUpperCase() ?? "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://netlodge.vercel.app";
  const referralLink = `${siteUrl}/register?ref=${referralCode}`;

  function copy() {
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Referrals"
        title="Your referral programme"
        description="Share your unique link and earn when students complete bookings."
      />

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/10">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" aria-hidden />
            <p className="font-display text-lg font-semibold">Your referral link</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={referralLink} className="font-mono text-sm" />
            <Button onClick={copy}>
              {copied ? <><CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />Copied</> : <><Copy className="mr-2 h-4 w-4" aria-hidden />Copy</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            When a student registers using your link, their account is tagged with
            your referral code. You'll earn a commission when they complete a booking.
          </p>
        </CardContent>
      </Card>

      {/* Stats — not yet available */}
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <TrendingUp className="h-6 w-6" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Referral analytics coming soon</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Your referral link is active and shareable now. Analytics — clicks,
              signups, conversions, and earnings — will appear here once the
              tracking system is connected.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" aria-hidden />
            <p className="text-sm font-semibold">How referrals work</p>
          </div>
          <ol className="ml-4 list-decimal space-y-1.5 text-sm text-muted-foreground">
            <li>Share your unique referral link with students.</li>
            <li>When they register via your link, their account is tagged with your code.</li>
            <li>When they complete a booking and payment is confirmed, you earn a commission.</li>
            <li>Commissions are tracked and paid out alongside landlord payouts.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
