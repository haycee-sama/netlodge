"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search as SearchIcon,
  SlidersHorizontal,
  X,
  Building2,
  MapPin,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PropertyCard } from "@/components/public/property-card";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { fetchUniversities, fetchNeighbourhoods, fetchProperties } from "@/lib/supabase/property-service";
import type { Property, SearchFilters, RentableUnitType, Facility } from "@/lib/types";
import { FACILITY_LABELS, UNIT_TYPE_LABELS } from "@/lib/types";
import { ngnToKobo } from "@/lib/utils/format";
import { Skeleton } from "@/components/ui/skeleton";

const UNIT_TYPE_OPTIONS = Object.entries(UNIT_TYPE_LABELS) as [RentableUnitType, string][];
const FACILITY_OPTIONS = Object.keys(FACILITY_LABELS) as Facility[];
const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
] as const;

export function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = React.useState(true);
  const [results, setResults] = React.useState<Property[]>([]);
  const [total, setTotal] = React.useState(0);
  const [facets, setFacets] = React.useState<{
    unitTypes: { value: RentableUnitType; count: number }[];
    facilities: { value: Facility; count: number }[];
    priceBuckets: { label: string; count: number }[];
  } | null>(null);

  // Pull initial state from URL
  const [q, setQ] = React.useState(searchParams.get("q") ?? "");
  const [universityId, setUniversityId] = React.useState(searchParams.get("universityId") ?? "");
  const [neighbourhoodId, setNeighbourhoodId] = React.useState(searchParams.get("neighbourhoodId") ?? "");
  const [minRentNgn, setMinRentNgn] = React.useState(() => {
    const k = searchParams.get("minPriceKobo");
    return k ? String(Number(k) / 100) : "";
  });
  const [maxRentNgn, setMaxRentNgn] = React.useState(() => {
    const k = searchParams.get("maxPriceKobo");
    return k ? String(Number(k) / 100) : "";
  });
  const [unitTypes, setUnitTypes] = React.useState<RentableUnitType[]>(
    (searchParams.get("unitTypes")?.split(",").filter(Boolean) as RentableUnitType[]) ?? [],
  );
  const [facilities, setFacilities] = React.useState<Facility[]>(
    (searchParams.get("facilities")?.split(",").filter(Boolean) as Facility[]) ?? [],
  );
  const [sortBy, setSortBy] = React.useState<(typeof SORT_OPTIONS)[number]["value"]>(
    (searchParams.get("sortBy") as typeof sortBy) ?? "relevance",
  );

  const [universities, setUniversities] = React.useState<any[]>([]);
  const [neighbourhoods, setNeighbourhoods] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetchUniversities().then((res) => { if (res.data) setUniversities(res.data); });
  }, []);

  const availableNeighbourhoods = React.useMemo(
    () =>
      universityId
        ? neighbourhoods.filter((n: any) => n.university_id === universityId || !n.university_id)
        : neighbourhoods,
    [universityId, neighbourhoods],
  );

  React.useEffect(() => {
    fetchNeighbourhoods(universityId || undefined).then((res) => {
      if (res.data) setNeighbourhoods(res.data);
    });
  }, [universityId]);

  // Re-run search when filters change (debounced via effect).
  React.useEffect(() => {
    const filters: SearchFilters = {
      q: q || undefined,
      universityId: universityId || undefined,
      neighbourhoodId: neighbourhoodId || undefined,
      minPriceKobo: minRentNgn ? ngnToKobo(Number(minRentNgn)) : undefined,
      maxPriceKobo: maxRentNgn ? ngnToKobo(Number(maxRentNgn)) : undefined,
      unitTypes: unitTypes.length ? unitTypes : undefined,
      facilities: facilities.length ? facilities : undefined,
      sortBy,
      page: 1,
      pageSize: 24,
    };
    // Sync URL (replace, not push, to keep history tidy on filter changes)
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.universityId) params.set("universityId", filters.universityId);
    if (filters.neighbourhoodId) params.set("neighbourhoodId", filters.neighbourhoodId);
    if (filters.minPriceKobo) params.set("minPriceKobo", String(filters.minPriceKobo));
    if (filters.maxPriceKobo) params.set("maxPriceKobo", String(filters.maxPriceKobo));
    if (filters.unitTypes) params.set("unitTypes", filters.unitTypes.join(","));
    if (filters.facilities) params.set("facilities", filters.facilities.join(","));
    if (filters.sortBy && filters.sortBy !== "relevance") params.set("sortBy", filters.sortBy);
    const qs = params.toString();
    router.replace(`/search${qs ? `?${qs}` : ""}`, { scroll: false });

    setLoading(true);
    const t = setTimeout(() => {
      fetchProperties({
        q: q || undefined,
        universityId: universityId || undefined,
        neighbourhoodId: neighbourhoodId || undefined,
        minPriceKobo: minRentNgn ? ngnToKobo(Number(minRentNgn)) : undefined,
        maxPriceKobo: maxRentNgn ? ngnToKobo(Number(maxRentNgn)) : undefined,
        page: 1,
        pageSize: 50,
      }).then((res) => {
        if (res.error) {
          setResults([]);
          setTotal(0);
        } else if (res.data) {
          setResults(res.data as any);
          setTotal(res.data.total ?? res.data.items?.length ?? 0);
        }
        setFacets(null); // facets not available from live API yet
        setLoading(false);
      });
    }, 180);
    return () => clearTimeout(t);
  }, [q, universityId, neighbourhoodId, minRentNgn, maxRentNgn, unitTypes, facilities, sortBy]);

  function toggleArray<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function resetAll() {
    setQ("");
    setUniversityId("");
    setNeighbourhoodId("");
    setMinRentNgn("");
    setMaxRentNgn("");
    setUnitTypes([]);
    setFacilities([]);
    setSortBy("relevance");
  }

  const activeFilterCount =
    (q ? 1 : 0) +
    (universityId ? 1 : 0) +
    (neighbourhoodId ? 1 : 0) +
    (minRentNgn ? 1 : 0) +
    (maxRentNgn ? 1 : 0) +
    unitTypes.length +
    facilities.length;

  const FiltersPanel = (
    <div className="space-y-6">
      {/* University */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          University
        </Label>
        <Select value={universityId} onValueChange={setUniversityId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any university" />
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

      {/* Neighbourhood */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Neighbourhood
        </Label>
        <Select value={neighbourhoodId} onValueChange={setNeighbourhoodId}>
          <SelectTrigger className="w-full">
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

      <Separator />

      {/* Budget */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Annual rent (NGN)
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={0}
            step={50000}
            placeholder="Min"
            value={minRentNgn}
            onChange={(e) => setMinRentNgn(e.target.value)}
          />
          <Input
            type="number"
            min={0}
            step={50000}
            placeholder="Max"
            value={maxRentNgn}
            onChange={(e) => setMaxRentNgn(e.target.value)}
          />
        </div>
      </div>

      <Separator />

      {/* Unit type */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Unit type
        </Label>
        <div className="space-y-2">
          {UNIT_TYPE_OPTIONS.map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 text-sm"
              htmlFor={`ut-${value}`}
            >
              <Checkbox
                id={`ut-${value}`}
                checked={unitTypes.includes(value)}
                onCheckedChange={() => setUnitTypes((arr) => toggleArray(arr, value))}
              />
              <span className="flex-1">{label}</span>
              {facets && (
                <span className="text-xs text-muted-foreground">
                  {facets.unitTypes.find((u) => u.value === value)?.count ?? 0}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Facilities */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Facilities
        </Label>
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {FACILITY_OPTIONS.map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 text-sm"
              htmlFor={`fa-${value}`}
            >
              <Checkbox
                id={`fa-${value}`}
                checked={facilities.includes(value)}
                onCheckedChange={() => setFacilities((arr) => toggleArray(arr, value))}
              />
              <span className="flex-1">{FACILITY_LABELS[value]}</span>
              {facets && (
                <span className="text-xs text-muted-foreground">
                  {facets.facilities.find((f) => f.value === value)?.count ?? 0}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" className="w-full" onClick={resetAll}>
          Reset all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Search"
        title="Find your accommodation"
        description="Filter by university, neighbourhood, budget, unit type and facilities."
      />

      {/* Search bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Property name, area, or keyword"
            className="h-11 pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="h-11 sm:w-56">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Mobile filter trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-11 lg:hidden">
              <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full max-w-xs overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4">{FiltersPanel}</div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Desktop filters sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Filters</p>
              {activeFilterCount > 0 && (
                <Badge variant="secondary">{activeFilterCount} active</Badge>
              )}
            </div>
            {FiltersPanel}
          </div>
        </aside>

        {/* Results */}
        <section>
          <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
            <p>
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Searching…
                </span>
              ) : (
                <span>
                  <strong className="text-foreground">{total}</strong> result{total === 1 ? "" : "s"}
                </span>
              )}
            </p>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetAll}>
                Clear filters
                <X className="ml-1 h-3 w-3" aria-hidden />
              </Button>
            )}
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-5 w-5" aria-hidden />}
              title="No matches found"
              description="Try widening your filters — remove a budget cap, expand your neighbourhood, or change your unit type."
              action={
                <Button variant="outline" onClick={resetAll}>
                  Reset all filters
                </Button>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
