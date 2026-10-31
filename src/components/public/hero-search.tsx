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
import { fetchUniversities, fetchNeighbourhoods } from "@/lib/supabase/property-service";
import { useI18n } from "@/lib/i18n/context";

interface HeroSearchProps {
  className?: string;
  /** Layout style — banner is for the homepage hero, inline for sub-pages. */
  variant?: "banner" | "inline";
}

export function HeroSearch({ className, variant = "banner" }: HeroSearchProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [q, setQ] = React.useState("");
  const [universityId, setUniversityId] = React.useState<string>("");
  const [neighbourhoodId, setNeighbourhoodId] = React.useState<string>("");
  const [maxRentNgn, setMaxRentNgn] = React.useState<string>("");
  const [universities, setUniversities] = React.useState<any[]>([]);
  const [neighbourhoods, setNeighbourhoods] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetchUniversities().then((res) => { if (res.data) setUniversities(res.data); });
    fetchNeighbourhoods().then((res) => { if (res.data) setNeighbourhoods(res.data); });
  }, []);

  React.useEffect(() => {
    if (universityId) {
      fetchNeighbourhoods(universityId).then((res) => { if (res.data) setNeighbourhoods(res.data); });
    } else {
      fetchNeighbourhoods().then((res) => { if (res.data) setNeighbourhoods(res.data); });
    }
  }, [universityId]);

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
      aria-label={t("hero.search.ariaLabel")}
    >
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-4">
          <Label htmlFor="hero-q" className="sr-only">
            {t("hero.search.placeholder")}
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="hero-q"
              type="search"
              placeholder={t("hero.search.placeholder")}
              className="h-11 pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="md:col-span-3">
          <Label htmlFor="hero-uni" className="sr-only">
            {t("search.university")}
          </Label>
          <Select value={universityId} onValueChange={setUniversityId}>
            <SelectTrigger id="hero-uni" className="h-11">
              <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
              <SelectValue placeholder={t("search.anyUniversity")} />
            </SelectTrigger>
            <SelectContent>
              {universities.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.short_name} — {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3">
          <Label htmlFor="hero-nbg" className="sr-only">
            {t("search.neighbourhood")}
          </Label>
          <Select value={neighbourhoodId} onValueChange={setNeighbourhoodId}>
            <SelectTrigger id="hero-nbg" className="h-11">
              <MapPin className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
              <SelectValue placeholder={t("search.anyNeighbourhood")} />
            </SelectTrigger>
            <SelectContent>
              {neighbourhoods.map((n: any) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="hero-budget" className="sr-only">
            {t("hero.search.budget")}
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
              placeholder={t("hero.search.budget")}
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
          {t("hero.search.advancedFilters")}
          <ChevronDown className="h-3 w-3" aria-hidden />
        </Link>
        <Button type="submit" size="lg" className="min-w-32">
          <Search className="mr-2 h-4 w-4" aria-hidden />
          {t("hero.search.searchButton")}
        </Button>
      </div>
    </form>
  );
}
