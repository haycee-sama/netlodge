"use client";

import * as React from "react";
import Link from "next/link";
import {
  Rocket,
  Building2,
  DoorOpen,
  BadgeCheck,
  CalendarCheck,
  Banknote,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";

const onboardingSteps = [
  {
    icon: BadgeCheck,
    title: "Complete verification",
    description: "Submit identity, address and ownership documents. We review within 3–5 business days.",
    href: "/landlord/verification",
    cta: "Start verification",
  },
  {
    icon: Building2,
    title: "List your first property",
    description: "Use the multi-step wizard to describe your building, location, facilities and rules.",
    href: "/landlord/properties/new",
    cta: "Add a property",
  },
  {
    icon: DoorOpen,
    title: "Organise rooms & floors",
    description: "Create floors, then add rooms. Use bulk-create for hundreds of rooms at once.",
    href: "/landlord/rooms/new",
    cta: "Add rooms",
  },
  {
    icon: CalendarCheck,
    title: "Manage bookings",
    description: "Approve holds, track payments, and confirm bookings as students reserve rooms.",
    href: "/landlord/bookings",
    cta: "View bookings",
  },
  {
    icon: Banknote,
    title: "Receive payouts",
    description: "Set your bank account and watch payouts land after each booking is confirmed.",
    href: "/landlord/payouts",
    cta: "Set up payouts",
  },
];

export default function LandlordOnboardingPage() {
  const { session } = useAuth();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Get started"
        title={`Welcome to NetLodge${session ? `, ${session.firstName}` : ""}`}
        description="Five steps to your first verified listing and your first booking payout."
      />

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/10">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="space-y-2">
            <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              You're 5 steps away
            </Badge>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              From sign-up to first payout
            </h2>
            <p className="max-w-xl text-muted-foreground text-pretty">
              Each step below unlocks the next. You can pause at any time — your progress is saved.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/landlord/verification">
              <Rocket className="mr-2 h-4 w-4" aria-hidden />
              Start
            </Link>
          </Button>
        </CardContent>
      </Card>

      <ol className="space-y-3">
        {onboardingSteps.map((s, i) => (
          <li key={s.title}>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">STEP {i + 1}</span>
                  </div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground text-pretty">{s.description}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={s.href}>
                    {s.cta}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Tip:</strong> You can preview any role's dashboard by
          clicking your avatar → Switch role (demo).
        </CardContent>
      </Card>
    </div>
  );
}
