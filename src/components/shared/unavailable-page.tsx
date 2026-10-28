"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/shared/page-components";

interface UnavailablePageProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

/**
 * Honest "not yet available" state for pages that haven't been converted
 * to live data yet. Shows a clear message instead of fixture data.
 */
export function UnavailablePage({ eyebrow, title, description }: UnavailablePageProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <Construction className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">This section is being updated</p>
          <p className="text-xs text-muted-foreground max-w-md">
            {description ?? "We're working to connect this page to live data. Please check back soon. Contact support if you need immediate assistance."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
