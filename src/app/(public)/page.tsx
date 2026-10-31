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

export const metadata = {
  title: "NetLodge — Verified student accommodation in Nigeria",
  description: "Book the actual room you'll live in — not just the building. NetLodge lists verified rooms around UNILAG, UNN and other Nigerian universities, with real photos, transparent pricing and backend-confirmed payments.",
  alternates: { canonical: "/" },
};

const categories = [
  { label: "Self-contain", icon: DoorOpen, href: "/search?unitTypes=self_contain" },
  { label: "Single room", icon: Home, href: "/search?unitTypes=single_room" },
  { label: "Shared room", icon: Users, href: "/search?unitTypes=shared_room" },
  { label: "Bed space", icon: BedIcon, href: "/search?unitTypes=bed_space" },
  { label: "Apartment", icon: Building2, href: "/search?unitTypes=apartment" },
  { label: "Studio", icon: Home, href: "/search?unitTypes=studio" },
];

function BedIcon(props: React.ComponentProps<typeof Users>) {
  return <DoorOpen {...props} />;
}

const benefits = [
  {
    icon: ShieldCheck,
    title: "Verified listings only",
    description:
      "Every landlord on NetLodge passes identity, address and ownership verification before listings go live. No more guesswork.",
  },
  {
    icon: DoorOpen,
    title: "Book the actual room",
    description:
      "We treat each rentable unit — room, self-contain, or apartment — as its own bookable entity. Inspect the unit, not just the building.",
  },
  {
    icon: CalendarCheck,
    title: "Hold before you pay",
    description:
      "Place a temporary hold on a room while you arrange payment. Holds are server-controlled — no risk of double-booking.",
  },
  {
    icon: Wallet,
    title: "Transparent pricing",
    description:
      "See rent, service charges, caution deposit and platform fees upfront. No hidden agent fees, no surprise levies.",
  },
];

const faqs = [
  {
    q: "How do I know a listing is real?",
    a: "Every landlord on NetLodge must complete identity, address and ownership verification. Properties are inspected before they can be booked. The verification badge on each listing tells you exactly where the landlord is in the process.",
  },
  {
    q: "Am I booking a room or a building?",
    a: "You book a specific rentable unit — that might be a self-contain, a single room, a bed space, or an entire apartment. Each unit has its own identifier, photos, facilities, price and availability.",
  },
  {
    q: "How does payment work?",
    a: "Once you initiate a booking, you receive a temporary hold and a Paystack payment link. Your booking is only confirmed after the backend confirms payment. We never declare a payment successful from the browser.",
  },
  {
    q: "What if I'm a landlord with 200 rooms?",
    a: "The landlord dashboard lets you organise rooms by floor, apply default prices per floor, override individual prices, and bulk-create rooms. The interface scales to hundreds of units per property.",
  },
  {
    q: "Which universities are supported?",
    a: "We've launched with UNILAG, Akoka, Yaba, Bariga and Somolu. Additional universities are being added — you can request your campus via the contact form.",
  },
  {
    q: "Can I list a property I manage for someone else?",
    a: "Yes. Property managers can be assigned to a landlord's properties with scoped permissions. Agents can manage enquiries and referrals without gaining access to landlord finances or verification controls.",
  },
];

const trustSteps = [
  {
    step: "01",
    title: "Identity verification",
    description: "Landlords submit government-issued ID (NIN, driver's licence, or international passport).",
  },
  {
    step: "02",
    title: "Address & ownership",
    description: "Utility bills and ownership documents are reviewed. Inspections are scheduled where required.",
  },
  {
    step: "03",
    title: "Property inspection",
    description: "On-site inspection confirms the property exists as described, with the facilities claimed.",
  },
  {
    step: "04",
    title: "Verified badge",
    description: "Only after all checks pass does a listing earn the verified badge and become publicly bookable.",
  },
];

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
                          {featured[0].verification_status === "approved" ? " · Verified" : " · Pending verification"}
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
      <section className="border-y border-border bg-card/20">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Where you'll find us
              </p>
              <h2 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
                Campuses we serve
              </h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link href="/universities">
                All campuses
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>

          {/* Horizontal scrollable university strip */}
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {(liveUniversities ?? []).map((u) => {
              const img = u.slug === "university-of-lagos"
                ? "/university/unilag.jpg"
                : u.slug === "university-of-nigeria-nsukka"
                  ? "/university/unn.jpg"
                  : null;
              return (
                <Link
                  key={u.id}
                  href={`/universities/${u.slug}`}
                  className="group relative h-32 w-56 shrink-0 overflow-hidden rounded-xl border border-border transition-all hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={u.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-card to-accent/20" />
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  {/* University name at bottom */}
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-white/90">
                      {u.short_name}
                    </p>
                    <p className="text-sm font-medium text-white truncate">
                      {u.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/70">
                      {u.city}, {u.state}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- Accommodation types */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Browse by type"
            title="Find your kind of space"
            description="From a single bed space to a two-bedroom apartment, NetLodge handles every type of rentable unit."
          />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="group rounded-xl border border-border bg-background p-4 text-center transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
              >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <cat.icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="mt-2 text-sm font-medium">{cat.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

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
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <Badge variant="outline" className="gap-1.5 border-success/30 bg-success/5 text-success">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Trust & verification
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Every listing earns its verified badge.
            </h2>
            <p className="text-muted-foreground text-pretty">
              NetLodge never invents verification. Every landlord submits to a four-step
              verification process and properties are inspected on-site. The badge on a listing
              is the visible end of a process we take seriously.
            </p>
            <ul className="space-y-3">
              {trustSteps.map((s) => (
                <li key={s.step} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-xs font-bold text-primary">
                    {s.step}
                  </span>
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-muted-foreground text-pretty">{s.description}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline">
              <Link href="/safety">
                Read the safety policy
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {benefits.map((b) => (
              <Card key={b.title} className="h-full">
                <CardContent className="space-y-2 p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <b.icon className="h-4 w-4" aria-hidden />
                  </div>
                  <p className="font-display font-semibold">{b.title}</p>
                  <p className="text-sm text-muted-foreground text-pretty">{b.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

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
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Frequently asked"
          title="Questions students and landlords ask"
          description="Can't find what you're looking for? Visit our help centre or contact us."
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
            <Link href="/help">Visit help centre</Link>
          </Button>
          <Button asChild>
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </section>

      {/* ---------------------------------------------------------- CTA band */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-primary/30 bg-primary text-primary-foreground">
          <CardContent className="flex flex-col items-start gap-5 p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Ready to find your student home?
              </h2>
              <p className="max-w-xl text-primary-foreground/80 text-pretty">
                Create a free student account to save properties, place holds, and track your bookings
                in one place.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link href="/register">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link href="/search">Browse listings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
