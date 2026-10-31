"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Plus, Loader2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { PropertyStatusBadge, VerificationBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { fetchLandlordProperties } from "@/lib/supabase/landlord-service";
import { formatNgn } from "@/lib/utils/format";

export default function LandlordPropertiesPage() {
  const { session } = useAuth();
  const { t } = useI18n();
  const [properties, setProperties] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    fetchLandlordProperties().then((res) => {
      if (res.data) setProperties(res.data);
      if (res.error) setError(res.error);
      setLoading(false);
    });
  }, [isSupabaseAuth]);

  const filtered = q
    ? properties.filter((p) => `${p.name} ${p.public_address_line} ${p.city}`.toLowerCase().includes(q.toLowerCase()))
    : properties;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={t("landlord.properties.eyebrow")}
        title={t("landlord.properties.title")}
        description={t("landlord.properties.description")}
        actions={<Button asChild><Link href="/landlord/properties/new"><Plus className="mr-2 h-4 w-4" aria-hidden />{t("landlord.dashboard.addProperty")}</Link></Button>}
      />

      {!isSupabaseAuth && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-3 text-xs text-warning-foreground">
            {t("landlord.properties.signInPrompt")}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden /></div>
      ) : error ? (
        <EmptyState icon={<Building2 className="h-5 w-5" aria-hidden />} title={t("landlord.properties.couldNotLoad")} description={error} />
      ) : properties.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" aria-hidden />}
          title={t("landlord.properties.noProperties.title")}
          description={t("landlord.properties.noProperties.desc")}
          action={<Button asChild><Link href="/landlord/properties/new"><Plus className="mr-2 h-4 w-4" aria-hidden />{t("landlord.dashboard.addProperty")}</Link></Button>}
        />
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input type="search" placeholder={t("landlord.properties.searchPlaceholder")} className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <Link href={`/landlord/properties/${p.id}`} className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{p.name}</p>
                          <PropertyStatusBadge status={p.status} />
                          <VerificationBadge status={p.verification_status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{p.public_address_line}, {p.city}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{t("landlord.properties.units", { n: p.total_units })}</span><span>·</span>
                          <span>{t("landlord.properties.available", { n: p.available_units })}</span><span>·</span>
                          <span>{t("landlord.properties.floors", { n: p.total_floors })}</span>
                        </div>
                      </div>
                      <Price kobo={p.price_from_kobo} fromLabel period="/yr" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
