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
import { useI18n } from "@/lib/i18n/context";

export function PropertiesPage() {
  const { t } = useI18n();
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
        eyebrow={t("properties.eyebrow")}
        title={t("properties.title")}
        description={t("properties.description")}
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            placeholder={t("properties.placeholder")}
            className="h-10 pl-9"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={universityId} onValueChange={(v) => { setUniversityId(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-10 w-full sm:w-52">
            <SelectValue placeholder={t("properties.allUniversities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("properties.allUniversities")}</SelectItem>
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
            title={t("properties.error.title")}
            description={error}
            action={<Button variant="outline" onClick={() => setPage(page)}>{t("properties.retry")}</Button>}
          />
        ) : properties.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-5 w-5" aria-hidden />}
            title={t("properties.empty.title")}
            description={t("properties.empty.description")}
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("properties.showing", { x: properties.length, y: total })}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => (
                <PropertyCardAdapter key={p.id} property={p} />
              ))}
            </div>
            {total > pageSize && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  {t("properties.previous")}
                </Button>
                <span className="text-sm text-muted-foreground">{t("properties.pageOf", { x: page, y: Math.ceil(total / pageSize) })}</span>
                <Button variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>
                  {t("properties.next")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-12 rounded-xl border border-dashed border-border bg-card/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t("properties.landlordCta.prefix")}{" "}
          <Button asChild variant="link" className="h-auto p-0 text-primary">
            <Link href="/register">{t("properties.landlordCta.action")}</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
