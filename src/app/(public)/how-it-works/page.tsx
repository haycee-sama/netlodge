import * as React from "react";
import Link from "next/link";
import {
  Search,
  DoorOpen,
  CalendarCheck,
  CreditCard,
  ShieldCheck,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { PageHeader, SectionHeading } from "@/components/shared/page-components";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "How it works — NetLodge",
  alternates: { canonical: "/how-it-works" },
};

const studentSteps = [
  { icon: Search, title: "Search", text: "Filter by university, neighbourhood, budget, unit type and facilities." },
  { icon: DoorOpen, title: "Inspect the unit", text: "Each room has its own photos, facilities and booking terms — not just the building." },
  { icon: CalendarCheck, title: "Place a hold", text: "Reserve a room for 24 hours while you arrange payment. Holds are server-controlled." },
  { icon: CreditCard, title: "Pay securely", text: "Pay through Paystack. Your booking is only confirmed after the backend confirms payment." },
  { icon: ShieldCheck, title: "Move in", text: "Receive your landlord's contact and the exact address once your booking is confirmed." },
];

const landlordSteps = [
  { icon: ShieldCheck, title: "Get verified", text: "Submit ID, address and ownership evidence. NetLodge inspects the property on-site." },
  { icon: Building2, title: "List your property", text: "Use the multi-step wizard to describe the building, location, facilities and rules." },
  { icon: DoorOpen, title: "Organise rooms", text: "Create floors and rooms, set default prices per floor, override individual prices." },
  { icon: Users, title: "Assign staff", text: "Add managers and agents with scoped permissions — they only see what you let them." },
  { icon: CreditCard, title: "Get paid", text: "Payouts land in your bank account after each booking is confirmed and reconciled." },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="How it works"
        title="From search to move-in, in five steps"
        description="NetLodge makes verified student accommodation findable, inspectable and bookable — for students and landlords alike."
      />

      {/* Student flow */}
      <section id="students" className="mt-12 scroll-mt-20">
        <SectionHeading
          eyebrow="For students"
          title="Find and book your room"
          description="You book the actual rentable unit, not just the building. Each unit has its own photos, facilities and price."
        />
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {studentSteps.map((s, i) => (
            <Card key={s.title} className="relative h-full">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="h-4 w-4" aria-hidden />
                  </div>
                  <span className="font-display text-2xl font-extrabold text-muted-foreground/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="font-display font-semibold">{s.title}</p>
                <p className="text-sm text-muted-foreground text-pretty">{s.text}</p>
              </CardContent>
            </Card>
          ))}
        </ol>
        <div className="mt-6">
          <Button asChild>
            <Link href="/search">
              Start your search
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      {/* Landlord flow */}
      <section id="landlords" className="mt-16 scroll-mt-20">
        <SectionHeading
          eyebrow="For landlords"
          title="List, organise, and earn"
          description="A purpose-built dashboard for portfolios of one room to a thousand. Floor-level pricing, bulk operations, payouts."
        />
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {landlordSteps.map((s, i) => (
            <Card key={s.title} className="h-full">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <s.icon className="h-4 w-4" aria-hidden />
                  </div>
                  <span className="font-display text-2xl font-extrabold text-muted-foreground/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="font-display font-semibold">{s.title}</p>
                <p className="text-sm text-muted-foreground text-pretty">{s.text}</p>
              </CardContent>
            </Card>
          ))}
        </ol>
        <div className="mt-6">
          <Button asChild>
            <Link href="/register">
              Start listing
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      {/* Booking & payment integrity */}
      <section id="booking" className="mt-16 scroll-mt-20">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/10">
          <CardContent className="p-6 sm:p-8">
            <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 text-primary">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Booking & payment integrity
            </Badge>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Why the backend — not the browser — decides.
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground text-pretty">
              A secure booking flow has eight steps. The frontend renders each step, but only the
              backend can transition between them. Here's what happens behind the scenes when you
              book a room.
            </p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {[
                "Room availability check (server-side, atomic)",
                "Temporary hold with expiry (server-controlled)",
                "Booking creation (server-issued reference)",
                "Payment initiation (Paystack link)",
                "Trusted payment confirmation (Paystack webhook → backend)",
                "Booking confirmation (server flips status)",
                "Payment reconciliation (fees, refunds, ledger)",
                "Refund and payout tracking (server-settled)",
              ].map((step) => (
                <li key={step} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              The frontend may display a payment as "initiated" but never as "successful" without a
              backend-confirmed status.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
