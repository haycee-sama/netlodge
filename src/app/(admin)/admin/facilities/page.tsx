"use client";

import * as React from "react";
import { Building, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";

export default function AdminFacilitiesPage() {
  const { session } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [propertyCount, setPropertyCount] = React.useState(0);
  const [unitCount, setUnitCount] = React.useState(0);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    Promise.all([
      supabase.from("property_facilities").select("facility", { count: "exact", head: true }),
      supabase.from("unit_facilities").select("facility", { count: "exact", head: true }),
    ]).then(([pRes, uRes]) => {
      setPropertyCount(pRes.count ?? 0);
      setUnitCount(uRes.count ?? 0);
      setLoading(false);
    });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Facilities" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const FACILITIES = ["wifi", "power_backup", "water_borehole", "cctv", "security_guard", "parking", "kitchen_shared", "kitchen_private", "laundry", "study_room", "gym", "common_room", "generator", "solar_power", "waste_disposal", "furnished", "wardrobe", "bed_mattress", "desk_chair", "ac", "fan", "ensuite_bathroom", "shared_bathroom", "balcony", "window"];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Platform configuration" title="Facilities" description="Available facility options for properties and rooms." breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Facilities" }]} />
      <Card><CardContent className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Property facility records</p><p className="text-2xl font-bold">{propertyCount}</p></div>
          <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Unit facility records</p><p className="text-2xl font-bold">{unitCount}</p></div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Available facility types</p>
          <div className="flex flex-wrap gap-2">
            {FACILITIES.map((f) => (
              <span key={f} className="rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs capitalize">{f.replace(/_/g, " ")}</span>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Facilities are managed per-property and per-room in their respective management pages. The facility type enum is defined in the database schema.</p>
      </CardContent></Card>
    </div>
  );
}
