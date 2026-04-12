import type { enUS } from "./locales/en-US.js";

/** All translation keys — derived from en-US (source of truth). */
export type TranslationKeys = Record<keyof typeof enUS, string>;

/** Supported locale slugs in xx-YY format. */
export type LocaleSlug = "en-US" | "pt-BR" | "es-ES";

/** Metadata for a supported locale. */
export interface LocaleInfo {
  slug: LocaleSlug;
  name: string;
  flag: string;
}
