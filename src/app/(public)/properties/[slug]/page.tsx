import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  MapPin,
  Building2,
  BedDouble,
  DoorOpen,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Info,
  ChevronRight,
  Home,
  Layers,
  Users,
} from "lucide-react";
import { properties, rooms, getRoomsForProperty, getFloorsForProperty } from "@/lib/data/fixtures";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Price } from "@/components/shared/price";
import {
  PropertyStatusBadge,
  VerificationBadge,
  RoomStatusBadge,
} from "@/components/shared/status-badges";
import { FACILITY_LABELS, UNIT_TYPE_LABELS, RENTAL_PERIOD_LABELS } from "@/lib/types";
import { formatNgnCompact } from "@/lib/utils/format";

export async function generateStaticParams() {
  return properties.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = properties.find((p) => p.slug === slug);
  if (!property) return {};
  return {
    title: property.name,
    description: property.description.slice(0, 160),
    alternates: { canonical: `/properties/${property.slug}` },
    openGraph: {
      title: property.name,
      description: property.description.slice(0, 160),
      images: property.images.map((i) => ({ url: i.url, alt: i.altText })),
    },
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = properties.find((p) => p.slug === slug);
  if (!property) notFound();

  const propertyRooms = getRoomsForProperty(property.id);
  const propertyFloors = getFloorsForProperty(property.id);
  const availableRooms = propertyRooms.filter((r) => r.status === "available");

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
            <VerificationBadge status={property.verificationStatus} />
            <PropertyStatusBadge status={property.status} />
            <Badge variant="outline" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" aria-hidden />
              {property.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </Badge>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {property.name}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" aria-hidden />
            {property.publicAddressLine}, {property.city}, {property.state}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Price kobo={property.priceFromKobo} fromLabel period="/yr" className="text-2xl" />
          <p className="text-xs text-muted-foreground">
            {property.availableUnits} of {property.totalUnits} units available
          </p>
        </div>
      </div>

      {/* Gallery */}
      <div className="mt-6 grid gap-2 sm:grid-cols-4">
        <div className="relative aspect-[16/10] sm:col-span-2 sm:row-span-2 overflow-hidden rounded-xl border border-border bg-muted">
          {property.images[0] && (
            <Image
              src={property.images[0].url}
              alt={property.images[0].altText}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          )}
        </div>
        {property.images.slice(1, 5).map((img, i) => (
          <div
            key={img.id}
            className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted"
          >
            <Image
              src={img.url}
              alt={img.altText}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
            />
            {i === 3 && property.images.length > 5 && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-sm font-medium">
                +{property.images.length - 5} more
              </div>
            )}
          </div>
        ))}
      </div>
      {property.images.some((i) => !i.isVerified) && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" aria-hidden />
          Some images are representative — the actual unit may differ. Always inspect the specific room before booking.
        </p>
      )}

      {/* Body grid */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="rooms">Available units ({availableRooms.length})</TabsTrigger>
              <TabsTrigger value="facilities">Facilities</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4">
              <p className="text-pretty text-foreground/90">{property.description}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Layers className="h-5 w-5 text-primary" aria-hidden />
                    <div>
                      <p className="text-xs text-muted-foreground">Floors</p>
                      <p className="font-semibold">{property.totalFloors}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <DoorOpen className="h-5 w-5 text-primary" aria-hidden />
                    <div>
                      <p className="text-xs text-muted-foreground">Total units</p>
                      <p className="font-semibold">{property.totalUnits}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Home className="h-5 w-5 text-primary" aria-hidden />
                    <div>
                      <p className="text-xs text-muted-foreground">Available</p>
                      <p className="font-semibold">{property.availableUnits}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Rooms */}
            <TabsContent value="rooms" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Each unit below is its own bookable entity. Click a unit to see its specific photos,
                facilities, and booking terms.
              </p>
              <div className="space-y-3">
                {propertyFloors.map((floor) => {
                  const floorRooms = propertyRooms.filter((r) => r.floorId === floor.id);
                  if (floorRooms.length === 0) return null;
                  return (
                    <div key={floor.id} className="rounded-lg border border-border">
                      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
                        <p className="text-sm font-semibold">{floor.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {floor.availableUnits} available · {floor.totalUnits} total
                        </p>
                      </div>
                      <ul className="divide-y divide-border">
                        {floorRooms.map((room) => (
                          <li key={room.id}>
                            <Link
                              href={`/rooms/${room.id}`}
                              className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">Unit {room.identifier}</p>
                                  <RoomStatusBadge status={room.status} />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {UNIT_TYPE_LABELS[room.unitType]} · sleeps {room.capacity} · {room.bedrooms}br · {room.bathrooms}ba
                                </p>
                              </div>
                              <div className="text-left sm:text-right">
                                <Price kobo={room.annualRentKobo} period={`/${RENTAL_PERIOD_LABELS[room.rentalPeriod].split(" ")[0].toLowerCase()}`} />
                                <p className="text-xs text-muted-foreground">
                                  {formatNgnCompact(room.annualRentKobo)}/yr
                                </p>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Facilities (building-wide) */}
            <TabsContent value="facilities" className="space-y-3">
              <p className="text-sm text-muted-foreground">
                These are <strong>building-wide</strong> facilities shared across all units.
                In-unit facilities are listed on each individual room page.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {property.facilities.map((f) => (
                  <div
                    key={f}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
                  >
                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                    <span className="text-sm">{FACILITY_LABELS[f]}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Rules */}
            <TabsContent value="rules" className="space-y-2">
              <ul className="space-y-2">
                {property.rules.map((rule) => (
                  <li
                    key={rule.id}
                    className="flex items-start gap-2 rounded-lg border border-border bg-card p-3"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                      !
                    </span>
                    <div>
                      <p className="text-sm font-medium">{rule.label}</p>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground">{rule.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <Price kobo={property.priceFromKobo} />
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available units</span>
                <span className="font-medium">{property.availableUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total units</span>
                <span className="font-medium">{property.totalUnits}</span>
              </div>
              <Separator />
              <Button asChild className="w-full">
                <Link href="#rooms">
                  <BedDouble className="mr-2 h-4 w-4" aria-hidden />
                  Browse available units
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/contact">Ask a question</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <VerificationBadge status={property.verificationStatus} />
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-success">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                <p className="text-xs">
                  Identity, address and ownership verified. Property inspected on-site.
                </p>
              </div>
              <Link
                href="/safety"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Read our verification policy
                <ChevronRight className="h-3 w-3" aria-hidden />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>
                  {property.publicAddressLine}, {property.city}, {property.state}
                </span>
              </p>
              <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                <Info className="mr-1 inline h-3 w-3" aria-hidden />
                The exact address is shared with you only after a booking is confirmed.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
