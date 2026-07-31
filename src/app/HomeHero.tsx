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
    }, 2600);
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

  const word = dict.home.rotatingWords[wordIndex % dict.home.rotatingWords.length];

  return (
    <section className="hero">
      <span className="hero-eyebrow rise">
        <span className="dot dot-live" />
        {dict.home.badge}
      </span>

      <h1 className="hero-title rise" style={{ ["--d" as string]: "70ms" }}>
        {dict.home.heroTitleStart}{" "}
        {/* keyed so the word re-mounts and replays its transition on each rotation */}
        <span key={`${word}-${wordIndex}`} className="hero-word swap">
          {word}
        </span>
      </h1>

      <p className="hero-lede rise" style={{ ["--d" as string]: "140ms" }}>
        {dict.home.heroSubtitle}
      </p>

      <form
        onSubmit={handleSubmit}
        className="hero-search rise"
        style={{ ["--d" as string]: "210ms" }}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className="hero-search-icon">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.home.searchPlaceholder}
          className="hero-input"
          aria-label={dict.home.searchPlaceholder}
        />
        <button type="submit" className="btn btn-primary btn-sm">
          {dict.home.searchButton}
        </button>
      </form>

      <div className="rise" style={{ ["--d" as string]: "280ms" }}>
        <Link href="/calculators" className="btn btn-sm">
          {dict.home.calculatorsLink}
        </Link>
      </div>
    </section>
  );
}
