import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  MapPin,
  DoorOpen,
  BedDouble,
  Bath,
  Users,
  Maximize,
  Calendar,
  CheckCircle2,
  Info,
  ChevronRight,
  ShieldCheck,
  Lock,
  AlertCircle,
} from "lucide-react";
import { rooms, properties, floors, getRoomsForProperty } from "@/lib/data/fixtures";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Price } from "@/components/shared/price";
import {
  RoomStatusBadge,
  VerificationBadge,
} from "@/components/shared/status-badges";
import {
  FACILITY_LABELS,
  UNIT_TYPE_LABELS,
  RENTAL_PERIOD_LABELS,
} from "@/lib/types";
import { formatNgn, formatNgnCompact } from "@/lib/utils/format";
import { RoomBookingCard } from "@/components/public/room-booking-card";

export async function generateStaticParams() {
  return rooms.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = rooms.find((r) => r.id === id || r.slug === id);
  if (!room) return {};
  const property = properties.find((p) => p.id === room.propertyId);
  return {
    title: `Unit ${room.identifier} — ${property?.name ?? "Property"}`,
    description: `Book unit ${room.identifier}: ${UNIT_TYPE_LABELS[room.unitType].toLowerCase()}, sleeps ${room.capacity}, from ${formatNgnCompact(room.annualRentKobo)}/year.`,
    alternates: { canonical: `/rooms/${room.id}` },
  };
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const room = rooms.find((r) => r.id === id || r.slug === id);
  if (!room) notFound();
  const property = properties.find((p) => p.id === room.propertyId);
  if (!property) notFound();
  const floor = floors.find((f) => f.id === room.floorId);
  const otherRooms = getRoomsForProperty(property.id)
    .filter((r) => r.id !== room.id && r.status === "available")
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground hover:underline">Home</Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href={`/properties/${property.slug}`} className="hover:text-foreground hover:underline">
          {property.name}
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="text-foreground">Unit {room.identifier}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <RoomStatusBadge status={room.status} />
            <Badge variant="outline" className="gap-1.5">
              <DoorOpen className="h-3.5 w-3.5" aria-hidden />
              {UNIT_TYPE_LABELS[room.unitType]}
            </Badge>
            {floor && (
              <Badge variant="outline" className="gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {floor.label}
              </Badge>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Unit {room.identifier}
          </h1>
          <p className="text-sm text-muted-foreground">
            {property.name} · {property.publicAddressLine}
          </p>
        </div>
        <Price kobo={room.annualRentKobo} period={`/${RENTAL_PERIOD_LABELS[room.rentalPeriod].split(" ")[0].toLowerCase()}`} className="text-2xl" />
      </div>

      {/* Gallery */}
      <div className="mt-6 grid gap-2 sm:grid-cols-4">
        <div className="relative aspect-[16/10] sm:col-span-2 sm:row-span-2 overflow-hidden rounded-xl border border-border bg-muted">
          {room.images[0] && (
            <Image
              src={room.images[0].url}
              alt={room.images[0].altText}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          )}
        </div>
        {room.images.slice(1, 5).map((img) => (
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
          </div>
        ))}
      </div>
      {room.representativeImagesOnly && (
        <p className="mt-2 flex items-center gap-1.5 rounded-md bg-warning/10 p-2 text-xs text-warning-foreground">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          The images above are representative and may not depict this exact unit. Request a fresh photo or inspection before booking.
        </p>
      )}

      {/* Body */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Users className="h-5 w-5 text-primary" aria-hidden />
                <div>
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="font-semibold">{room.capacity} {room.capacity === 1 ? "person" : "people"}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <BedDouble className="h-5 w-5 text-primary" aria-hidden />
                <div>
                  <p className="text-xs text-muted-foreground">Bedrooms</p>
                  <p className="font-semibold">{room.bedrooms}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Bath className="h-5 w-5 text-primary" aria-hidden />
                <div>
                  <p className="text-xs text-muted-foreground">Bathrooms</p>
                  <p className="font-semibold">{room.bathrooms}</p>
                </div>
              </CardContent>
            </Card>
            {room.sizeSqM && (
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Maximize className="h-5 w-5 text-primary" aria-hidden />
                  <div>
                    <p className="text-xs text-muted-foreground">Size</p>
                    <p className="font-semibold">{room.sizeSqM}m²</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* In-unit facilities */}
          <section>
            <h2 className="font-display text-xl font-bold tracking-tight">
              Inside this unit
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These facilities are <strong>specific to this room</strong>. Building-wide facilities are listed on the property page.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {room.facilities.map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                  <span className="text-sm">{FACILITY_LABELS[f]}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
                <span className="text-sm font-medium">Furnishing:</span>
                <span className="text-sm text-muted-foreground capitalize">
                  {room.furnishing.replace("_", " ")}
                </span>
              </div>
            </div>
          </section>

          {/* Booking terms */}
          <section>
            <h2 className="font-display text-xl font-bold tracking-tight">Booking terms</h2>
            <p className="mt-2 text-sm text-foreground/90 text-pretty">{room.bookingTerms}</p>
          </section>

          {/* Other rooms */}
          {otherRooms.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-bold tracking-tight">Other units in this property</h2>
              <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                {otherRooms.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/rooms/${r.id}`}
                      className="flex items-center justify-between p-4 transition-colors hover:bg-muted/40"
                    >
                      <div>
                        <p className="font-medium">Unit {r.identifier}</p>
                        <p className="text-xs text-muted-foreground">
                          {UNIT_TYPE_LABELS[r.unitType]} · sleeps {r.capacity}
                        </p>
                      </div>
                      <Price kobo={r.annualRentKobo} compact period="/yr" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar — booking */}
        <aside className="space-y-4">
          <RoomBookingCard room={room} property={property} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Annual rent</span>
                <span>{formatNgn(room.annualRentKobo)}</span>
              </div>
              {room.additionalCharges.map((c) => (
                <div key={c.id} className="flex justify-between text-muted-foreground">
                  <span>
                    {c.label}
                    <span className="ml-1 text-xs">({c.frequency.replace("_", " ")})</span>
                  </span>
                  <span>{formatNgn(c.amountKobo)}</span>
                </div>
              ))}
              {room.cautionDepositKobo && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Caution deposit (refundable)</span>
                  <span>{formatNgn(room.cautionDepositKobo)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Estimated first-year cost</span>
                <span>
                  {formatNgn(
                    room.annualRentKobo +
                      room.additionalCharges.reduce((s, c) => s + c.amountKobo, 0) +
                      (room.cautionDepositKobo ?? 0),
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                <Info className="mr-1 inline h-3 w-3" aria-hidden />
                Service fee calculated at checkout.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {room.availableFrom && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" aria-hidden />
                  <span>Available from {new Date(room.availableFrom).toLocaleDateString("en-NG")}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" aria-hidden />
                <span>
                  {room.status === "available"
                    ? "Room ready for booking"
                    : room.status === "held"
                      ? "On temporary hold"
                      : room.status === "occupied"
                        ? "Currently occupied"
                        : "Off the market"}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
                <VerificationBadge status={property.verificationStatus} />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
