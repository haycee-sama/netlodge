"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MapPin, GraduationCap, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { universities, neighbourhoods } from "@/lib/data/fixtures";

interface HeroSearchProps {
  className?: string;
  /** Layout style — banner is for the homepage hero, inline for sub-pages. */
  variant?: "banner" | "inline";
}

export function HeroSearch({ className, variant = "banner" }: HeroSearchProps) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [universityId, setUniversityId] = React.useState<string>("");
  const [neighbourhoodId, setNeighbourhoodId] = React.useState<string>("");
  const [maxRentNgn, setMaxRentNgn] = React.useState<string>("");

  const availableNeighbourhoods = React.useMemo(
    () =>
      universityId
        ? neighbourhoods.filter((n) => n.universityId === universityId)
        : neighbourhoods,
    [universityId],
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (universityId) params.set("universityId", universityId);
    if (neighbourhoodId) params.set("neighbourhoodId", neighbourhoodId);
    if (maxRentNgn) {
      const kobo = Math.round(Number(maxRentNgn) * 100);
      if (!Number.isNaN(kobo)) params.set("maxPriceKobo", String(kobo));
    }
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4",
        variant === "banner" && "lg:p-5",
        className,
      )}
      aria-label="Search accommodation"
    >
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-4">
          <Label htmlFor="hero-q" className="sr-only">
            Search by name or keyword
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="hero-q"
              type="search"
              placeholder="Property name, area, or keyword"
              className="h-11 pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="md:col-span-3">
          <Label htmlFor="hero-uni" className="sr-only">
            University
          </Label>
          <Select value={universityId} onValueChange={setUniversityId}>
            <SelectTrigger id="hero-uni" className="h-11">
              <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
              <SelectValue placeholder="Any university" />
            </SelectTrigger>
            <SelectContent>
              {universities.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.shortName} — {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3">
          <Label htmlFor="hero-nbg" className="sr-only">
            Neighbourhood
          </Label>
          <Select value={neighbourhoodId} onValueChange={setNeighbourhoodId}>
            <SelectTrigger id="hero-nbg" className="h-11">
              <MapPin className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
              <SelectValue placeholder="Any neighbourhood" />
            </SelectTrigger>
            <SelectContent>
              {availableNeighbourhoods.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="hero-budget" className="sr-only">
            Max annual rent (NGN)
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              ₦
            </span>
            <Input
              id="hero-budget"
              type="number"
              min={0}
              step={50000}
              placeholder="Budget"
              className="h-11 pl-7"
              value={maxRentNgn}
              onChange={(e) => setMaxRentNgn(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Link
          href="/search"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Advanced filters
          <ChevronDown className="h-3 w-3" aria-hidden />
        </Link>
        <Button type="submit" size="lg" className="min-w-32">
          <Search className="mr-2 h-4 w-4" aria-hidden />
          Search
        </Button>
      </div>
    </form>
  );
}
