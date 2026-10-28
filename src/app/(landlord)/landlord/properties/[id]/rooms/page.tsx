"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, DoorOpen, Loader2, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { RoomStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchRooms } from "@/lib/supabase/landlord-service";
import { formatNgn } from "@/lib/utils/format";

const UNIT_TYPE_LABELS: Record<string, string> = {
  self_contain: "Self-contain",
  single_room: "Single room",
  shared_room: "Shared room",
  bed_space: "Bed space",
  apartment: "Apartment",
  studio: "Studio",
};

export default function PropertyRoomsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [rooms, setRooms] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth || !params.id) { setLoading(false); return; }
    fetchRooms(params.id).then((res) => {
      if (res.error) setError(res.error);
      else setRooms(res.data ?? []);
      setLoading(false);
    });
  }, [isSupabaseAuth, params.id]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader eyebrow="Rooms" title="Room management" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in to manage rooms.</CardContent></Card>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href={`/landlord/properties/${params.id}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to property</Link></Button>

      <PageHeader
        eyebrow="Room management"
        title="Rooms & units"
        description="Create and manage rentable units for this property."
        actions={<Button onClick={() => router.push(`/landlord/rooms/new?propertyId=${params.id}`)}><Plus className="mr-2 h-4 w-4" /> Add room</Button>}
      />

      {error && (
        <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card>
      )}

      {rooms.length === 0 ? (
        <EmptyState
          icon={<DoorOpen className="h-5 w-5" aria-hidden />}
          title="No rooms yet"
          description="Add rentable units to this property so students can browse and book."
          action={<Button onClick={() => router.push(`/landlord/rooms/new?propertyId=${params.id}`)}><Plus className="mr-2 h-4 w-4" /> Add first room</Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {rooms.map((r) => (
                <li key={r.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Unit {r.identifier}</p>
                      <RoomStatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {UNIT_TYPE_LABELS[r.unit_type] ?? r.unit_type} · {r.bedrooms} bed · {r.bathrooms} bath · {r.capacity} guest{r.capacity > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Price kobo={r.annual_rent_kobo} />
                      <p className="text-xs text-muted-foreground">/yr</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/landlord/rooms/${r.id}`)}>View</Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
