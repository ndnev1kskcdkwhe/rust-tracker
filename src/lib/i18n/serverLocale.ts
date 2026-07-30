import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./locale";
import { DICTIONARIES, type Dictionary } from "./dictionaries";

/** Server-only: reads the locale cookie set by the language switcher. Not importable from
 * client components (depends on next/headers) — use `useTranslation()` there instead. */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<{ locale: Locale; dict: Dictionary }> {
  const locale = await getServerLocale();
  return { locale, dict: DICTIONARIES[locale] };
}
