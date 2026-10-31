import * as React from "react";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSearch } from "@/components/public/hero-search";
import { HeroIntro } from "@/components/public/hero-intro";
import {
  fetchPropertiesServer,
  fetchUniversitiesServer,
  fetchHomepageStatsServer,
  fetchPublishedTestimonialsServer,
} from "@/lib/supabase/property-server";
import {
  HomeCategoriesSection,
  HomeTrustSection,
  HomeFaqsSection,
  HomeFinalCtaSection,
  HomeWhereWeAreSection,
  HomeFeaturedPropertyBadge,
  HomeFeaturedSection,
  HomeFreshCarouselSection,
  HomeStudentBenefitsSection,
  HomeLandlordCtaSection,
  HomeHowItWorksCtaSection,
  HomeTestimonialsSection,
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
      <HomeFeaturedSection properties={featured} />

      {/* --------------------------------------------- Manually-controlled carousel */}
      <HomeFreshCarouselSection properties={carouselItems} />

      {/* ----------------------------------------------- Verification & trust */}
      <HomeTrustSection />

      {/* ------------------------------------------------- Student benefits */}
      <HomeStudentBenefitsSection />

      {/* ---------------------------------------------- Landlord onboarding */}
      <HomeLandlordCtaSection />

      {/* ------------------------------------------------------- Testimonials */}
      <HomeTestimonialsSection
        testimonials={(testimonials ?? []).map((tm: any) => ({
          id: tm.id,
          quote: tm.quote,
          rating: tm.rating,
          authorName: tm.authorName,
          authorRole: tm.authorRole,
          authorUniversity: tm.authorUniversity,
          authorLevel: tm.authorLevel,
        }))}
      />

      {/* ------------------------------------------------------- How it works CTA */}
      <HomeHowItWorksCtaSection hasTestimonials={!!(testimonials && testimonials.length > 0)} />

      {/* -------------------------------------------------------------- FAQs */}
      <HomeFaqsSection />

      {/* ---------------------------------------------------------- CTA band */}
      <HomeFinalCtaSection />
    </>
  );
}
