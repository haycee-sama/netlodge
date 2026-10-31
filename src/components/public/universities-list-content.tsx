"use client";

import * as React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { UniversityCard } from "@/components/public/university-card";
import { PageHeader, SectionHeading } from "@/components/shared/page-components";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/context";

type UniversityListItem = {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  city: string;
  state: string;
  description: string | null;
  totalListings?: number;
};

interface UniversitiesListContentProps {
  universities: UniversityListItem[];
  error?: string | null;
}

export function UniversitiesListContent({ universities, error }: UniversitiesListContentProps) {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={t("universities.eyebrow")}
        title={t("universities.title")}
        description={t("universities.description")}
      />
      {error ? (
        <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          {t("universities.error")}
        </div>
      ) : !universities || universities.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("universities.empty")}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((u) => (
            <UniversityCard
              key={u.id}
              university={{
                id: u.id,
                name: u.name,
                shortName: u.short_name,
                slug: u.slug,
                city: u.city,
                state: u.state,
                description: u.description ?? "",
                popularNeighbourhoods: [],
                totalListings: u.totalListings ?? 0,
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-16">
        <SectionHeading
          eyebrow={t("universities.comingSoon.eyebrow")}
          title={t("universities.comingSoon.title")}
          description={t("universities.comingSoon.description")}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {["UNN", "OAU", "UI", "UNIBEN", "ABU", "UNIPORT", "UNICAL", "BUK"].map((s) => (
            <Badge key={s} variant="outline" className="gap-1.5 py-1.5 pl-2 pr-3">
              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {s}
              <span className="text-xs text-muted-foreground">· {t("universities.comingSoon.soon")}</span>
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-16 rounded-xl border border-dashed border-border bg-card/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t("universities.requestCampus.prefix")}{" "}
          <Link href="/contact" className="font-medium text-primary hover:underline">
            {t("universities.requestCampus.action")}
          </Link>{" "}
          {t("universities.requestCampus.suffix")}
        </p>
      </div>
    </div>
  );
}
