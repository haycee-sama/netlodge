import * as React from "react";
import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Page header for admin pages. Includes breadcrumbs and an optional demo-mode
 * banner explaining that the data is fixture-based.
 */
export function AdminPageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, i) => (
              <li key={i} className="flex items-center gap-1">
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-foreground hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
                {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3" aria-hidden />}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
          )}
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {description && (
            <p className="max-w-2xl text-sm text-muted-foreground text-pretty">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * Demo-mode banner. Shown on admin pages to make clear that the data is
 * fixture-based and that privileged actions are simulated.
 */
export function DemoModeBanner({ message }: { message?: string }) {
  return (
    <Card className="border-dashed border-info/40 bg-info/5">
      <CardContent className="flex items-start gap-2 p-3 text-xs text-info">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          <strong className="text-foreground">Demo mode:</strong>{" "}
          {message ??
            "Data shown is fixture-based development data. Privileged actions (approvals, rejections, refunds) are simulated — they update local state but do not call a real backend. In production, each action is authorised server-side and audit-logged."}
        </span>
      </CardContent>
    </Card>
  );
}

/**
 * Two-column detail layout: main content on the left, sidebar on the right.
 */
export function DetailLayout({
  children,
  sidebar,
  className,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-[1fr_340px]", className)}>
      <div className="space-y-6">{children}</div>
      <aside className="space-y-4">{sidebar}</aside>
    </div>
  );
}
