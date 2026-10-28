"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, BedDouble, DoorOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/shared/price";
import { VerificationBadge } from "@/components/shared/status-badges";
import type { Property } from "@/lib/types";
import { FACILITY_LABELS } from "@/lib/types";

interface PropertyCardProps {
  property: Property;
  className?: string;
  /** Compact variant for horizontal lists. */
  variant?: "default" | "compact";
}

export function PropertyCard({ property, className, variant = "default" }: PropertyCardProps) {
  const cover = property.images[0];
  return (
    <Card
      className={cn(
        "group overflow-hidden p-0 transition-all hover:shadow-lg hover:-translate-y-0.5",
        className,
      )}
    >
      <Link
        href={`/properties/${property.slug}`}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.altText}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <DoorOpen className="h-8 w-8" aria-hidden />
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-1.5">
            <VerificationBadge status={property.verificationStatus} />
            {property.availableUnits > 0 && (
              <Badge className="bg-background/90 text-foreground">
                {property.availableUnits} available
              </Badge>
            )}
          </div>
          {/* Save-property toggle — only rendered for authenticated students.
              The shared SavedButton component handles the actual toggle. */}
        </div>
      </Link>
      <CardContent className={cn("space-y-2", variant === "compact" ? "p-3" : "p-4")}>
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/properties/${property.slug}`}
            className="font-display text-base font-semibold leading-tight tracking-tight hover:text-primary hover:underline"
          >
            {property.name}
          </Link>
          <Price kobo={property.priceFromKobo} compact fromLabel period="/yr" className="shrink-0" />
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {property.publicAddressLine}
        </p>
        {variant === "default" && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {property.facilities.slice(0, 3).map((f) => (
              <Badge key={f} variant="secondary" className="font-normal">
                {FACILITY_LABELS[f]}
              </Badge>
            ))}
            {property.facilities.length > 3 && (
              <Badge variant="outline" className="font-normal">
                +{property.facilities.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      {variant === "default" && (
        <CardFooter className="border-t border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BedDouble className="h-3.5 w-3.5" aria-hidden />
            {property.totalUnits} units · {property.totalFloors} floors
          </span>
        </CardFooter>
      )}
    </Card>
  );
}
