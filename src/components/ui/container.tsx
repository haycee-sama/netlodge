/**
 * Container component — centers content with sensible responsive padding.
 *
 * Phase 0 utility. Visual design system is intentionally minimal — this is
 * the only "presentational" component introduced in Phase 0; everything else
 * belongs to later phases that define actual UI.
 */
import { cn } from "@/components/ui/cn";

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}
