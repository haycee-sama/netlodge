"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Loader2, DoorOpen, BedDouble, Bath, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-components";
import { RoomStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatNgn } from "@/lib/utils/format";

export default function RoomDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [room, setRoom] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth || !params.id) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from("rentable_units")
      .select(`*, properties!inner(id, name, slug, landlord_id)`)
      .eq("id", params.id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRoom(data);
        setLoading(false);
      });
  }, [isSupabaseAuth, params.id]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-3xl"><PageHeader title="Room detail" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in to view.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !room) return <div className="mx-auto max-w-3xl space-y-4"><Button asChild variant="ghost" size="sm"><Link href="/landlord/rooms">Back</Link></Button><Card><CardContent className="p-6 text-center text-sm text-destructive">{error ?? "Not found"}</CardContent></Card></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm"><Link href={`/landlord/properties/${room.property_id}/rooms`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to rooms</Link></Button>
      </div>

      <PageHeader
        eyebrow={`${room.properties?.name ?? "Property"}`}
        title={`Unit ${room.identifier}`}
        actions={<><RoomStatusBadge status={room.status} /><Button variant="outline" size="sm" onClick={() => router.push(`/landlord/rooms/${room.id}/edit`)}><Edit className="mr-2 h-3.5 w-3.5" /> Edit</Button></>}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{(room.unit_type ?? "").replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Capacity</span><span>{room.capacity} guest{room.capacity > 1 ? "s" : ""}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Bedrooms</span><span>{room.bedrooms}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Bathrooms</span><span>{room.bathrooms}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Furnishing</span><span className="capitalize">{(room.furnishing ?? "").replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Window</span><span>{room.has_window ? "Yes" : "No"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Balcony</span><span>{room.has_balcony ? "Yes" : "No"}</span></div>
          {room.size_sqm && <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>{room.size_sqm} sqm</span></div>}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Pricing</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Annual rent</span><span className="font-medium">{formatNgn(room.annual_rent_kobo)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Rental period</span><span className="capitalize">{room.rental_period}</span></div>
          {room.caution_deposit_kobo && <div className="flex justify-between"><span className="text-muted-foreground">Caution deposit</span><span>{formatNgn(room.caution_deposit_kobo)}</span></div>}
          {room.available_from && <div className="flex justify-between"><span className="text-muted-foreground">Available from</span><span>{room.available_from}</span></div>}
          {room.available_to && <div className="flex justify-between"><span className="text-muted-foreground">Available to</span><span>{room.available_to}</span></div>}
          <Separator className="my-2" />
          {room.booking_terms && <div className="space-y-1"><p className="text-xs text-muted-foreground">Booking terms</p><p className="text-xs">{room.booking_terms}</p></div>}
        </CardContent></Card>
      </div>
    </div>
  );
}
