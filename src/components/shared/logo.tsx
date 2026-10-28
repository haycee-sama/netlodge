import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual variant.
   *  - "full":    mark + wordmark + tagline (footer, auth panels — large vertical spaces)
   *  - "default": mark + wordmark (headers, sidebars — the standard horizontal lockup)
   *  - "mark":    mark only (favicons, mobile tight spaces, loading states)
   */
  variant?: "full" | "default" | "mark";
  /** Mark height in px. Wordmark and tagline scale relative to it. */
  size?: "sm" | "md" | "lg";
  /** Override the wordmark tone. Useful on coloured surfaces (e.g. the green CTA band). */
  tone?: "auto" | "light" | "dark";
  className?: string;
}

/**
 * NetLodge brand lockup.
 *
 * Architecture:
 *  - The green gradient "N" mark is served as a static SVG via next/image. It
 *    has no currentColor dependencies, so it renders identically on light and
 *    dark backgrounds. The mark is the visual anchor of the brand.
 *  - The "NetLodge" wordmark and the "Student Accommodation, Simplified." tagline
 *    are rendered as HTML text. "Net" uses the foreground color (auto-adapts to
 *    theme); "Lodge" uses the primary emerald. This gives crisp, theme-aware
 *    typography with zero currentColor-in-`<img>` headaches, and keeps the
 *    per-page payload tiny (the 37KB mark SVG is cached once by the browser).
 *
 * The original SVG logo's wordmark uses a heavy geometric sans with "Net" in
 * dark navy and "Lodge" in emerald. We match that with the display font
 * (Plus Jakarta Sans, weight 800) and the brand's primary emerald token.
 */
export function Logo({
  variant = "default",
  size = "md",
  tone = "auto",
  className,
  ...props
}: LogoProps) {
  const isFull = variant === "full";
  const isMark = variant === "mark";

  // Mark height per size token.
  const markHeight = size === "sm" ? 28 : size === "lg" ? 44 : 32;
  const markWidth = markHeight; // mark SVG is square (385x385 viewBox)

  // Wordmark size relative to mark.
  const wordmarkSize = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";
  const taglineSize = size === "sm" ? "text-[8px]" : size === "lg" ? "text-[11px]" : "text-[9px]";

  // Tone: on the green CTA band we force light; otherwise inherit from theme.
  const netTone =
    tone === "light"
      ? "text-white"
      : tone === "dark"
        ? "text-foreground"
        : "text-foreground dark:text-foreground";

  if (isMark) {
    return (
      <span
        className={cn("inline-flex items-center select-none", className)}
        aria-label="NetLodge"
        {...props}
      >
        <Image
          src="/netlodge-mark.svg"
          alt="NetLodge"
          width={markWidth}
          height={markHeight}
          priority
          className="h-auto w-auto"
          style={{ height: `${markHeight}px`, width: `${markWidth}px` }}
        />
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center gap-2 select-none", className)}
      aria-label="NetLodge"
      {...props}
    >
      <Image
        src="/netlodge-mark.svg"
        alt=""
        width={markWidth}
        height={markHeight}
        priority
        aria-hidden
        className="h-auto w-auto shrink-0"
        style={{ height: `${markHeight}px`, width: `${markWidth}px` }}
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display font-extrabold tracking-tight",
            wordmarkSize,
            netTone,
          )}
        >
          Net
          <span className="text-primary">Lodge</span>
        </span>
        {isFull && (
          <span
            className={cn(
              "mt-1 font-medium uppercase tracking-[0.22em]",
              taglineSize,
              tone === "light"
                ? "text-white/70"
                : "text-muted-foreground",
            )}
          >
            Student Accommodation, Simplified.
          </span>
        )}
      </span>
    </span>
  );
}
