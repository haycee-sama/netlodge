import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ShieldCheck, DoorOpen, BadgeCheck, Users } from "lucide-react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — form area */}
      <div className="flex flex-col">
        <header className="flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo />
          </Link>
          <ThemeToggle compact />
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>

      {/* Right — split panel */}
      <aside className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="absolute inset-0 bg-grid-pattern opacity-20" aria-hidden />
        <div className="relative flex h-full flex-col justify-center p-12 text-primary-foreground">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance">
            Book the actual room — not just the building.
          </h2>
          <p className="mt-3 max-w-md text-primary-foreground/80 text-pretty">
            NetLodge is the verified marketplace for student accommodation around Nigerian universities.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: BadgeCheck, title: "Verified landlords only", text: "Identity, address and ownership checks on every listing." },
              { icon: DoorOpen, title: "Room-level booking", text: "Each rentable unit has its own identifier, photos and price." },
              { icon: ShieldCheck, title: "Backend-confirmed payments", text: "Paystack payments verified by our backend before booking." },
              { icon: Users, title: "Built for students, landlords, managers and agents", text: "Scoped role dashboards with extensible permissions." },
            ].map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <f.icon className="h-4 w-4" aria-hidden />
                </div>
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-primary-foreground/70 text-pretty">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
