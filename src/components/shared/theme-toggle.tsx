"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Single-icon cycling theme toggle.
 *
 * Shows one icon representing the current mode. Each click advances to the
 * next mode in the cycle: Light → Dark → System → Light → …
 *
 * Behaviour:
 *  - Light / Dark are explicit user choices that override system preference.
 *  - System follows the OS and updates live when the OS preference changes.
 *  - The choice persists via next-themes (localStorage key "netlodge-theme").
 *  - An inline anti-flash script in layout.tsx applies the theme before paint.
 */

type ThemeMode = "light" | "dark" | "system";

const cycle: ThemeMode[] = ["light", "dark", "system"];

const modeMeta: Record<ThemeMode, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  light: { label: "Light", icon: Sun },
  dark: { label: "Dark", icon: Moon },
  system: { label: "System", icon: Monitor },
};

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const current = (theme as ThemeMode) ?? "system";
  const Meta = mounted ? modeMeta[current] : modeMeta.system;
  const Icon = Meta.icon;

  function handleClick() {
    const idx = cycle.indexOf(current);
    const next = cycle[(idx + 1) % cycle.length];
    setTheme(next);
  }

  if (compact) {
    return (
      <button
        onClick={handleClick}
        aria-label={`Theme: ${Meta.label}. Click to change.`}
        title={`Theme: ${Meta.label}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      >
        <Icon className="h-4 w-4 transition-transform duration-200" aria-hidden />
      </button>
    );
  }

  // Full variant for settings pages — shows label + icon.
  return (
    <button
      onClick={handleClick}
      aria-label={`Theme: ${Meta.label}. Click to change.`}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
    >
      <Icon className="h-4 w-4 transition-transform duration-200" aria-hidden />
      <span>{Meta.label}</span>
      <span className="text-xs text-muted-foreground">→ {cycle[(cycle.indexOf(current) + 1) % cycle.length]}</span>
    </button>
  );
}
