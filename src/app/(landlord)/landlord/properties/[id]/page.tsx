"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  DoorOpen,
  Layers,
  CalendarCheck,
  Settings,
  Plus,
  Edit,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, StatCard, EmptyState } from "@/components/shared/page-components";
import { PropertyStatusBadge, VerificationBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { properties as allProperties, getRoomsForProperty, getFloorsForProperty } from "@/lib/data/fixtures";
import { UNIT_TYPE_LABELS, FACILITY_LABELS } from "@/lib/types";
import { formatNgn } from "@/lib/utils/format";

export default function LandlordPropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const property = allProperties.find((p) => p.id === params.id);

  if (!property) {
    return (
      <div className="mx-auto max-w-5xl">
        <EmptyState
          icon={<Building2 className="h-5 w-5" aria-hidden />}
          title="Property not found"
          description="This property doesn't exist or has been removed."
          action={<Button asChild><Link href="/landlord/properties">Back to properties</Link></Button>}
        />
      </div>
    );
  }

  const floors = getFloorsForProperty(property.id);
  const rooms = getRoomsForProperty(property.id);
  const availableRooms = rooms.filter((r) => r.status === "available");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/landlord/properties">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Back to properties
        </Link>
      </Button>

      <PageHeader
        eyebrow={property.publicAddressLine}
        title={property.name}
        description={property.description.slice(0, 200)}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/landlord/properties/${property.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" aria-hidden /> Edit
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/landlord/properties/${property.id}/rooms`}>
                <DoorOpen className="mr-2 h-4 w-4" aria-hidden /> Manage rooms
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <PropertyStatusBadge status={property.status} />
        <VerificationBadge status={property.verificationStatus} />
        <Badge variant="outline" className="capitalize">
          {property.type.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total units" value={property.totalUnits} icon={<DoorOpen className="h-4 w-4" aria-hidden />} />
        <StatCard label="Available" value={property.availableUnits} icon={<Building2 className="h-4 w-4" aria-hidden />} />
        <StatCard label="Floors" value={property.totalFloors} icon={<Layers className="h-4 w-4" aria-hidden />} />
        <StatCard label="Price from" value={formatNgn(property.priceFromKobo)} icon={<CalendarCheck className="h-4 w-4" aria-hidden />} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="floors">Floors ({floors.length})</TabsTrigger>
          <TabsTrigger value="rooms">Rooms ({rooms.length})</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/90 text-pretty">{property.description}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Building-wide facilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {property.facilities.map((f) => (
                  <Badge key={f} variant="secondary">{FACILITY_LABELS[f]}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">House rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {property.rules.map((r) => (
                  <li key={r.id} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    <span>{r.label}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="floors" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Organise your property by floor. Apply default prices per floor.
            </p>
            <Button asChild size="sm">
              <Link href={`/landlord/properties/${property.id}/floors`}>
                <Settings className="mr-2 h-4 w-4" aria-hidden /> Manage floors
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {floors.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/landlord/properties/${property.id}/rooms?floor=${f.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/40"
                    >
                      <div>
                        <p className="font-medium">{f.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Level {f.level} · {f.totalUnits} units · {f.availableUnits} available
                        </p>
                      </div>
                      <div className="text-right">
                        {f.defaultPriceKobo && <Price kobo={f.defaultPriceKobo} compact period="/yr default" />}
                        <ChevronRight className="ml-2 inline h-4 w-4 text-muted-foreground" aria-hidden />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {availableRooms.length} of {rooms.length} rooms available
            </p>
            <Button asChild size="sm">
              <Link href={`/landlord/properties/${property.id}/rooms`}>
                <DoorOpen className="mr-2 h-4 w-4" aria-hidden /> Manage rooms
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {rooms.slice(0, 10).map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/landlord/rooms/${r.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/40"
                    >
                      <div>
                        <p className="font-medium">Unit {r.identifier}</p>
                        <p className="text-xs text-muted-foreground">
                          {UNIT_TYPE_LABELS[r.unitType]} · sleeps {r.capacity} · {r.status}
                        </p>
                      </div>
                      <Price kobo={r.annualRentKobo} compact period="/yr" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardContent className="p-6">
              <EmptyState
                icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
                title="No active bookings for this property"
                description="Bookings will appear here when students reserve rooms."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-3">
          <Card>
            <CardContent className="space-y-3 p-5 text-sm">
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href={`/landlord/properties/${property.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" aria-hidden /> Edit property details
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href={`/landlord/properties/${property.id}/floors`}>
                  <Layers className="mr-2 h-4 w-4" aria-hidden /> Manage floors
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href={`/landlord/properties/${property.id}/rooms`}>
                  <DoorOpen className="mr-2 h-4 w-4" aria-hidden /> Manage rooms
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
