"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin, Building2, DoorOpen, Layers, Home, Loader2, ChevronRight,
  CheckCircle2, Info, Heart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, EmptyState, StatCard } from "@/components/shared/page-components";
import { ReviewSection } from "@/components/shared/review-section";
import { VerificationBadge, PropertyStatusBadge, RoomStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { fetchPropertyBySlug, fetchFloors, fetchRentableUnits, type PropertyWithRelations, type FloorWithCounts, type RentableUnitWithRelations } from "@/lib/supabase/property-service";
import { UNIT_TYPE_LABELS, RENTAL_PERIOD_LABELS } from "@/lib/types";
import { formatNgn } from "@/lib/utils/format";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const FACILITY_LABELS: Record<string, string> = {
  wifi: "Wi-Fi", power_backup: "Power backup", water_borehole: "Borehole water",
  cctv: "CCTV", security_guard: "Security guard", parking: "Parking",
  kitchen_shared: "Shared kitchen", kitchen_private: "Private kitchen",
  laundry: "Laundry", study_room: "Study room", gym: "Gym",
  common_room: "Common room", generator: "Generator", solar_power: "Solar power",
  waste_disposal: "Waste disposal", furnished: "Furnished", wardrobe: "Wardrobe",
  bed_mattress: "Bed & mattress", desk_chair: "Desk & chair", ac: "Air conditioning",
  fan: "Ceiling fan", ensuite_bathroom: "Ensuite bathroom", shared_bathroom: "Shared bathroom",
  balcony: "Balcony", window: "Window",
};

export function PropertyDetailPage() {
  const params = useParams<{ slug: string }>();
  const [property, setProperty] = React.useState<PropertyWithRelations | null>(null);
  const [floors, setFloors] = React.useState<FloorWithCounts[]>([]);
  const [rooms, setRooms] = React.useState<RentableUnitWithRelations[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!params.slug) return;
    setLoading(true);
    fetchPropertyBySlug(params.slug).then(async (res) => {
      if (res.error || !res.data) {
        setError(res.error ?? "Property not found");
        setLoading(false);
        return;
      }
      setProperty(res.data);
      // Fetch floors and rooms in parallel
      const [floorsRes, roomsRes] = await Promise.all([
        fetchFloors(res.data.id),
        fetchRentableUnits({ propertyId: res.data.id }),
      ]);
      if (floorsRes.data) setFloors(floorsRes.data);
      if (roomsRes.data) setRooms(roomsRes.data);
      setLoading(false);
    });
  }, [params.slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <EmptyState
          icon={<Building2 className="h-5 w-5" aria-hidden />}
          title="Property not found"
          description={error ?? "This property may have been removed or is not publicly listed."}
        />
      </div>
    );
  }

  const availableRooms = rooms.filter((r) => r.status === "available");
  const facilities = (property.property_facilities ?? []).map((f) => f.facility);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground hover:underline">Home</Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href="/properties" className="hover:text-foreground hover:underline">Properties</Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="truncate text-foreground">{property.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <VerificationBadge status={property.verification_status as any} />
            <PropertyStatusBadge status={property.status as any} />
            <Badge variant="outline" className="capitalize">{property.type.replace(/_/g, " ")}</Badge>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{property.name}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" aria-hidden />
            {property.public_address_line}, {property.city}, {property.state}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Price kobo={property.price_from_kobo} fromLabel period="/yr" className="text-2xl" />
          <p className="text-xs text-muted-foreground">
            {property.available_units} of {property.total_units} units available
          </p>
          <SaveButton propertyId={property.id} />
        </div>
      </div>

      {/* Description */}
      <div className="mt-6">
        <p className="text-pretty text-foreground/90">{property.description}</p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Floors" value={property.total_floors} icon={<Layers className="h-4 w-4" aria-hidden />} />
        <StatCard label="Total units" value={property.total_units} icon={<DoorOpen className="h-4 w-4" aria-hidden />} />
        <StatCard label="Available" value={property.available_units} icon={<Home className="h-4 w-4" aria-hidden />} />
        <StatCard label="Price from" value={formatNgn(property.price_from_kobo)} icon={<Building2 className="h-4 w-4" aria-hidden />} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rooms" className="mt-8">
        <TabsList>
          <TabsTrigger value="rooms">Available units ({availableRooms.length})</TabsTrigger>
          <TabsTrigger value="facilities">Facilities ({facilities.length})</TabsTrigger>
        </TabsList>

        {/* Rooms */}
        <TabsContent value="rooms" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Each unit below is its own bookable entity with its own photos, facilities, and price.
            Click a unit to see its full image gallery and booking terms.
          </p>
          {floors.map((floor) => {
            const floorRooms = rooms.filter((r) => r.floor_id === floor.id);
            if (floorRooms.length === 0) return null;
            return (
              <div key={floor.id} className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <p className="text-sm font-semibold">{floor.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {floor.available_count} available · {floor.room_count} total
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {floorRooms.map((room) => {
                    const thumb = room.unit_images?.[0];
                    const imageCount = room.unit_images?.length ?? 0;
                    return (
                      <Link
                        key={room.id}
                        href={`/rooms/${room.id}`}
                        className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-lg hover:-translate-y-0.5"
                      >
                        {/* Room image thumbnail */}
                        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                          {thumb?.public_url ? (
                            <Image
                              src={thumb.public_url}
                              alt={thumb.alt_text || `Unit ${room.identifier}`}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                              <DoorOpen className="h-8 w-8" aria-hidden />
                            </div>
                          )}
                          {/* Status badge */}
                          <div className="absolute left-2 top-2">
                            <RoomStatusBadge status={room.status as any} />
                          </div>
                          {/* Image count badge */}
                          {imageCount > 1 && (
                            <div className="absolute bottom-2 right-2 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
                              {imageCount} photos
                            </div>
                          )}
                        </div>
                        {/* Room details */}
                        <div className="space-y-1.5 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">Unit {room.identifier}</p>
                            <Price kobo={room.annual_rent_kobo} compact period="/yr" className="shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(UNIT_TYPE_LABELS as any)[room.unit_type] ?? room.unit_type} · sleeps {room.capacity} · {room.bedrooms}br · {room.bathrooms}ba
                            {room.has_balcony && " · balcony"}
                          </p>
                          {room.furnishing !== "unfurnished" && (
                            <p className="text-xs text-muted-foreground capitalize">
                              {room.furnishing.replace(/_/g, " ")}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Facilities */}
        <TabsContent value="facilities" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            These are <strong>building-wide</strong> facilities shared across all units.
            In-unit facilities are listed on each individual room page.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((f) => (
              <div key={f} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                <span className="text-sm">{FACILITY_LABELS[f] ?? f.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Reviews */}
      {property.id && property.landlord_id && (
        <div className="mt-6">
          <ReviewSection propertyId={property.id} landlordId={property.landlord_id} />
        </div>
      )}

      {/* Verification info */}
      <Card className="mt-6">
        <CardContent className="flex items-center gap-2 p-4 text-sm">
          <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="text-muted-foreground">
            The exact address is shared with you only after a booking is confirmed.
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

function SaveButton({ propertyId }: { propertyId: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from("saved_properties")
      .select("id")
      .eq("property_id", propertyId)
      .eq("user_id", session!.userId)
      .maybeSingle()
      .then(({ data }) => {
        setSaved(!!data);
        setLoading(false);
      });
  }, [propertyId, session, isSupabaseAuth]);

  async function toggle() {
    if (!isSupabaseAuth) {
      // Redirect to register so unauthenticated users can create an account.
      // Use window.location.pathname to get the current property slug.
      router.push(`/register?redirect=${window.location.pathname}`);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      if (saved) {
        const { error } = await supabase
          .from("saved_properties")
          .delete()
          .eq("property_id", propertyId)
          .eq("user_id", session!.userId);
        if (error) throw new Error(error.message);
        setSaved(false);
        toast.success("Removed from saved");
      } else {
        const { error } = await supabase
          .from("saved_properties")
          .insert({ property_id: propertyId, user_id: session!.userId });
        if (error) throw new Error(error.message);
        setSaved(true);
        toast.success("Saved to your shortlist");
      }
    } catch (e) {
      toast.error("Could not update saved properties", { description: e instanceof Error ? e.message : "" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
        saved
          ? "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10"
          : "border-border bg-background text-foreground hover:bg-muted"
      }`}
      aria-label={saved ? "Remove from saved" : "Save property"}
    >
      <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} aria-hidden />
      {loading ? "…" : saved ? "Saved" : "Save"}
    </button>
  );
}
