"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Building2, DoorOpen, CalendarCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-components";
import { VerificationBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatNgn } from "@/lib/utils/format";

export default function ManagerPropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [property, setProperty] = React.useState<any>(null);
  const [rooms, setRooms] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth || !params.id) { setLoading(false); return; }
    const supabase = createClient();
    Promise.all([
      supabase.from("properties").select("*").eq("id", params.id).single(),
      supabase.from("rentable_units").select("*").eq("property_id", params.id).order("identifier"),
    ]).then(([pRes, rRes]) => {
      if (pRes.data) setProperty(pRes.data);
      if (rRes.data) setRooms(rRes.data);
      setLoading(false);
    });
  }, [isSupabaseAuth, params.id]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><PageHeader title="Property detail" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!property) return <div className="mx-auto max-w-5xl"><Button asChild variant="ghost"><Link href="/manager/properties">Back</Link></Button><Card><CardContent className="p-6 text-center text-sm text-destructive">Property not found or not assigned to you.</CardContent></Card></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/manager/properties"><ArrowLeft className="mr-2 h-4 w-4" /> Back to properties</Link></Button>
      <PageHeader eyebrow="Property detail" title={property.name} actions={<VerificationBadge status={property.verification_status} />} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader><CardContent className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{property.type?.replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">City</span><span>{property.city}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">State</span><span>{property.state}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{property.status?.replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="text-right text-xs">{property.public_address_line}</span></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Units</CardTitle></CardHeader><CardContent className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Total units</span><span>{property.total_units}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Available</span><span className="text-success">{property.available_units}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Occupied</span><span>{property.occupied_units}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Held</span><span>{property.held_units}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Price from</span><span>{formatNgn(property.price_from_kobo)}</span></div>
        </CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-sm">Rooms ({rooms.length})</CardTitle></CardHeader><CardContent className="p-0">
        {rooms.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No rooms.</p> : (
          <ul className="divide-y divide-border">
            {rooms.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-3 text-sm">
                <span className="font-medium">{r.identifier}</span>
                <div className="flex items-center gap-2"><Badge variant="outline" className="text-xs capitalize">{r.status}</Badge><span className="text-muted-foreground">{formatNgn(r.annual_rent_kobo)}/yr</span></div>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>
    </div>
  );
}
