import * as React from "react";
import { Cookie } from "lucide-react";
import { PageHeader } from "@/components/shared/page-components";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Cookie policy",
  alternates: { canonical: "/cookies" },
};

const cookies = [
  { name: "netlodge-theme", purpose: "Stores your light/dark theme preference", duration: "1 year", type: "Essential" },
  { name: "netlodge-session", purpose: "Maintains your signed-in session", duration: "Session", type: "Essential" },
  { name: "netlodge-recent-searches", purpose: "Remembers your last 5 search filters", duration: "30 days", type: "Functional" },
  { name: "_ga", purpose: "Anonymous analytics (Google Analytics, when enabled)", duration: "2 years", type: "Analytics" },
  { name: "_fbp", purpose: "Anonymous advertising (Facebook Pixel, when enabled)", duration: "90 days", type: "Marketing" },
];

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Legal"
        title="Cookie Policy"
        description="How and why NetLodge uses cookies and similar technologies."
      />
      <Card className="mt-8">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <Cookie className="h-5 w-5 text-primary" aria-hidden />
              What are cookies?
            </h2>
            <p className="text-sm text-foreground/90 text-pretty leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help
              us keep you signed in, remember your preferences, and understand how the Platform is
              used. We never store sensitive data (like passwords or payment details) in cookies.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold tracking-tight">Types of cookies we use</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4 font-medium">Cookie</th>
                    <th className="py-2 pr-4 font-medium">Purpose</th>
                    <th className="py-2 pr-4 font-medium">Duration</th>
                    <th className="py-2 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {cookies.map((c) => (
                    <tr key={c.name} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{c.name}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{c.purpose}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{c.duration}</td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-xs">{c.type}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold tracking-tight">Managing cookies</h2>
            <p className="text-sm text-foreground/90 text-pretty leading-relaxed">
              Essential cookies are required for the Platform to function and cannot be disabled.
              You can disable non-essential cookies via your browser settings. Doing so may affect
              some features (e.g. theme persistence) but will not prevent you from using NetLodge.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold tracking-tight">Changes</h2>
            <p className="text-sm text-foreground/90 text-pretty leading-relaxed">
              We may update this Policy as we introduce new features or comply with regulatory
              changes. We will notify you of material changes by email at least 30 days in advance.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
