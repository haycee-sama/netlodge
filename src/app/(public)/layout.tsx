import * as React from "react";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" className="min-w-0 flex-1 overflow-x-hidden">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
