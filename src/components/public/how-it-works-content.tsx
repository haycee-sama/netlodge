"use client";

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
import { useI18n } from "@/lib/i18n/context";

export function HowItWorksContent() {
  const { t } = useI18n();

  const studentSteps = [
    { icon: Search, title: t("howItWorks.students.search.title"), text: t("howItWorks.students.search.desc") },
    { icon: DoorOpen, title: t("howItWorks.students.inspect.title"), text: t("howItWorks.students.inspect.desc") },
    { icon: CalendarCheck, title: t("howItWorks.students.hold.title"), text: t("howItWorks.students.hold.desc") },
    { icon: CreditCard, title: t("howItWorks.students.pay.title"), text: t("howItWorks.students.pay.desc") },
    { icon: ShieldCheck, title: t("howItWorks.students.moveIn.title"), text: t("howItWorks.students.moveIn.desc") },
  ];

  const landlordSteps = [
    { icon: ShieldCheck, title: t("howItWorks.landlords.verified.title"), text: t("howItWorks.landlords.verified.desc") },
    { icon: Building2, title: t("howItWorks.landlords.listProperty.title"), text: t("howItWorks.landlords.listProperty.desc") },
    { icon: DoorOpen, title: t("howItWorks.landlords.organiseRooms.title"), text: t("howItWorks.landlords.organiseRooms.desc") },
    { icon: Users, title: t("howItWorks.landlords.assignStaff.title"), text: t("howItWorks.landlords.assignStaff.desc") },
    { icon: CreditCard, title: t("howItWorks.landlords.getPaid.title"), text: t("howItWorks.landlords.getPaid.desc") },
  ];

  const bookingSteps = [
    t("howItWorks.booking.step1"),
    t("howItWorks.booking.step2"),
    t("howItWorks.booking.step3"),
    t("howItWorks.booking.step4"),
    t("howItWorks.booking.step5"),
    t("howItWorks.booking.step6"),
    t("howItWorks.booking.step7"),
    t("howItWorks.booking.step8"),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={t("howItWorks.eyebrow")}
        title={t("howItWorks.title")}
        description={t("howItWorks.description")}
      />

      {/* Student flow */}
      <section id="students" className="mt-12 scroll-mt-20">
        <SectionHeading
          eyebrow={t("howItWorks.students.eyebrow")}
          title={t("howItWorks.students.title")}
          description={t("howItWorks.students.description")}
        />
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {studentSteps.map((s, i) => (
            <Card key={i} className="relative h-full">
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
              {t("howItWorks.students.startSearch")}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      {/* Landlord flow */}
      <section id="landlords" className="mt-16 scroll-mt-20">
        <SectionHeading
          eyebrow={t("howItWorks.landlords.eyebrow")}
          title={t("howItWorks.landlords.title")}
          description={t("howItWorks.landlords.description")}
        />
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {landlordSteps.map((s, i) => (
            <Card key={i} className="h-full">
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
              {t("howItWorks.landlords.startListing")}
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
              {t("howItWorks.booking.eyebrow")}
            </Badge>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {t("howItWorks.booking.title")}
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground text-pretty">
              {t("howItWorks.booking.description")}
            </p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {bookingSteps.map((step) => (
                <li key={step} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("howItWorks.booking.disclaimer")}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
