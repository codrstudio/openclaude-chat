import React, { createContext, useContext, useMemo } from "react";
import { enUS } from "./locales/en-US.js";
import { ptBR } from "./locales/pt-BR.js";
import { esES } from "./locales/es-ES.js";
import type { LocaleSlug, LocaleInfo, TranslationKeys } from "./types.js";

// ── Locale registry ──

const localeMap: Record<LocaleSlug, TranslationKeys> = {
  "en-US": enUS,
  "pt-BR": ptBR,
  "es-ES": esES,
};

/** All supported locales with metadata. */
export const supportedLocales: LocaleInfo[] = [
  { slug: "en-US", name: "English", flag: "🇺🇸" },
  { slug: "pt-BR", name: "Português Brasileiro", flag: "🇧🇷" },
  { slug: "es-ES", name: "Español", flag: "🇪🇸" },
];

/** Default locale. */
export const defaultLocale: LocaleSlug = "en-US";

// ── Normalizer ──

/**
 * Normalizes locale strings like "pt_br", "pt-br", "PT-BR", "pt" to "xx-YY".
 * Falls back to defaultLocale if unrecognized.
 */
export function resolveLocale(input: string | undefined): LocaleSlug {
  if (!input) return defaultLocale;
  // Normalize separator to hyphen and lowercase
  const normalized = input.replace(/_/g, "-").toLowerCase();
  // Try exact match (xx-yy → xx-YY)
  for (const locale of supportedLocales) {
    if (locale.slug.toLowerCase() === normalized) return locale.slug;
  }
  // Try language-only match (e.g. "pt" → "pt-BR")
  const lang = normalized.split("-")[0];
  for (const locale of supportedLocales) {
    if (locale.slug.toLowerCase().startsWith(lang + "-")) return locale.slug;
  }
  return defaultLocale;
}

// ── Context ──

interface LocaleContextValue {
  locale: LocaleSlug;
  t: (key: keyof TranslationKeys) => string;
  supportedLocales: LocaleInfo[];
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export interface LocaleProviderProps {
  locale?: LocaleSlug;
  children: React.ReactNode;
}

export function LocaleProvider({ locale = defaultLocale, children }: LocaleProviderProps) {
  const value = useMemo<LocaleContextValue>(() => {
    const translations = localeMap[locale] ?? enUS;
    return {
      locale,
      t: (key) => translations[key] ?? enUS[key] ?? key,
      supportedLocales,
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Fallback: if no provider, return en-US so components still work
    return {
      locale: defaultLocale,
      t: (key) => enUS[key] ?? key,
      supportedLocales,
    };
  }
  return ctx;
}
