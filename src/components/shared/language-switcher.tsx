"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, LOCALES, type Locale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();
  const current = LOCALES.find((l) => l.value === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "sm" : "sm"}
          className="gap-1.5"
          aria-label={`Language: ${current?.label ?? "English"}. Click to change.`}
        >
          <Globe className="h-4 w-4" aria-hidden />
          <span className="text-xs font-medium">{current?.nativeLabel ?? "English"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Language · Asụsụ · Èdè · Harshe
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.value}
            onClick={() => setLocale(l.value as Locale)}
            className={cn(
              "flex items-center justify-between",
              locale === l.value && "bg-primary/10 text-primary",
            )}
          >
            <span>{l.nativeLabel}</span>
            <span className="text-xs text-muted-foreground">{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
