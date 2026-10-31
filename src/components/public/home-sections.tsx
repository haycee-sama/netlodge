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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { PropertyCardAdapter } from "@/components/public/property-card-adapter";
import { SectionHeading } from "@/components/shared/page-components";
import { useI18n } from "@/lib/i18n/context";
import type { PropertyWithRelations } from "@/lib/supabase/property-service";

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

// ─── Featured listings section ───────────────────────────────────────
export function HomeFeaturedSection({ properties }: { properties: PropertyWithRelations[] }) {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow={t("home.featured.eyebrow")}
        title={t("home.featured.title")}
        description={t("home.featured.description")}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/properties">
              {t("home.featured.viewAll")}
            </Link>
          </Button>
        }
      />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {properties.length > 0 ? (
          properties.map((p) => (
            <PropertyCardAdapter key={p.id} property={p} />
          ))
        ) : (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            {t("home.featured.emptyState")}
          </p>
        )}
      </div>
    </section>
  );
}

// ─── Fresh on NetLodge carousel section ──────────────────────────────
export function HomeFreshCarouselSection({ properties }: { properties: PropertyWithRelations[] }) {
  const { t } = useI18n();
  return (
    <section className="border-y border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t("home.fresh.eyebrow")}
          title={t("home.fresh.title")}
          description={t("home.fresh.description")}
        />
        <div className="mt-6">
          <Carousel
            opts={{ align: "start", loop: false }}
            className="w-full"
            aria-label={t("home.fresh.ariaLabel")}
          >
            <CarouselContent className="-ml-4">
              {properties.map((p) => (
                <CarouselItem key={p.id} className="pl-4 sm:basis-1/2 lg:basis-1/3">
                  <PropertyCardAdapter property={p} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}

// ─── Student benefits section (4 cards) ──────────────────────────────
export function HomeStudentBenefitsSection() {
  const { t } = useI18n();
  const cards = [
    { icon: GraduationCap, title: t("home.studentBenefits.builtForCampus.title"), text: t("home.studentBenefits.builtForCampus.desc") },
    { icon: Lock, title: t("home.studentBenefits.safeHolds.title"), text: t("home.studentBenefits.safeHolds.desc") },
    { icon: Star, title: t("home.studentBenefits.honestListings.title"), text: t("home.studentBenefits.honestListings.desc") },
    { icon: HeartHandshake, title: t("home.studentBenefits.realSupport.title"), text: t("home.studentBenefits.realSupport.desc") },
  ];
  return (
    <section className="border-y border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t("home.studentBenefits.eyebrow")}
          title={t("home.studentBenefits.title")}
          description={t("home.studentBenefits.description")}
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((b) => (
            <Card key={b.title} className="h-full">
              <CardContent className="space-y-2 p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <b.icon className="h-4 w-4" aria-hidden />
                </div>
                <p className="font-display font-semibold">{b.title}</p>
                <p className="text-sm text-muted-foreground text-pretty">{b.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6">
          <Button asChild>
            <Link href="/register">
              {t("home.studentBenefits.createAccount")}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Landlord CTA section ────────────────────────────────────────────
export function HomeLandlordCtaSection() {
  const { t } = useI18n();
  const features = [
    t("home.landlordCta.feature1"),
    t("home.landlordCta.feature2"),
    t("home.landlordCta.feature3"),
    t("home.landlordCta.feature4"),
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/20">
        <CardContent className="grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 text-primary">
              <Building2 className="h-3.5 w-3.5" aria-hidden />
              {t("home.landlordCta.eyebrow")}
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {t("home.landlordCta.title")}
            </h2>
            <p className="text-muted-foreground text-pretty">
              {t("home.landlordCta.description")}
            </p>
            <ul className="space-y-2 text-sm">
              {features.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/register">
                  {t("home.landlordCta.startListing")}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/how-it-works#landlords">{t("home.landlordCta.guide")}</Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-muted shadow-sm">
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="h-24 w-24 text-primary/20" aria-hidden />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

// ─── How it works CTA section ────────────────────────────────────────
export function HomeHowItWorksCtaSection({
  hasTestimonials,
}: {
  hasTestimonials?: boolean;
}) {
  const { t } = useI18n();
  return (
    <section
      className={cn(
        "border-y border-border bg-card/30",
        hasTestimonials && "border-t-0",
      )}
    >
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          {t("home.howItWorksCta.title")}
        </h2>
        <p className="mt-3 text-base text-muted-foreground text-pretty">
          {t("home.howItWorksCta.description")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/search">
              <Search className="mr-2 h-4 w-4" aria-hidden />
              {t("home.howItWorksCta.browse")}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/how-it-works">{t("home.howItWorksCta.howItWorks")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials section ────────────────────────────────────────────
type Testimonial = {
  id: string;
  quote: string;
  rating: number | null;
  authorName: string;
  authorRole: string | null;
  authorUniversity: string | null;
  authorLevel: string | null;
};

export function HomeTestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  const { t } = useI18n();
  if (!testimonials || testimonials.length === 0) return null;
  return (
    <section className="border-y border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t("home.testimonials.eyebrow")}
          title={t("home.testimonials.title")}
          description={t("home.testimonials.description")}
        />
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((tm) => (
            <Card key={tm.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                {tm.rating && (
                  <div className="flex gap-0.5" aria-label={`${tm.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn("h-4 w-4", i < tm.rating! ? "fill-primary text-primary" : "text-muted-foreground/30")}
                        aria-hidden
                      />
                    ))}
                  </div>
                )}
                <blockquote className="flex-1 text-sm leading-relaxed text-pretty">
                  &ldquo;{tm.quote}&rdquo;
                </blockquote>
                <div className="space-y-0.5 border-t border-border pt-3">
                  <p className="text-sm font-semibold">{tm.authorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {tm.authorRole === "student" && tm.authorUniversity
                      ? `${tm.authorRole}, ${tm.authorUniversity}${tm.authorLevel ? ` · ${tm.authorLevel}` : ""}`
                      : tm.authorRole === "landlord"
                        ? tm.authorRole
                        : tm.authorRole === "parent"
                          ? tm.authorRole
                          : tm.authorRole ?? ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
