"use client";

import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locale";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="lang-dock rise" style={{ ["--d" as string]: "260ms" }}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={code === locale}
          className="lang-btn"
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
