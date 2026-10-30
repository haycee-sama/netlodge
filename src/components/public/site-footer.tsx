"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { homeRouteForRole } from "@/lib/auth/permissions";
import { SUPPORT_EMAIL, SUPPORT_PHONE, BUSINESS_ADDRESS } from "@/lib/config/contact";

export function SiteFooter() {
  const { session } = useAuth();
  const { t } = useI18n();

  const authLink = session
    ? { label: t("nav.dashboard"), href: homeRouteForRole(session.role) }
    : { label: t("nav.signIn"), href: "/login" };

  const footerLinks = [
    {
      heading: t("footer.discover"),
      links: [
        { label: t("footer.searchAccommodation"), href: "/search" },
        { label: t("nav.universities"), href: "/universities" },
        { label: t("nav.properties"), href: "/properties" },
        { label: t("nav.howItWorks"), href: "/how-it-works" },
      ],
    },
    {
      heading: t("footer.trustSafety"),
      links: [
        { label: t("footer.verification"), href: "/safety" },
        { label: t("footer.bookingSafety"), href: "/safety#booking" },
        { label: t("footer.reportListing"), href: "/contact" },
        { label: t("footer.privacyPolicy"), href: "/privacy" },
      ],
    },
    {
      heading: t("footer.forLandlords"),
      links: [
        { label: t("footer.listAProperty"), href: "/register" },
        { label: t("footer.landlordGuide"), href: "/how-it-works#landlords" },
        { label: t("footer.verification"), href: "/safety#landlords" },
        { label: t("footer.termsOfService"), href: "/terms" },
      ],
    },
    {
      heading: t("footer.support"),
      links: [
        { label: t("footer.helpCentre"), href: "/help" },
        { label: t("footer.contactUs"), href: "/contact" },
        { label: t("footer.cookiePolicy"), href: "/cookies" },
        { label: authLink.label, href: authLink.href },
      ],
    },
  ];

  return (
    <footer className="mt-auto border-t border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground text-pretty">
              {t("footer.description")}
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              {BUSINESS_ADDRESS && (
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden />
                  <span>{BUSINESS_ADDRESS}</span>
                </li>
              )}
              {SUPPORT_EMAIL && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" aria-hidden />
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </li>
              )}
              {SUPPORT_PHONE && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" aria-hidden />
                  <span>{SUPPORT_PHONE}</span>
                </li>
              )}
              {!SUPPORT_EMAIL && !SUPPORT_PHONE && !BUSINESS_ADDRESS && (
                <li className="text-xs">
                  <Link href="/contact" className="text-primary hover:underline">
                    {t("footer.contactUs")}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {footerLinks.map((section, i) => (
            <div key={i}>
              <h3 className="text-sm font-semibold">{section.heading}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {section.links.map((link, j) => (
                  <li key={j}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground transition-colors hover:text-foreground hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} NetLodge. {t("footer.copyright")}
          </p>
          <p className="flex items-center gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden />
            {t("footer.verificationNote")}
          </p>
        </div>
      </div>
    </footer>
  );
}
