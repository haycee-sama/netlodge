"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Three-mode segmented theme toggle: Light / Dark / System.
 *
 * Replaces the previous dropdown with an accessible segmented control.
 * The control uses a radiogroup pattern for screen-reader compatibility.
 *
 * Behaviour:
 *  - Light / Dark are explicit user choices that override system preference.
 *  - System follows the OS and updates live when the OS preference changes.
 *  - The choice persists via next-themes (localStorage key "netlodge-theme").
 *  - An inline anti-flash script in layout.tsx applies the theme before paint.
 */

type ThemeMode = "light" | "dark" | "system";

const modes: { value: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Before mount, render a placeholder to avoid hydration mismatch.
  // The anti-flash script in layout.tsx has already applied the correct class.
  const current = (theme as ThemeMode) ?? "system";

  if (compact) {
    // Compact variant for headers — icon-only on mobile, full on >= sm.
    return (
      <div
        role="radiogroup"
        aria-label="Colour theme"
        className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5"
      >
        {modes.map((m) => {
          const isActive = mounted && current === m.value;
          const Icon = m.icon;
          return (
            <button
              key={m.value}
              role="radio"
              aria-checked={isActive}
              aria-label={m.label}
              title={m.label}
              onClick={() => setTheme(m.value)}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                isActive
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </button>
          );
        })}
      </div>
    );
  }

  // Full variant for settings pages — shows labels.
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5"
    >
      {modes.map((m) => {
        const isActive = mounted && current === m.value;
        const Icon = m.icon;
        return (
          <button
            key={m.value}
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(m.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              isActive
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span className="capitalize">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
