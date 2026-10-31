"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  ShieldCheck,
  BadgeCheck,
  DoorOpen,
  Building2,
  GraduationCap,
  Lock,
  Star,
  HeartHandshake,
  Wallet,
  CalendarCheck,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionHeading } from "@/components/shared/page-components";
import { useI18n } from "@/lib/i18n/context";

// ─── Categories section ──────────────────────────────────────────────
const CATEGORY_DEFS = [
  { key: "home.categories.selfContain", icon: DoorOpen, href: "/search?unitTypes=self_contain" },
  { key: "home.categories.singleRoom", icon: Building2, href: "/search?unitTypes=single_room" },
  { key: "home.categories.sharedRoom", icon: GraduationCap, href: "/search?unitTypes=shared_room" },
  { key: "home.categories.bedSpace", icon: DoorOpen, href: "/search?unitTypes=bed_space" },
  { key: "home.categories.apartment", icon: Building2, href: "/search?unitTypes=apartment" },
  { key: "home.categories.studio", icon: Building2, href: "/search?unitTypes=studio" },
] as const;

export function HomeCategoriesSection() {
  const { t } = useI18n();
  return (
    <section className="border-y border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t("home.categories.eyebrow")}
          title={t("home.categories.title")}
          description={t("home.categories.subtitle")}
        />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORY_DEFS.map((cat) => (
            <Link
              key={cat.key}
              href={cat.href}
              className="group rounded-xl border border-border bg-background p-4 text-center transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <cat.icon className="h-5 w-5" aria-hidden />
              </div>
              <p className="mt-2 text-sm font-medium">{t(cat.key as any)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Benefits section ────────────────────────────────────────────────
export function HomeBenefitsSection() {
  const { t } = useI18n();
  const benefits = [
    { icon: ShieldCheck, title: t("home.benefits.verifiedListing.title"), desc: t("home.benefits.verifiedListing.desc") },
    { icon: DoorOpen, title: t("home.benefits.bookActualRoom.title"), desc: t("home.benefits.bookActualRoom.desc") },
    { icon: CalendarCheck, title: t("home.benefits.holdBeforePay.title"), desc: t("home.benefits.holdBeforePay.desc") },
    { icon: Wallet, title: t("home.benefits.transparentPricing.title"), desc: t("home.benefits.transparentPricing.desc") },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow={t("home.benefits.eyebrow")}
        title={t("home.benefits.title")}
        description={t("home.benefits.subtitle")}
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b) => (
          <Card key={b.title} className="h-full">
            <CardContent className="space-y-2 p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <b.icon className="h-4 w-4" aria-hidden />
              </div>
              <p className="font-display font-semibold">{b.title}</p>
              <p className="text-sm text-muted-foreground text-pretty">{b.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

// ─── Trust & verification section ────────────────────────────────────
export function HomeTrustSection() {
  const { t } = useI18n();
  const trustSteps = [
    { step: "01", title: t("home.trust.step1.title"), desc: t("home.trust.step1.desc") },
    { step: "02", title: t("home.trust.step2.title"), desc: t("home.trust.step2.desc") },
    { step: "03", title: t("home.trust.step3.title"), desc: t("home.trust.step3.desc") },
    { step: "04", title: t("home.trust.step4.title"), desc: t("home.trust.step4.desc") },
  ];
  return (
    <section className="border-y border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <Badge variant="outline" className="gap-1.5 border-success/30 bg-success/5 text-success">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {t("home.trust.eyebrow")}
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {t("home.trust.title")}
            </h2>
            <p className="text-muted-foreground text-pretty">
              {t("home.trust.subtitle")}
            </p>
            <ul className="space-y-3">
              {trustSteps.map((s) => (
                <li key={s.step} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-xs font-bold text-primary">
                    {s.step}
                  </span>
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-muted-foreground text-pretty">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline">
              <Link href="/safety">
                {t("nav.safety")}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Reuse the four benefits as supporting cards */}
            {[
              { icon: ShieldCheck, title: t("home.benefits.verifiedListing.title"), desc: t("home.benefits.verifiedListing.desc") },
              { icon: DoorOpen, title: t("home.benefits.bookActualRoom.title"), desc: t("home.benefits.bookActualRoom.desc") },
              { icon: CalendarCheck, title: t("home.benefits.holdBeforePay.title"), desc: t("home.benefits.holdBeforePay.desc") },
              { icon: Wallet, title: t("home.benefits.transparentPricing.title"), desc: t("home.benefits.transparentPricing.desc") },
            ].map((b) => (
              <Card key={b.title} className="h-full">
                <CardContent className="space-y-2 p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <b.icon className="h-4 w-4" aria-hidden />
                  </div>
                  <p className="font-display font-semibold">{b.title}</p>
                  <p className="text-sm text-muted-foreground text-pretty">{b.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQs section ────────────────────────────────────────────────────
export function HomeFaqsSection() {
  const { t } = useI18n();
  const faqs = [
    { q: t("home.faqs.q1"), a: t("home.faqs.a1") },
    { q: t("home.faqs.q2"), a: t("home.faqs.a2") },
    { q: t("home.faqs.q3"), a: t("home.faqs.a3") },
    { q: t("home.faqs.q4"), a: t("home.faqs.a4") },
    { q: t("home.faqs.q5"), a: t("home.faqs.a5") },
    { q: t("home.faqs.q6"), a: t("home.faqs.a6") },
  ];
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow={t("home.faqs.eyebrow")}
        title={t("home.faqs.title")}
        description={t("home.faqs.subtitle")}
      />
      <Accordion type="single" collapsible className="mt-6">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-left text-base font-medium">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-pretty">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/help">
            <HelpCircle className="mr-2 h-4 w-4" aria-hidden />
            {t("nav.help")}
          </Link>
        </Button>
        <Button asChild>
          <Link href="/contact">{t("footer.contactUs")}</Link>
        </Button>
      </div>
    </section>
  );
}

// ─── Final CTA section ───────────────────────────────────────────────
export function HomeFinalCtaSection() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <Card className="overflow-hidden border-primary/30 bg-primary text-primary-foreground">
        <CardContent className="flex flex-col items-start gap-5 p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {t("hero.title")}
            </h2>
            <p className="max-w-xl text-primary-foreground/80 text-pretty">
              {t("hero.subtitle")}
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/register">{t("nav.getStarted")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link href="/search">
                <Search className="mr-2 h-4 w-4" aria-hidden />
                {t("hero.browse")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

// ─── "Where we are" horizontal scrollable university strip ───────────
type University = {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  city: string;
  state: string;
  verification_status?: string;
};

export function HomeWhereWeAreSection({ universities }: { universities: University[] }) {
  const { t } = useI18n();
  return (
    <section className="border-y border-border bg-card/20">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("home.whereWeAre.eyebrow")}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
              {t("home.whereWeAre.title")}
            </h2>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href="/universities">
              {t("home.whereWeAre.viewAll")}
            </Link>
          </Button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {universities.map((u) => {
            const img = u.slug === "university-of-lagos"
              ? "/university/unilag.jpg"
              : u.slug === "university-of-nigeria-nsukka"
                ? "/university/unn.jpg"
                : null;
            const verified = u.verification_status === "approved";
            return (
              <Link
                key={u.id}
                href={`/universities/${u.slug}`}
                className="group relative h-32 w-56 shrink-0 overflow-hidden rounded-xl border border-border transition-all hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {img ? (
                  <img src={img} alt={u.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-card to-accent/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-white/90">
                    {u.short_name}
                  </p>
                  <p className="text-sm font-medium text-white truncate">
                    {u.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/70">
                    {u.city}, {u.state} · {verified ? t("home.whereWeAre.verified") : t("home.whereWeAre.pending")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Featured property badge (used inside the home page hero overlay) ─
export function HomeFeaturedPropertyBadge({ verified }: { verified: boolean }) {
  const { t } = useI18n();
  return (
    <span className="text-xs text-muted-foreground">
      {verified ? ` · ${t("home.whereWeAre.verified")}` : ` · ${t("home.whereWeAre.pending")}`}
    </span>
  );
}
