import * as React from "react";
import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shared/logo";

const footerLinks = [
  {
    heading: "Discover",
    links: [
      { label: "Search accommodation", href: "/search" },
      { label: "Universities", href: "/universities" },
      { label: "Properties", href: "/properties" },
      { label: "How it works", href: "/how-it-works" },
    ],
  },
  {
    heading: "Trust & safety",
    links: [
      { label: "Verification", href: "/safety" },
      { label: "Booking safety", href: "/safety#booking" },
      { label: "Report a listing", href: "/contact" },
      { label: "Privacy policy", href: "/privacy" },
    ],
  },
  {
    heading: "For landlords",
    links: [
      { label: "List a property", href: "/register" },
      { label: "Landlord guide", href: "/how-it-works#landlords" },
      { label: "Verification", href: "/safety#landlords" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Help centre", href: "/help" },
      { label: "Contact us", href: "/contact" },
      { label: "Cookie policy", href: "/cookies" },
      { label: "Sign in", href: "/login" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground text-pretty">
              NetLodge is the verified marketplace for student accommodation
              around Nigerian universities — book rooms, not just buildings.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" aria-hidden />
                <span>Yaba, Lagos, Nigeria</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" aria-hidden />
                <a
                  href="mailto:hello@netlodge.example"
                  className="hover:text-foreground hover:underline"
                >
                  hello@netlodge.example
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" aria-hidden />
                <span>+234 800 NETLODGE</span>
              </li>
            </ul>
          </div>

          {footerLinks.map((section) => (
            <div key={section.heading}>
              <h3 className="text-sm font-semibold">{section.heading}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {section.links.map((link) => (
                  <li key={link.href}>
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
            © {new Date().getFullYear()} NetLodge. Built for Nigerian students.
          </p>
          <p className="flex items-center gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden />
            All listings go through identity and ownership verification.
          </p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground/80">
          Demo data on this site is fictitious and for illustration only — no
          real properties, bookings, payments or endorsements are represented.
        </p>
      </div>
    </footer>
  );
}
