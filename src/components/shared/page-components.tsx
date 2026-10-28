import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          {description && (
            <p className="mx-auto max-w-md text-sm text-muted-foreground text-pretty">
              {description}
            </p>
          )}
        </div>
        {action && <div className="mt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}

interface SectionHeadingProps {
  title: string;
  /** Optional eyebrow label rendered above the title. */
  eyebrow?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  title,
  eyebrow,
  description,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
        )}
        <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  trend?: { value: string; positive?: boolean };
  className?: string;
}

export function StatCard({ label, value, hint, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wider">
          {label}
        </CardDescription>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="font-display text-2xl font-bold tracking-tight tabular-nums">{value}</div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {trend && (
          <p
            className={cn(
              "text-xs font-medium",
              trend.positive ? "text-success" : "text-destructive",
            )}
          >
            {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
