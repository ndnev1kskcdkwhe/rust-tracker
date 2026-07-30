import type { Locale } from "../locale";
import { uk } from "./uk";
import { ru } from "./ru";
import type { Dictionary } from "./types";

export type { Dictionary } from "./types";

/** Pure — safe to import from both client and server components. Server components that need
 * to read the current locale from the request cookie should use `getDictionary` from
 * `@/lib/i18n/serverLocale` instead (that one depends on `next/headers`, which client
 * components can't import).
 *
 * en/zh dictionaries already exist (./en.ts, ./zh.ts) but are excluded here for now — add them
 * back (and to LOCALES in ../locale.ts) to re-enable those languages. */
export const DICTIONARIES: Record<Locale, Dictionary> = { uk, ru };
