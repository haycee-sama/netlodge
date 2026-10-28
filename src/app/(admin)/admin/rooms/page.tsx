"use client";

import * as React from "react";
import { DoorOpen, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { RoomStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatNgn } from "@/lib/utils/format";

export default function AdminRoomsPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    let query = supabase.from("rentable_units").select("id, identifier, unit_type, status, annual_rent_kobo, capacity, bedrooms, bathrooms, furnishing, properties(name, slug)").order("identifier").limit(200);
    if (status !== "all") query = query.eq("status", status);
    if (q) query = query.or(`identifier.ilike.%${q}%`);
    query.then(({ data, error }) => {
      if (error) setError(error.message);
      else setRows(data ?? []);
      setLoading(false);
    });
  }, [isSupabaseAuth, session, q, status]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-7xl"><AdminPageHeader title="Rooms" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Platform oversight" title="Rooms & units" description="All rentable units across the platform." breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Rooms" }]} />
      <Card><CardContent className="flex flex-wrap items-center gap-2 p-4">
        <Input placeholder="Search identifier…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-48" />
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">All statuses</SelectItem><SelectItem value="available">Available</SelectItem><SelectItem value="held">Held</SelectItem><SelectItem value="occupied">Occupied</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="off_market">Off market</SelectItem>
        </SelectContent></Select>
      </CardContent></Card>
      {error ? <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No rooms found.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2"><p className="font-medium">Unit {r.identifier}</p><RoomStatusBadge status={r.status} /></div>
                  <p className="text-xs text-muted-foreground">{r.properties?.name ?? "—"} · {(r.unit_type ?? "").replace(/_/g, " ")} · {r.bedrooms} bed · {r.bathrooms} bath</p>
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
