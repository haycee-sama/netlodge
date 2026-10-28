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

export const metadata = {
  title: "Safety & verification — NetLodge",
  alternates: { canonical: "/safety" },
};

const verificationTypes = [
  { icon: BadgeCheck, title: "Identity verification", text: "Government-issued ID — NIN, driver's licence, or international passport." },
  { icon: FileSearch, title: "Address verification", text: "Utility bill (electricity, water, or waste) dated within the last 90 days." },
  { icon: Scale, title: "Ownership or management authority", text: "Certificate of occupancy, deed of assignment, or notarised management contract." },
  { icon: Eye, title: "On-site inspection", text: "A NetLodge team member visits the property and confirms facilities, safety, and condition." },
];

const safetyTips = [
  "Always inspect the individual room before paying — not just the building.",
  "Never pay outside NetLodge. Off-platform payments forfeit our protections.",
  "Use the in-app messaging system to keep a written record of every agreement.",
  "Take photos of the room on move-in day and share them with your landlord.",
  "Report any listing that asks for off-platform payment immediately.",
];

export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Trust & safety"
        title="How NetLodge keeps students safe"
        description="Every landlord passes identity, address and ownership verification. Every property is inspected on-site. Every payment flows through Paystack with backend confirmation."
      />

      {/* Verification pillars */}
      <section id="landlords" className="mt-10 scroll-mt-20">
        <SectionHeading
          eyebrow="Landlord verification"
          title="Four layers of verification"
          description="A landlord earns the verified badge only after all four layers pass."
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
              Booking safety
            </Badge>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">
              Payment protection, end-to-end
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground text-pretty">
              When you book a room on NetLodge, your money is handled by Paystack and reconciled by
              our backend. Landlords do not receive funds directly — they receive payouts after
              the booking is confirmed and reconciled.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                "Funds held by Paystack until confirmation",
                "Backend verifies every payment via Paystack webhook",
                "Refundable caution deposit tracked separately",
                "Payouts only released after booking is confirmed",
                "Refunds processed for failed or cancelled bookings",
                "Full audit trail of every transaction",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Student safety tips */}
      <section className="mt-16">
        <SectionHeading
          eyebrow="Stay sharp"
          title="Safety tips for students"
          description="Even with verification, common-sense checks protect you further."
        />
        <Card className="mt-5">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {safetyTips.map((tip, i) => (
                <li key={tip} className="flex items-start gap-3 p-4">
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
                Report a listing
              </Badge>
              <h2 className="font-display text-xl font-bold tracking-tight">
                Spot something off?
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
                If a listing asks for off-platform payment, misrepresents the unit, or behaves
                suspiciously, report it via our contact form. We investigate every report within 48 hours.
              </p>
            </div>
            <Button asChild variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Link href="/contact">
                Report a listing
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
              <h2 className="font-display text-xl font-bold tracking-tight">Refund policy (summary)</h2>
            </div>
            <p className="text-sm text-muted-foreground text-pretty">
              Full refunds are available if a booking is cancelled within 24 hours of placement or
              if the landlord fails to confirm. Refunds of caution deposits are issued at the end of
              the tenancy, less any documented damages. See our{" "}
              <Link href="/terms" className="text-primary hover:underline">terms of service</Link> for
              the full policy.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
