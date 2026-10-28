"use client";

import * as React from "react";
import { DoorOpen, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { RoomStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatNgn } from "@/lib/utils/format";

export default function ManagerAvailabilityPage() {
  const { session } = useAuth();
  const [units, setUnits] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("rentable_units").select("id, identifier, status, annual_rent_kobo, properties(name)").order("status").order("identifier").then(({ data }) => {
      setUnits(data ?? []);
      setLoading(false);
    });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><PageHeader title="Availability" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const available = units.filter((u) => u.status === "available");
  const occupied = units.filter((u) => u.status === "occupied");
  const held = units.filter((u) => u.status === "held");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Availability" description="Current status of all units on your assigned properties." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="space-y-1 p-4"><p className="text-xs text-muted-foreground">Available</p><p className="text-2xl font-bold text-success">{available.length}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 p-4"><p className="text-xs text-muted-foreground">Held</p><p className="text-2xl font-bold text-warning-foreground">{held.length}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 p-4"><p className="text-xs text-muted-foreground">Occupied</p><p className="text-2xl font-bold">{occupied.length}</p></CardContent></Card>
      </div>
      {units.length === 0 ? <EmptyState icon={<DoorOpen className="h-5 w-5" />} title="No units" /> : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {units.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 p-4">
                <div className="space-y-1"><div className="flex items-center gap-2"><p className="font-medium">Unit {u.identifier}</p><RoomStatusBadge status={u.status} /></div><p className="text-xs text-muted-foreground">{u.properties?.name ?? "—"}</p></div>
                <p className="text-sm">{formatNgn(u.annual_rent_kobo)}/yr</p>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
