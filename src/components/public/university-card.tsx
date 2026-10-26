"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { GraduationCap, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { University } from "@/lib/types";

export function UniversityCard({ university }: { university: University }) {
  return (
    <Link
      href={`/universities/${university.slug}`}
      className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full overflow-hidden p-0 transition-all hover:shadow-lg hover:-translate-y-0.5">
        <div className="relative aspect-[5/3] overflow-hidden bg-gradient-to-br from-primary/10 via-card to-accent/20">
          <div className="absolute inset-0 flex items-center justify-center">
            <GraduationCap className="h-12 w-12 text-primary/30" aria-hidden />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <Badge className="bg-background/85 text-foreground backdrop-blur-sm">
              {university.shortName}
            </Badge>
          </div>
        </div>
        <CardContent className="space-y-2 p-4">
          <h3 className="font-display text-base font-semibold leading-tight tracking-tight group-hover:text-primary">
            {university.name}
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {university.city}, {university.state}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {university.popularNeighbourhoods.slice(0, 3).map((n) => (
              <Badge key={n} variant="secondary" className="font-normal">
                {n}
              </Badge>
            ))}
          </div>
          <p className="pt-1 text-sm font-medium text-primary">
            {university.totalListings} listings
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
