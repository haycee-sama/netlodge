"use client";

import * as React from "react";
import Link from "next/link";
import {
  HelpCircle,
  Search,
  CalendarCheck,
  CreditCard,
  ShieldCheck,
  Building2,
  UserCog,
  ArrowRight,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader, SectionHeading } from "@/components/shared/page-components";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/context";

export function HelpContent() {
  const { t } = useI18n();

  const categories = [
    { icon: Search, title: t("help.categories.findingAccommodation.title"), text: t("help.categories.findingAccommodation.desc") },
    { icon: CalendarCheck, title: t("help.categories.bookings.title"), text: t("help.categories.bookings.desc") },
    { icon: CreditCard, title: t("help.categories.payments.title"), text: t("help.categories.payments.desc") },
    { icon: ShieldCheck, title: t("help.categories.verification.title"), text: t("help.categories.verification.desc") },
    { icon: Building2, title: t("help.categories.listing.title"), text: t("help.categories.listing.desc") },
    { icon: UserCog, title: t("help.categories.account.title"), text: t("help.categories.account.desc") },
  ];

  const faqGroups = [
    {
      cat: t("help.categories.findingAccommodation.title"),
      items: [
        { q: t("help.faqs.finding.q1"), a: t("help.faqs.finding.a1") },
        { q: t("help.faqs.finding.q2"), a: t("help.faqs.finding.a2") },
        { q: t("help.faqs.finding.q3"), a: t("help.faqs.finding.a3") },
      ],
    },
    {
      cat: t("help.categories.bookings.title"),
      items: [
        { q: t("help.faqs.bookings.q1"), a: t("help.faqs.bookings.a1") },
        { q: t("help.faqs.bookings.q2"), a: t("help.faqs.bookings.a2") },
        { q: t("help.faqs.bookings.q3"), a: t("help.faqs.bookings.a3") },
      ],
    },
    {
      cat: t("help.categories.payments.title"),
      items: [
        { q: t("help.faqs.payments.q1"), a: t("help.faqs.payments.a1") },
        { q: t("help.faqs.payments.q2"), a: t("help.faqs.payments.a2") },
        { q: t("help.faqs.payments.q3"), a: t("help.faqs.payments.a3") },
      ],
    },
    {
      cat: t("help.categories.listing.title"),
      items: [
        { q: t("help.faqs.listing.q1"), a: t("help.faqs.listing.a1") },
        { q: t("help.faqs.listing.q2"), a: t("help.faqs.listing.a2") },
        { q: t("help.faqs.listing.q3"), a: t("help.faqs.listing.a3") },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={t("help.eyebrow")}
        title={t("help.title")}
        description={t("help.description")}
      />

      <div className="mt-6 max-w-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            placeholder={t("help.searchPlaceholder")}
            className="h-11 pl-9"
            aria-label={t("help.searchLabel")}
          />
        </div>
      </div>

      {/* Categories */}
      <section className="mt-10">
        <SectionHeading eyebrow={t("help.categories.eyebrow")} title={t("help.categories.title")} />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.title} className="h-full transition-all hover:shadow-md">
              <CardContent className="space-y-2 p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <c.icon className="h-4 w-4" aria-hidden />
                </div>
                <p className="font-display font-semibold">{c.title}</p>
                <p className="text-sm text-muted-foreground">{c.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="mt-12">
        <SectionHeading eyebrow={t("help.faqs.eyebrow")} title={t("help.faqs.title")} />
        <div className="mt-5 space-y-8">
          {faqGroups.map((group, gi) => (
            <div key={gi}>
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                <HelpCircle className="h-4 w-4 text-primary" aria-hidden />
                {group.cat}
              </h3>
              <Accordion type="single" collapsible>
                {group.items.map((item, i) => (
                  <AccordionItem key={i} value={`${gi}-${i}`}>
                    <AccordionTrigger className="text-left text-sm font-medium">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground text-pretty">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="mt-16">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/10">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="space-y-1">
              <p className="font-display text-lg font-bold">{t("help.contactCta.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("help.contactCta.description")}
              </p>
            </div>
            <Button asChild>
              <Link href="/contact">
                {t("help.contactCta.action")}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
