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

export const metadata = {
  title: "Help centre — NetLodge",
  alternates: { canonical: "/help" },
};

const categories = [
  { icon: Search, title: "Finding accommodation", text: "Search, filters, and saved properties." },
  { icon: CalendarCheck, title: "Bookings", text: "Holds, confirmations, cancellations." },
  { icon: CreditCard, title: "Payments & refunds", text: "Paystack, refunds, caution deposits." },
  { icon: ShieldCheck, title: "Verification & safety", text: "How we verify, how to stay safe." },
  { icon: Building2, title: "Listing a property", text: "Wizard, floors, rooms, pricing." },
  { icon: UserCog, title: "Account & profile", text: "Profile, security, roles." },
];

const faqs = [
  {
    cat: "Finding accommodation",
    items: [
      { q: "How do I search for accommodation near my university?", a: "Use the homepage search or the /search page. Filter by university, neighbourhood, budget, unit type and facilities. Results synchronise to the URL so you can bookmark or share a search." },
      { q: "Can I save properties to view later?", a: "Yes. Sign in as a student, open any property, and tap the heart icon. Saved properties appear in /student/saved." },
      { q: "Are the photos of the actual room?", a: "Where possible, yes. If a photo is representative rather than of the specific unit, it is labelled clearly on the room page." },
    ],
  },
  {
    cat: "Bookings",
    items: [
      { q: "What is a temporary hold?", a: "A hold reserves a specific room for 24 hours while you arrange payment. Holds are server-controlled — no other student can book the same room during your hold." },
      { q: "When is my booking confirmed?", a: "Your booking is confirmed only after our backend confirms payment from Paystack. The frontend may show 'payment initiated' but never 'successful' without backend confirmation." },
      { q: "Can I cancel a booking?", a: "Yes. Full refunds apply within 24 hours of placing a booking, or if the landlord fails to confirm. After that, refund eligibility depends on the cancellation window in your lease terms." },
    ],
  },
  {
    cat: "Payments & refunds",
    items: [
      { q: "How do I pay?", a: "All payments go through Paystack. After initiating a booking you'll see a Paystack link in your dashboard. We do not accept payments outside the platform." },
      { q: "When is my caution deposit refunded?", a: "At the end of your tenancy, less any documented damages. Refunds are issued to your original payment method and typically arrive within 5–7 business days." },
      { q: "What if a payment fails?", a: "If Paystack reports a failure, your hold remains active until it expires. You can retry payment from your booking page. No money leaves your account on a failed attempt." },
    ],
  },
  {
    cat: "Listing a property",
    items: [
      { q: "How long does verification take?", a: "Typically 3–5 business days after you submit all evidence. On-site inspections are scheduled within that window." },
      { q: "Can I list 200 rooms?", a: "Yes. The landlord dashboard supports bulk room creation, floor-level default prices, and per-room overrides. The interface is designed for portfolios of all sizes." },
      { q: "Can I assign a manager?", a: "Yes. Add managers from /landlord/staff and assign them to specific properties. Managers see only their assigned properties and permitted operations." },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Help centre"
        title="How can we help?"
        description="Browse by category, search our FAQs, or contact our team. Most questions are answered below."
      />

      <div className="mt-6 max-w-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            placeholder="Search for help articles…"
            className="h-11 pl-9"
            aria-label="Search help articles"
          />
        </div>
      </div>

      {/* Categories */}
      <section className="mt-10">
        <SectionHeading eyebrow="Browse by category" title="Popular topics" />
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
        <SectionHeading eyebrow="Frequently asked" title="Browse all FAQs" />
        <div className="mt-5 space-y-8">
          {faqs.map((group) => (
            <div key={group.cat}>
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                <HelpCircle className="h-4 w-4 text-primary" aria-hidden />
                {group.cat}
              </h3>
              <Accordion type="single" collapsible>
                {group.items.map((item, i) => (
                  <AccordionItem key={i} value={`${group.cat}-${i}`}>
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
              <p className="font-display text-lg font-bold">Still need help?</p>
              <p className="text-sm text-muted-foreground">
                Our support team responds within one business day.
              </p>
            </div>
            <Button asChild>
              <Link href="/contact">
                Contact support
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
