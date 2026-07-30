"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export function HomeButton() {
  const pathname = usePathname();
  const { dict } = useTranslation();
  if (pathname === "/") {
    return null;
  }

  return (
    <Link
      href="/"
      className="fixed left-4 top-4 z-50 flex items-center gap-1.5 rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-xs font-medium text-black shadow-sm backdrop-blur transition-colors hover:bg-white dark:border-white/15 dark:bg-black/60 dark:text-white dark:hover:bg-black/80"
    >
      <span aria-hidden>🏠</span>
      <span>{dict.nav.home}</span>
    </Link>
  );
}
