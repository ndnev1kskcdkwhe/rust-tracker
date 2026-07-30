/** EN/ZH dictionaries already exist (src/lib/i18n/dictionaries/{en,zh}.ts) but are excluded
 * here for now, per explicit request to ship only uk/ru first — add them back to this list
 * (and to DICTIONARIES in ./dictionaries/index.ts) to re-enable. */
export const LOCALES = ["uk", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "uk";
export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  uk: "🇺🇦 UK",
  ru: "🇷🇺 RU",
};
