"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  BadgeCheck,
  FileSearch,
  Lock,
  AlertTriangle,
  HandCoins,
  Eye,
  Scale,
  ArrowRight,
} from "lucide-react";
import { PageHeader, SectionHeading } from "@/components/shared/page-components";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/context";

export function SafetyContent() {
  const { t } = useI18n();

  const verificationTypes = [
    { icon: BadgeCheck, title: t("safety.verification.identity.title"), text: t("safety.verification.identity.desc") },
    { icon: FileSearch, title: t("safety.verification.address.title"), text: t("safety.verification.address.desc") },
    { icon: Scale, title: t("safety.verification.ownership.title"), text: t("safety.verification.ownership.desc") },
    { icon: Eye, title: t("safety.verification.inspection.title"), text: t("safety.verification.inspection.desc") },
  ];

  const bookingPoints = [
    t("safety.bookingSafety.fundsHeld"),
    t("safety.bookingSafety.backendVerifies"),
    t("safety.bookingSafety.cautionTracked"),
    t("safety.bookingSafety.payoutsAfterConfirm"),
    t("safety.bookingSafety.refundsProcessed"),
    t("safety.bookingSafety.auditTrail"),
  ];

  const safetyTips = [
    t("safety.tips.tip1"),
    t("safety.tips.tip2"),
    t("safety.tips.tip3"),
    t("safety.tips.tip4"),
    t("safety.tips.tip5"),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={t("safety.eyebrow")}
        title={t("safety.title")}
        description={t("safety.description")}
      />

      {/* Verification pillars */}
      <section id="landlords" className="mt-10 scroll-mt-20">
        <SectionHeading
          eyebrow={t("safety.landlordVerification.eyebrow")}
          title={t("safety.landlordVerification.title")}
          description={t("safety.landlordVerification.description")}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {verificationTypes.map((v) => (
            <Card key={v.title} className="h-full">
              <CardContent className="space-y-3 p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success">
                  <v.icon className="h-4 w-4" aria-hidden />
                </div>
                <p className="font-display font-semibold">{v.title}</p>
                <p className="text-sm text-muted-foreground text-pretty">{v.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Booking safety */}
      <section id="booking" className="mt-16 scroll-mt-20">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-6 sm:p-8">
            <Badge variant="outline" className="gap-1.5 border-success/30 bg-success/10 text-success">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              {t("safety.bookingSafety.eyebrow")}
            </Badge>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">
              {t("safety.bookingSafety.title")}
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground text-pretty">
              {t("safety.bookingSafety.description")}
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {bookingPoints.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Student safety tips */}
      <section className="mt-16">
        <SectionHeading
          eyebrow={t("safety.tips.eyebrow")}
          title={t("safety.tips.title")}
          description={t("safety.tips.description")}
        />
        <Card className="mt-5">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {safetyTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 p-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground/90 text-pretty">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Report */}
      <section className="mt-16">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="gap-1.5 border-destructive/30 bg-destructive/10 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                {t("safety.report.eyebrow")}
              </Badge>
              <h2 className="font-display text-xl font-bold tracking-tight">
                {t("safety.report.title")}
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
                {t("safety.report.description")}
              </p>
            </div>
            <Button asChild variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Link href="/contact">
                {t("safety.report.action")}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Refund policy summary */}
      <section className="mt-16">
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="font-display text-xl font-bold tracking-tight">{t("safety.refund.title")}</h2>
            </div>
            <RefundDescription />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// Renders the refund description with the in-line terms link.
// The translated description contains the {terms} placeholder which we
// split on so the terms text becomes a clickable Link.
function RefundDescription() {
  const { t } = useI18n();
  const description = t("safety.refund.description");
  const termsLabel = t("safety.refund.viewTerms");
  // We don't use the t() vars substitution here because we want the
  // terms text to be wrapped in a Link — split manually instead.
  const parts = description.split("{terms}");
  return (
    <p className="text-sm text-muted-foreground text-pretty">
      {parts.length > 1 ? (
        <>
          {parts[0]}
          <Link href="/terms" className="text-primary hover:underline">
            {termsLabel}
          </Link>
          {parts[1]}
        </>
      ) : (
        description
      )}
    </p>
  );
}
