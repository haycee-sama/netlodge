"use client";

import * as React from "react";
import { Loader2, DoorOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { updateRoom } from "@/lib/supabase/landlord-service";
import { formatNgn } from "@/lib/utils/format";
import { toast } from "sonner";
import { invalidateCache, CACHE_TAGS } from "@/lib/cache/invalidate-client";

export default function PricingPage() {
  const { session } = useAuth();
  const [units, setUnits] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [editValues, setEditValues] = React.useState<Record<string, string>>({});
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from("rentable_units")
      .select(`id, identifier, annual_rent_kobo, caution_deposit_kobo, properties!inner(name)`)
      .order("identifier")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else {
          setUnits(data ?? []);
          const vals: Record<string, string> = {};
          for (const u of data ?? []) {
            vals[u.id] = String(u.annual_rent_kobo ?? "");
          }
          setEditValues(vals);
        }
        setLoading(false);
      });
  }, [isSupabaseAuth, session]);

  async function savePrice(unitId: string) {
    const newPrice = Number(editValues[unitId]);
    if (!newPrice || newPrice <= 0) { toast.error("Valid price required"); return; }
    setSaving(unitId);
    const res = await updateRoom(unitId, { annualRentKobo: newPrice });
    if (res.error) toast.error("Failed to update price", { description: res.error });
    else { toast.success("Price updated");
      await invalidateCache([CACHE_TAGS.PROPERTIES, CACHE_TAGS.UNITS]); setUnits((arr) => arr.map((u) => u.id === unitId ? { ...u, annual_rent_kobo: newPrice } : u)); }
    setSaving(null);
  }

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><PageHeader title="Pricing" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="Property management" title="Pricing" description="Update annual rent for your rentable units. Changes apply to new bookings only — existing bookings keep their original price." />
      {error ? <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : units.length === 0 ? (
        <EmptyState icon={<DoorOpen className="h-5 w-5" />} title="No units" description="Create rooms to manage pricing." />
      ) : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {units.map((u) => (
              <li key={u.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="font-medium">Unit {u.identifier}</p><p className="text-xs text-muted-foreground">{u.properties?.name ?? "—"} · Current: {formatNgn(u.annual_rent_kobo)}/yr</p></div>
                <div className="flex items-center gap-2">
                  <div className="space-y-0"><Label htmlFor={`price-${u.id}`} className="sr-only">Annual rent (kobo)</Label><Input id={`price-${u.id}`} type="number" min={0} className="w-40" value={editValues[u.id] ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, [u.id]: e.target.value }))} /></div>
                  <Button size="sm" onClick={() => savePrice(u.id)} disabled={saving === u.id}>{saving === u.id ? "…" : "Update"}</Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
