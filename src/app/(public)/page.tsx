import * as React from "react";
import Link from "next/link";
import {
  Search,
  ShieldCheck,
  BadgeCheck,
  DoorOpen,
  Building2,
  GraduationCap,
  HeartHandshake,
  Wallet,
  CalendarCheck,
  Sparkles,
  Home,
  Users,
  Star,
  Lock,
  ChevronRight,
  ArrowRight,
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
import { HeroSearch } from "@/components/public/hero-search";
import { HeroIntro } from "@/components/public/hero-intro";
import { UniversityCard } from "@/components/public/university-card";
import { SectionHeading } from "@/components/shared/page-components";
import { fetchPropertiesServer, fetchUniversitiesServer, fetchHomepageStatsServer, fetchPublishedTestimonialsServer } from "@/lib/supabase/property-server";
import { PropertyCardAdapter } from "@/components/public/property-card-adapter";
import { FACILITY_LABELS } from "@/lib/types";
import {
  HomeCategoriesSection,
  HomeBenefitsSection,
  HomeTrustSection,
  HomeFaqsSection,
  HomeFinalCtaSection,
  HomeWhereWeAreSection,
  HomeFeaturedPropertyBadge,
} from "@/components/public/home-sections";

export const metadata = {
  title: "NetLodge — Verified student accommodation in Nigeria",
  description: "Book the actual room you'll live in — not just the building. NetLodge lists verified rooms around UNILAG, UNN and other Nigerian universities, with real photos, transparent pricing and backend-confirmed payments.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const { data: liveProperties } = await fetchPropertiesServer({ page: 1, pageSize: 10 });
  const { data: liveUniversities } = await fetchUniversitiesServer();
  const { data: stats } = await fetchHomepageStatsServer();
  const { data: testimonials } = await fetchPublishedTestimonialsServer(6);

  const featured = (liveProperties ?? []).slice(0, 6);
  const carouselItems = (liveProperties ?? []).slice(0, 5);

  return (
    <>
      {/* ----------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <HeroIntro stats={{
              verifiedProperties: stats?.verifiedProperties ?? 0,
              totalRooms: stats?.availableRooms ?? 0,
              universities: stats?.universities ?? 0,
            }} />
            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-muted shadow-xl">
                {/* Featured property image or clean gradient — no generic icon */}
                {featured[0]?.property_images?.[0]?.public_url ? (
                  <img
                    src={featured[0].property_images[0].public_url}
                    alt={featured[0].name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-grid-pattern opacity-40" aria-hidden />
                )}
                {featured[0] && (
                  <div className="absolute inset-x-4 bottom-4 rounded-xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                        <BadgeCheck className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {featured[0].name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {featured[0].city}
                          <HomeFeaturedPropertyBadge verified={featured[0].verification_status === "approved"} />
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="ml-auto shrink-0">
                        <Link href={`/properties/${featured[0].slug}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative z-10 -mb-12 mt-12">
            <HeroSearch />
          </div>
        </div>
      </section>

      <div className="h-8" aria-hidden />

      {/* ------------------------------------------------- Where we are */}
      <HomeWhereWeAreSection universities={(liveUniversities ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        short_name: u.short_name,
        slug: u.slug,
        city: u.city,
        state: u.state,
        verification_status: (u as any).verification_status,
      }))} />

      {/* ----------------------------------------------- Accommodation types */}
      <HomeCategoriesSection />

      {/* ------------------------------------------------- Featured listings */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Featured properties"
          title="Hand-picked verified listings"
          description="A selection of recently verified properties around UNILAG. Each property contains individual bookable rooms."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/properties">
                All properties
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          }
        />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.length > 0 ? (
            featured.map((p) => (
              <PropertyCardAdapter key={p.id} property={p} />
            ))
          ) : (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              We're onboarding landlords now. Verified rooms will appear here soon.
            </p>
          )}
        </div>
      </section>

      {/* --------------------------------------------- Manually-controlled carousel */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Fresh on NetLodge"
            title="Recently added rooms"
            description="Swipe through the latest verified listings."
          />
          <div className="mt-6">
            <Carousel
              opts={{ align: "start", loop: false }}
              className="w-full"
              aria-label="Recently added properties"
            >
              <CarouselContent className="-ml-4">
                {carouselItems.map((p) => (
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

      {/* ----------------------------------------------- Verification & trust */}
      <HomeTrustSection />

      {/* ------------------------------------------------- Student benefits */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="For students"
            title="Why students choose NetLodge"
            description="A marketplace built around how Nigerian students actually search for and secure accommodation."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: GraduationCap, title: "Built for your campus", text: "Filter by university, neighbourhood and walking distance to class." },
              { icon: Lock, title: "Safe holds", text: "A server-controlled hold reserves a room while you arrange payment." },
              { icon: Star, title: "Honest listings", text: "Room-level photos mean you see the actual unit, not just a pretty exterior." },
              { icon: HeartHandshake, title: "Real support", text: "Open a ticket from your dashboard and a human gets back to you." },
            ].map((b) => (
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
                Create your student account
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- Landlord onboarding */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/20">
          <CardContent className="grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 text-primary">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                For landlords
              </Badge>
              <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                List once. Manage hundreds of rooms.
              </h2>
              <p className="text-muted-foreground text-pretty">
                The landlord dashboard handles the realities of Nigerian student housing —
                floor-by-floor inventory, per-room pricing, bulk operations, booking workflows,
                payouts and verification. Built for portfolios of 1 to 1,000 rooms.
              </p>
              <ul className="space-y-2 text-sm">
                {[
                  "Multi-step property wizard with draft saving",
                  "Floor-level default prices with per-room overrides",
                  "Bulk-create 200 rooms in a single action",
                  "Booking, payment and payout reconciliation in one place",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/register">
                    Start listing
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/how-it-works#landlords">Landlord guide</Link>
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

      {/* ------------------------------------------------------- Testimonials */}
      {testimonials && testimonials.length > 0 && (
        <section className="border-y border-border bg-card/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="From the NetLodge community"
              title="What students and landlords say"
              description="Real reviews from verified NetLodge users. Every testimonial is reviewed by our team before publication."
            />
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col gap-3 p-5">
                    {t.rating && (
                      <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn("h-4 w-4", i < t.rating! ? "fill-primary text-primary" : "text-muted-foreground/30")}
                            aria-hidden
                          />
                        ))}
                      </div>
                    )}
                    <blockquote className="flex-1 text-sm leading-relaxed text-pretty">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                    <div className="space-y-0.5 border-t border-border pt-3">
                      <p className="text-sm font-semibold">{t.authorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.authorRole === "student" && t.authorUniversity
                          ? `Student, ${t.authorUniversity}${t.authorLevel ? ` · ${t.authorLevel}` : ""}`
                          : t.authorRole === "landlord"
                            ? "Landlord"
                            : t.authorRole === "parent"
                              ? "Parent"
                              : "Staff"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- How it works CTA */}
      <section className={cn("border-y border-border bg-card/30", testimonials && testimonials.length > 0 && "border-t-0")}>
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Ready to find your student home?
          </h2>
          <p className="mt-3 text-base text-muted-foreground text-pretty">
            Browse verified rooms around your campus, inspect facilities online,
            and book the actual unit you'll live in — not just the building.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/search">
                <Search className="mr-2 h-4 w-4" aria-hidden />
                Browse accommodation
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- FAQs */}
      <HomeFaqsSection />

      {/* ---------------------------------------------------------- CTA band */}
      <HomeFinalCtaSection />
    </>
  );
}
