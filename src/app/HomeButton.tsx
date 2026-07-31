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
    <Link href="/" className="home-pill rise" aria-label={dict.nav.home}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="home-pill-icon">
        <path
          d="M3 10.5 12 3l9 7.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 9.5V20h13V9.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{dict.nav.home}</span>
    </Link>
  );
}
