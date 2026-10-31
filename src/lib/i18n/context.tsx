"use client";

import * as React from "react";
import {
  dictionaries,
  LOCALES,
  type Locale,
  type TranslationKey,
} from "./dictionaries";

export type { Locale, TranslationKey };
export { LOCALES };

// ─── Context ─────────────────────────────────────────────────────────

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "netlodge-locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>("en");

  // Load saved locale from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && ["en", "ig", "yo", "ha"].includes(saved)) {
        setLocaleState(saved);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const t = React.useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const raw = dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
      if (!vars) return raw;
      // Substitute {placeholder} tokens with provided values
      return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
        vars[name] !== undefined ? String(vars[name]) : `{${name}}`,
      );
    },
    [locale],
  );

  const value = React.useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
