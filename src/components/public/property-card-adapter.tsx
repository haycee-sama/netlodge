"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, DoorOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import type { PropertyWithRelations } from "@/lib/supabase/property-service";
import type { Property, VerificationStatus, PropertyStatus } from "@/lib/types";
import { formatNgn } from "@/lib/utils/format";

/**
 * Adapts a Supabase property (PropertyWithRelations) to the existing PropertyCard UI.
 * Converts the Supabase row shape into the domain Property type used by PropertyCard.
 */
export function PropertyCardAdapter({ property }: { property: PropertyWithRelations }) {
  // Convert Supabase row to domain type
  const domainProperty: Property = {
    id: property.id,
    slug: property.slug,
    landlordId: property.landlord_id,
    managerIds: [],
    agentIds: [],
    name: property.name,
    description: property.description,
    type: property.type as Property["type"],
    status: property.status as PropertyStatus,
    verificationStatus: property.verification_status as VerificationStatus,
    city: property.city,
    state: property.state,
    neighbourhoodId: property.neighbourhood_id ?? "",
    universityId: property.university_id ?? "",
    publicAddressLine: property.public_address_line,
    privateAddressLine: property.private_address_line,
    latitude: property.latitude,
    longitude: property.longitude,
    facilities: (property.property_facilities ?? []).map((f) => f.facility as Property["facilities"][0]),
    rules: [],
    images: [],
    totalFloors: property.total_floors,
    totalUnits: property.total_units,
    availableUnits: property.available_units,
    occupiedUnits: property.occupied_units,
    heldUnits: property.held_units,
    priceFromKobo: property.price_from_kobo,
    createdAt: property.created_at,
    updatedAt: property.updated_at,
  };

  // Get cover image (first image or fallback)
  const coverImage = property.property_images?.[0];
  const universityName = property.universities?.name;

  return (
    <Card className="group overflow-hidden p-0 transition-all hover:shadow-lg hover:-translate-y-0.5">
      <Link
        href={`/properties/${property.slug}`}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {coverImage?.public_url ? (
            <img
              src={coverImage.public_url}
              alt={coverImage.alt_text || property.name}
              className="object-cover transition-transform duration-500 group-hover:scale-105 w-full h-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <DoorOpen className="h-8 w-8" aria-hidden />
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-1.5">
            <VerificationBadge status={domainProperty.verificationStatus} />
            {property.available_units > 0 && (
              <Badge className="bg-background/90 text-foreground">
                {property.available_units} available
              </Badge>
            )}
          </div>
        </div>
      </Link>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/properties/${property.slug}`}
            className="font-display text-base font-semibold leading-tight tracking-tight hover:text-primary hover:underline"
          >
            {property.name}
          </Link>
          <Price kobo={property.price_from_kobo} compact fromLabel period="/yr" className="shrink-0" />
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {property.public_address_line}
          {universityName && <span className="text-muted-foreground/70">· {universityName}</span>}
        </p>
        {(property.property_facilities ?? []).length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {(property.property_facilities ?? []).slice(0, 3).map((f) => (
              <Badge key={f.facility} variant="secondary" className="font-normal capitalize">
                {f.facility.replace(/_/g, " ")}
              </Badge>
            ))}
            {(property.property_facilities ?? []).length > 3 && (
              <Badge variant="outline" className="font-normal">
                +{(property.property_facilities ?? []).length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <DoorOpen className="h-3.5 w-3.5" aria-hidden />
          {property.total_units} units · {property.total_floors} floors
        </span>
      </CardFooter>
    </Card>
  );
}
