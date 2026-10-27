"use client";

import * as React from "react";
import { Banknote, Building, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageHeader, EmptyState, StatCard } from "@/components/shared/page-components";
import { PayoutStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import type { Payout } from "@/lib/types";
import { formatNgn, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

export default function LandlordPayoutsPage() {
  const { session } = useAuth();
  const [payouts, setPayouts] = React.useState<Payout[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [bankName, setBankName] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [accountName, setAccountName] = React.useState("");

  React.useEffect(() => {
    if (!session) return;
    getRepositories().payouts.listByLandlord(session.userId || "dev_landlord_1").then((p) => {
      setPayouts(p);
      setLoading(false);
    });
  }, [session]);

  const settled = payouts.filter((p) => p.status === "settled");
  const pending = payouts.filter((p) => p.status !== "settled" && p.status !== "failed");
  const totalSettled = settled.reduce((s, p) => s + p.netKobo, 0);
  const totalPending = pending.reduce((s, p) => s + p.netKobo, 0);

  function saveBankAccount() {
    if (!bankName || !accountNumber || !accountName) {
      toast.error("Fill in all bank details");
      return;
    }
    toast.success("Bank account saved", { description: "Payouts will be sent to this account." });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Finances"
        title="Payouts"
        description="Track every payout from confirmed bookings. Payouts are settled only after the backend reconciles each transaction."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total settled" value={formatNgn(totalSettled)} icon={<Banknote className="h-4 w-4" aria-hidden />} />
        <StatCard label="Pending" value={formatNgn(totalPending)} icon={<AlertCircle className="h-4 w-4" aria-hidden />} />
        <StatCard label="Settled count" value={settled.length} hint={`of ${payouts.length} total`} />
      </div>

      {/* Bank account */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building className="h-4 w-4 text-primary" aria-hidden />Payout account</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-1.5"><Label htmlFor="bankName">Bank</Label><Input id="bankName" placeholder="GTBank" value={bankName} onChange={(e) => setBankName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="accountNumber">Account number</Label><Input id="accountNumber" placeholder="0123456789" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="accountName">Account name</Label><Input id="accountName" placeholder="Adaeze Okonkwo" value={accountName} onChange={(e) => setAccountName(e.target.value)} /></div>
          <div className="sm:col-span-4 flex justify-end">
            <Button onClick={saveBankAccount}>Save account</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-warning/30 bg-warning/10">
        <CardContent className="flex items-start gap-2 p-3 text-xs text-warning-foreground">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span><strong className="text-foreground">Important:</strong> NetLodge never implies that collected funds have been settled to you unless the backend's settlement data confirms it. Pending payouts may take 24–72 hours after booking confirmation.</span>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden /></div>
      ) : payouts.length === 0 ? (
        <EmptyState icon={<Banknote className="h-5 w-5" aria-hidden />} title="No payouts yet" description="Payouts appear after your first confirmed booking." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {payouts.map((p) => (
                <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{p.reference}</p>
                      <PayoutStatusBadge status={p.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.bankAccountMasked} · Scheduled {formatDate(p.scheduledFor)}
                      {p.settledAt && ` · Settled ${formatDate(p.settledAt)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Gross {formatNgn(p.grossKobo)} − fee {formatNgn(p.platformFeeKobo)}</p>
                    <p className="font-medium text-success">Net {formatNgn(p.netKobo)}</p>
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
