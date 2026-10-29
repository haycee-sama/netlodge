"use client";

import * as React from "react";
import { Share2, Copy, TrendingUp, MousePointerClick, UserPlus, CheckCircle2, Wallet, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn, formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";

interface ReferralStats {
  referralCode: string;
  clicks: number;
  signups: number;
  booked: number;
  completed: number;
  totalEarnings: number;
  pendingEarnings: number;
  recentReferrals: {
    id: string;
    status: string;
    commission_kobo: number;
    commission_paid: boolean;
    signed_up_at: string;
    first_booking_at: string | null;
    completed_at: string | null;
    referred_user_id: string;
  }[];
}

export default function AgentReferralsPage() {
  const { session } = useAuth();
  const [stats, setStats] = React.useState<ReferralStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!session?.userId) { setLoading(false); return; }
    fetch("/api/agent/referrals")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setStats(data);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load referral stats");
        setLoading(false);
      });
  }, [session?.userId]);

  const referralCode = stats?.referralCode ?? session?.userId?.slice(0, 8).toUpperCase() ?? "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://netlodge.vercel.app";
  const referralLink = `${siteUrl}/register?ref=${referralCode}`;

  function copy() {
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader eyebrow="Referrals" title="Your referral programme" />
        <EmptyState
          icon={<AlertCircle className="h-5 w-5" aria-hidden />}
          title="Could not load referral stats"
          description={error}
          action={<Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Referrals"
        title="Your referral programme"
        description="Share your unique link and earn when students complete bookings."
      />

      {/* Referral link card */}
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
            your referral code. You earn a commission when they complete a booking.
          </p>
        </CardContent>
      </Card>

      {/* Real stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Link clicks"
          value={stats?.clicks ?? 0}
          icon={<MousePointerClick className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label="Signups"
          value={stats?.signups ?? 0}
          icon={<UserPlus className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label="Booked"
          value={stats?.booked ?? 0}
          icon={<TrendingUp className="h-4 w-4" aria-hidden />}
          hint={stats && stats.booked > 0 ? `${stats.completed} completed` : undefined}
        />
        <StatCard
          label="Earnings"
          value={formatNgn(stats?.totalEarnings ?? 0)}
          icon={<Wallet className="h-4 w-4" aria-hidden />}
          hint={stats && stats.pendingEarnings > 0 ? `${formatNgn(stats.pendingEarnings)} pending` : undefined}
        />
      </div>

      {/* Recent referrals */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Recent referrals</h2>
        {!stats?.recentReferrals || stats.recentReferrals.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="h-5 w-5" aria-hidden />}
            title="No referrals yet"
            description="Share your referral link with students to start earning."
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {stats.recentReferrals.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {r.referred_user_id.slice(0, 8)}…
                        </p>
                        <Badge
                          variant={r.status === "completed" ? "default" : r.status === "booked" ? "outline" : "secondary"}
                          className="capitalize text-xs"
                        >
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Signed up {formatRelativeTime(r.signed_up_at)}
                        {r.first_booking_at && ` · First booking ${formatRelativeTime(r.first_booking_at)}`}
                      </p>
                    </div>
                    {r.commission_kobo > 0 && (
                      <div className="text-right">
                        <p className={`text-sm font-medium ${r.commission_paid ? "text-success" : "text-muted-foreground"}`}>
                          {formatNgn(r.commission_kobo)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.commission_paid ? "Paid" : "Pending"}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {/* How it works */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold">How referrals work</p>
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
