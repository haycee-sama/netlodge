import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
import { UniversityCard } from "@/components/public/university-card";
import { SectionHeading } from "@/components/shared/page-components";
import { fetchPropertiesServer, fetchUniversitiesServer } from "@/lib/supabase/property-server";
import { PropertyCardAdapter } from "@/components/public/property-card-adapter";
import { Price } from "@/components/shared/price";
import { FACILITY_LABELS } from "@/lib/types";

export const metadata = {
  title: "NetLodge — Verified student accommodation in Nigeria",
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

  const featured = (liveProperties ?? []).slice(0, 6);
  const carouselItems = (liveProperties ?? []).slice(0, 5);

  return (
    <>
      {/* ----------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Now serving UNILAG, Akoka, Yaba, Bariga & Somolu
              </Badge>
              <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Find your <span className="text-gradient-brand">verified</span> student home in Nigeria.
              </h1>
              <p className="max-w-xl text-base text-muted-foreground text-pretty sm:text-lg">
                NetLodge is the marketplace for student accommodation around Nigerian universities.
                Browse individual rooms, inspect facilities, and book the actual unit you'll live in —
                not just the building it sits in.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/search">
                    <Search className="mr-2 h-4 w-4" aria-hidden />
                    Browse accommodation
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/register">
                    List your property
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
              <dl className="grid grid-cols-3 gap-4 pt-4 text-sm">
                <div className="space-y-0.5">
                  <dt className="text-muted-foreground">Listings</dt>
                  <dd className="font-display text-2xl font-bold">Verified</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-muted-foreground">Bookable</dt>
                  <dd className="font-display text-2xl font-bold">Per room</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-muted-foreground">Universities</dt>
                  <dd className="font-display text-2xl font-bold">6</dd>
                </div>
              </dl>
            </div>
            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                <Image
                  src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&auto=format&fit=crop"
                  alt="A modern, well-lit student room with a desk, chair and neatly made bed."
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-x-4 bottom-4 rounded-xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                      <BadgeCheck className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">G-101 · Akoka Heights Hostel</p>
                      <p className="text-xs text-muted-foreground">
                        Verified · Self-contain · ₦450,000/yr
                      </p>
                    </div>
                    <Price kobo={45000000} period="/yr" className="ml-auto" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative z-10 -mb-12 mt-12">
            <HeroSearch />
          </div>
        </div>
      </section>

      <div className="h-12" aria-hidden />

      {/* ---------------------------------------------- University locations */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Browse by university"
          title="Popular university locations"
          description="Explore verified accommodation around Nigeria's leading universities. New campuses added every term."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/universities">
                All universities
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          }
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(liveUniversities ?? []).slice(0, 6).map((u) => (
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
                totalListings: 0,
              }}
            />
          ))}
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
              No verified listings yet. Check back soon.
            </p>
          )}
        </div>
      </section>

      {/* --------------------------------------------- Manually-controlled carousel */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Take a look around"
            title="Recently added properties"
            description="Use the controls to browse the latest verified listings."
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
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-background shadow-sm">
              <Image
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80&auto=format&fit=crop"
                alt="A modern multi-storey hostel building in Nigeria."
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ------------------------------------------------------- How it works CTA */}
      <section className="border-y border-border bg-card/30">
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
