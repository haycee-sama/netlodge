"use client";

import * as React from "react";
import { Building2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { VerificationBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatNgn } from "@/lib/utils/format";

export default function AgentPropertiesPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("properties").select("id, name, slug, type, status, verification_status, city, state, price_from_kobo, total_units, available_units").order("name").then(({ data }) => {
      setProperties(data ?? []);
      setLoading(false);
    });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><PageHeader title="My properties" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="Agent" title="Assigned properties" description="Properties you are authorized to manage enquiries for." />
      {properties.length === 0 ? <EmptyState icon={<Building2 className="h-5 w-5" />} title="No assigned properties" /> : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {properties.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2"><p className="font-medium">{p.name}</p><VerificationBadge status={p.verification_status} /></div>
                  <p className="text-xs text-muted-foreground">{p.city}, {p.state} · {p.available_units}/{p.total_units} available</p>
                </div>
                {p.price_from_kobo > 0 && <p className="text-sm font-medium">{formatNgn(p.price_from_kobo)}</p>}
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
