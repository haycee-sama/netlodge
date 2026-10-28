"use client";

import * as React from "react";
import { Loader2, DoorOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { RoomStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatNgn } from "@/lib/utils/format";

export default function ManagerRoomsPage() {
  const { session } = useAuth();
  const [rooms, setRooms] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("rentable_units").select("id, identifier, status, unit_type, annual_rent_kobo, properties(name)").order("identifier").then(({ data, error }) => {
      if (error) console.error(error.message);
      setRooms(data ?? []);
      setLoading(false);
    });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><PageHeader title="Rooms" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="Room management" title="All rooms" description="Rooms across your assigned properties." />
      {rooms.length === 0 ? <EmptyState icon={<DoorOpen className="h-5 w-5" />} title="No rooms" description="No rooms found on your assigned properties." /> : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rooms.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2"><p className="font-medium">Unit {r.identifier}</p><RoomStatusBadge status={r.status} /></div>
                  <p className="text-xs text-muted-foreground">{r.properties?.name ?? "—"} · {(r.unit_type ?? "").replace(/_/g, " ")}</p>
                </div>
                <p className="text-sm font-medium">{formatNgn(r.annual_rent_kobo)}/yr</p>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
