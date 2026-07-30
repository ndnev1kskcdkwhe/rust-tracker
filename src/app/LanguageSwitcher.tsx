"use client";

import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locale";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border border-black/10 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-white/15 dark:bg-black/60">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            code === locale
              ? "bg-orange-600 text-white"
              : "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
          }`}
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
