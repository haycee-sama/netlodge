"use client";

import * as React from "react";
import { Wallet, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { PayoutStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatNgn, formatDateTime } from "@/lib/utils/format";

interface Payout {
  id: string;
  reference: string;
  gross_kobo: number;
  platform_fee_kobo: number;
  net_kobo: number;
  status: string;
  settled_at: string | null;
  scheduled_for: string;
  bank_account_masked: string;
  created_at: string;
}

export default function LandlordPayoutsPage() {
  const { session } = useAuth();
  const [payouts, setPayouts] = React.useState<Payout[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from("payouts")
      .select("*")
      .eq("landlord_id", session!.userId)
      .order("scheduled_for", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setPayouts((data as Payout[]) ?? []);
        setLoading(false);
      });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader eyebrow="Finances" title="Payouts" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real landlord account to view payouts.
        </CardContent></Card>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const totalSettled = payouts.filter((p) => p.status === "settled").reduce((s, p) => s + p.net_kobo, 0);
  const totalPending = payouts.filter((p) => ["scheduled", "in_flight"].includes(p.status)).reduce((s, p) => s + p.net_kobo, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="Finances" title="Payouts" description="Your settlement history and upcoming payouts." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardContent className="space-y-1 p-5"><p className="text-xs text-muted-foreground">Settled (total)</p><p className="font-display text-2xl font-bold text-success">{formatNgn(totalSettled)}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 p-5"><p className="text-xs text-muted-foreground">Pending</p><p className="font-display text-2xl font-bold">{formatNgn(totalPending)}</p></CardContent></Card>
      </div>
      {error ? (
        <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card>
      ) : payouts.length === 0 ? (
        <EmptyState icon={<Wallet className="h-5 w-5" aria-hidden />} title="No payouts yet" description="Payouts will appear here after bookings are confirmed and settled." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {payouts.map((p) => (
                <li key={p.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{p.reference}</p>
                      <PayoutStatusBadge status={p.status as any} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Bank {p.bank_account_masked} · Scheduled {formatDateTime(p.scheduled_for)}
                      {p.settled_at && ` · Settled ${formatDateTime(p.settled_at)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatNgn(p.net_kobo)}</p>
                    <p className="text-xs text-muted-foreground">gross {formatNgn(p.gross_kobo)} · fee {formatNgn(p.platform_fee_kobo)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
