import * as React from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  /** When true, render the logomark only (no wordmark). */
  markOnly?: boolean;
}

/**
 * NetLodge brand mark — a stylised "NL" formed by two stacked chevrons
 * over a rounded square, evoking both a roof line and a location pin.
 */
export function Logo({ markOnly = false, className, ...props }: LogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 select-none", className)}
      aria-label="NetLodge"
    >
      <svg
        viewBox="0 0 40 40"
        width="32"
        height="32"
        role="img"
        aria-hidden
        {...props}
      >
        <defs>
          <linearGradient id="nl-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.45 0.13 165)" />
            <stop offset="100%" stopColor="oklch(0.6 0.14 175)" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="url(#nl-grad)" />
        <path
          d="M10 28 V14 L20 22 L30 14 V28"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="30" r="2" fill="oklch(0.78 0.16 65)" />
      </svg>
      {!markOnly && (
        <span className="font-display text-xl font-extrabold tracking-tight leading-none">
          Net<span className="text-primary">Lodge</span>
        </span>
      )}
    </span>
  );
}
