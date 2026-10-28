"use client";

import * as React from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatNgn } from "@/lib/utils/format";

export default function AdminLocationsPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("neighbourhoods").select("id, name, slug, city, state, active, average_annual_rent_kobo, universities(short_name)").order("name").then(({ data, error }) => {
      if (error) setError(error.message);
      else setRows(data ?? []);
      setLoading(false);
    });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Locations" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Platform configuration" title="Locations" description="Neighbourhoods across all universities." breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Locations" }]} />
      {error ? <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No locations found.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-3 p-4">
                <div className="space-y-1"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><p className="font-medium">{n.name}</p></div><p className="text-xs text-muted-foreground">{n.city}, {n.state} · {n.universities?.short_name ?? "—"} · {n.slug}</p></div>
                <div className="flex items-center gap-2">{n.average_annual_rent_kobo && <span className="text-xs text-muted-foreground">{formatNgn(n.average_annual_rent_kobo)}/yr</span>}<Badge variant="outline" className={n.active ? "text-success" : "text-destructive"}>{n.active ? "Active" : "Inactive"}</Badge></div>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
