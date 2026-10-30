"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/context";

interface HomepageStats {
  verifiedProperties?: number;
  totalRooms?: number;
  universities?: number;
}

/**
 * Client-side hero intro for the homepage. The homepage page.tsx is a server
 * component (it fetches data server-side), so the translatable hero text is
 * extracted into this client component which uses the useI18n() hook.
 */
export function HeroIntro({ stats }: { stats: HomepageStats }) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 text-primary">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Now serving UNILAG, Akoka, Yaba, Bariga & Somolu
      </Badge>
      <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-balance sm:text-5xl lg:text-6xl">
        {t("hero.titlePrefix")} <span className="text-gradient-brand">{t("hero.titleHighlight")}</span> {t("hero.titleSuffix")}
      </h1>
      <p className="max-w-xl text-base text-muted-foreground text-pretty sm:text-lg">
        {t("hero.subtitle")}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link href="/search">
            <Search className="mr-2 h-4 w-4" aria-hidden />
            {t("hero.browse")}
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/register">
            {t("hero.listProperty")}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
      <dl className="grid grid-cols-3 gap-4 pt-4 text-sm">
        <div className="space-y-0.5">
          <dt className="text-muted-foreground">{t("nav.properties")}</dt>
          <dd className="font-display text-2xl font-bold tabular-nums">{stats?.verifiedProperties ?? 0}</dd>
        </div>
        <div className="space-y-0.5">
          <dt className="text-muted-foreground">{t("hero.findYourKind").split(" ").slice(-1)[0]}</dt>
          <dd className="font-display text-2xl font-bold tabular-nums">{stats?.totalRooms ?? 0}</dd>
        </div>
        <div className="space-y-0.5">
          <dt className="text-muted-foreground">{t("nav.universities")}</dt>
          <dd className="font-display text-2xl font-bold tabular-nums">{stats?.universities ?? 0}</dd>
        </div>
      </dl>
    </div>
  );
}
