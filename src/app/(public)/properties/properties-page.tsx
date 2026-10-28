"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Loader2, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { fetchProperties, fetchUniversities, type PropertyWithRelations } from "@/lib/supabase/property-service";
import { PropertyCardAdapter } from "@/components/public/property-card-adapter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PropertiesPage() {
  const [properties, setProperties] = React.useState<PropertyWithRelations[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [universityId, setUniversityId] = React.useState<string>("");
  const [universities, setUniversities] = React.useState<{ id: string; name: string; short_name: string }[]>([]);
  const [page, setPage] = React.useState(1);
  const pageSize = 12;

  React.useEffect(() => {
    fetchUniversities().then((res) => {
      if (res.data) setUniversities(res.data);
    });
  }, []);

  React.useEffect(() => {
    setLoading(true);
    setError(null);
    fetchProperties({
      q: q || undefined,
      universityId: universityId || undefined,
      page,
      pageSize,
    }).then((res) => {
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setProperties(res.data.items);
        setTotal(res.data.total);
      }
      setLoading(false);
    });
  }, [q, universityId, page]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Property directory"
        title="All verified properties"
        description="Every property below has passed identity, address and ownership verification. Each one contains individual bookable rooms, self-contain units or apartments."
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            placeholder="Search by name, area, or keyword…"
            className="h-10 pl-9"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={universityId} onValueChange={(v) => { setUniversityId(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-10 w-full sm:w-52">
            <SelectValue placeholder="All universities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All universities</SelectItem>
            {universities.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.short_name} — {u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : error ? (
          <EmptyState
            icon={<Building2 className="h-5 w-5" aria-hidden />}
            title="Could not load properties"
            description={error}
            action={<Button variant="outline" onClick={() => setPage(page)}>Retry</Button>}
          />
        ) : properties.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-5 w-5" aria-hidden />}
            title="No properties found"
            description="Try adjusting your search or check back soon as landlords list new properties."
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Showing <strong className="text-foreground">{properties.length}</strong> of{" "}
              <strong className="text-foreground">{total}</strong> properties
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => (
                <PropertyCardAdapter key={p.id} property={p} />
              ))}
            </div>
            {total > pageSize && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / pageSize)}</span>
                <Button variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-12 rounded-xl border border-dashed border-border bg-card/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Are you a landlord with rooms to fill?{" "}
          <Button asChild variant="link" className="h-auto p-0 text-primary">
            <Link href="/register">List your property</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
