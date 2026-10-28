"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNgn, formatDateTime, formatRelativeTime } from "@/lib/utils/format";
import { Loader2, Percent, Wallet, CheckCircle2, Clock } from "lucide-react";

interface CommissionSummary {
  configured_rate_percentage: number | null;
  service_fee_rate_percentage: number | null;
  accrued_commission_kobo: number;
  paid_commission_kobo: number;
  pending_commission_kobo: number;
  payout_count_total: number;
  payout_count_settled: number;
  payout_count_pending: number;
  recent_commission_ledger: Array<{
    id: string;
    reference: string;
    description: string;
    credit_kobo: number;
    created_at: string;
    booking_id: string | null;
    payout_id: string | null;
  }>;
}

interface Props {
  /** Breadcrumbs context — differs between /admin/commissions and /admin/finance/commissions */
  breadcrumbs: { label: string; href?: string }[];
  /** Optional eyebrow tag shown in the header */
  eyebrow?: string;
}

/**
 * Shared commissions view — used by both /admin/commissions (super_admin)
 * and /admin/finance/commissions (finance_admin). Both routes hit the same
 * API and render the same data; only the breadcrumb context differs.
 */
export function CommissionsView({ breadcrumbs, eyebrow = "Finance operations" }: Props) {
  const { session } = useAuth();
  const [data, setData] = React.useState<CommissionSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true); setError(null);
    fetch("/api/admin/finance/commissions", { credentials: "include" })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) { setError(body.error || `Failed (${r.status})`); setData(null); }
        else { setData(body); setError(null); }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Network error"))
      .finally(() => setLoading(false));
  }, [isSupabaseAuth]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow={eyebrow} title="Commissions" breadcrumbs={breadcrumbs} />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Finance Admin or Super Admin account.
        </CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow={eyebrow} title="Commissions" breadcrumbs={breadcrumbs} />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {error ?? "Failed to load commission summary."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow={eyebrow}
        title="Commissions"
        description="Platform commission summary. Read-only — derived from real payouts and platform_settings. No mutation endpoints exist."
        breadcrumbs={breadcrumbs}
      />
      <DemoModeBanner message="Live data — accrued commission is the sum of platform_fee_kobo across all payouts. Paid commission is the sum for settled payouts. The configured rate is read from platform_settings and applied to NEW payouts at creation time." />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Percent className="h-4 w-4" />}
          label="Configured rate"
          value={data.configured_rate_percentage != null ? `${data.configured_rate_percentage}%` : "—"}
          hint="commission.default_rate"
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Accrued commission"
          value={formatNgn(data.accrued_commission_kobo)}
          hint={`${data.payout_count_total} payouts total`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Paid commission"
          value={formatNgn(data.paid_commission_kobo)}
          hint={`${data.payout_count_settled} settled payouts`}
          tone="success"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Pending commission"
          value={formatNgn(data.pending_commission_kobo)}
          hint={`${data.payout_count_pending} scheduled/in_flight`}
          tone="warning"
        />
      </div>

      {/* Definitions */}
      <Card>
        <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Definitions</p>
          <ul className="list-disc space-y-1 pl-4">
            <li><strong className="text-foreground">Platform commission</strong> is the platform_fee_kobo retained by NetLodge on each landlord payout. It is set at payout creation as a fixed percentage of gross_kobo.</li>
            <li><strong className="text-foreground">Accrued commission</strong> = sum of platform_fee_kobo across ALL payouts (regardless of status).</li>
            <li><strong className="text-foreground">Paid commission</strong> = sum of platform_fee_kobo for settled payouts.</li>
            <li><strong className="text-foreground">Pending commission</strong> = accrued − paid (scheduled + in_flight payouts).</li>
            <li><strong className="text-foreground">Service fee</strong> ({data.service_fee_rate_percentage != null ? `${data.service_fee_rate_percentage}%` : "—"}) is separate — charged to the STUDENT on top of rent (booking.service_fee_rate). It flows into gross_kobo and is NOT counted as commission to avoid double-counting.</li>
            <li><strong className="text-foreground">Paystack processing fees</strong> (payments.fee_kobo) are pass-through costs and are NOT commission.</li>
            <li>The configured rate is applied to NEW payouts at creation time. It is NOT applied retroactively to existing payouts.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Recent commission ledger */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4">
            <p className="text-sm font-medium">Recent commission ledger entries</p>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/finance/audit">View full audit</Link>
            </Button>
          </div>
          {data.recent_commission_ledger.length === 0 ? (
            <p className="px-4 pb-6 text-xs text-muted-foreground">
              No commission ledger entries yet. Ledger rows are created when payouts are settled.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recent_commission_ledger.map((l) => (
                <li key={l.id} className="space-y-1 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">commission</Badge>
                    <span className="font-mono text-xs">{l.reference}</span>
                    <span className="ml-auto text-xs text-muted-foreground" title={formatDateTime(l.created_at)}>
                      {formatRelativeTime(l.created_at)}
                    </span>
                  </div>
                  <p className="text-sm">{l.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Credit {formatNgn(l.credit_kobo)}
                    {l.payout_id && <> · Payout <span className="font-mono">{l.payout_id.slice(0, 8)}…</span></>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon, label, value, hint, tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning-foreground" : "text-foreground";
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
