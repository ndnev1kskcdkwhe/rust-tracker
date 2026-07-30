"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export function HomeHero() {
  const router = useRouter();
  const { dict } = useTranslation();
  const [query, setQuery] = useState("");
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % dict.home.rotatingWords.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [dict.home.rotatingWords.length]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    router.push(`/players/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 80% 15%, rgba(234,88,12,0.20), transparent 70%), radial-gradient(45% 45% at 10% 95%, rgba(234,88,12,0.10), transparent 70%), #000",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">{dict.home.badge}</p>
      <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight text-white sm:text-5xl">
        {dict.home.heroTitleStart}{" "}
        <span className="text-orange-500">{dict.home.rotatingWords[wordIndex]}</span>
      </h1>
      <p className="mt-4 max-w-xl text-zinc-400">{dict.home.heroSubtitle}</p>

      <form onSubmit={handleSubmit} className="mt-8 flex w-full max-w-lg gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.home.searchPlaceholder}
          className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-orange-500/50 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
        >
          {dict.home.searchButton}
        </button>
      </form>

      <div className="mt-10 flex gap-3">
        <Link
          href="/calculators"
          className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-white/30 hover:text-white"
        >
          {dict.home.calculatorsLink}
        </Link>
      </div>
    </div>
  );
}
