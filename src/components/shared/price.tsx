import * as React from "react";
import { cn } from "@/lib/utils";
import { formatNgn, formatNgnCompact } from "@/lib/utils/format";

interface PriceProps {
  /** Amount in kobo. */
  kobo: number;
  /** Compact format, e.g. ₦1.2M. */
  compact?: boolean;
  /** Show "from" prefix — useful for property price-from labels. */
  fromLabel?: boolean;
  /** Period label shown after the amount, e.g. "/year". */
  period?: string;
  className?: string;
  /** Apply brand gradient to the amount. */
  gradient?: boolean;
}

export function Price({
  kobo,
  compact = false,
  fromLabel = false,
  period,
  className,
  gradient = false,
}: PriceProps) {
  const amount = compact ? formatNgnCompact(kobo) : formatNgn(kobo);
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      {fromLabel && (
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          from
        </span>
      )}
      <span
        className={cn(
          "font-display font-bold tracking-tight tabular-nums",
          gradient && "text-gradient-brand",
        )}
      >
        {amount}
      </span>
      {period && <span className="text-xs text-muted-foreground">{period}</span>}
    </span>
  );
}
