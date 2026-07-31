import Link from "next/link";

const CALCULATORS = [
  {
    href: "/calculators/raid",
    title: "Рейд-калькулятор",
    desc: "Найдешевша комбінація вибухівки для знесення стіни, фундаменту чи дверей.",
    icon: (
      <>
        <path
          d="M12 2.5c2.6 2.6 4 6 4 9.4V19H8v-7.1c0-3.4 1.4-6.8 4-9.4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M8 19l-2.5 3H10M16 19l2.5 3H14" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="1.7" fill="currentColor" />
      </>
    ),
  },
  {
    href: "/calculators/genetics",
    title: "Генетика рослин",
    desc: "Прогноз схрещування клонів і збереження власної бази геномів по культурах.",
    icon: (
      <>
        <path d="M7 3c0 6 10 6 10 12M17 3c0 6-10 6-10 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 21h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 7.5h7M8.5 12h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".6" />
      </>
    ),
  },
];

export default function CalculatorsPage() {
  return (
    <div className="page">
      <div className="shell">
        <h1 className="page-title rise">Калькулятори</h1>
        <p className="page-lede rise" style={{ ["--d" as string]: "60ms" }}>
          Рахують локально, без звернень до зовнішніх сервісів.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {CALCULATORS.map((c, i) => (
            <Link
              key={c.href}
              href={c.href}
              className="card-link rise"
              style={{ ["--d" as string]: `${120 + i * 70}ms` }}
            >
              <span className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                  {c.icon}
                </svg>
              </span>
              <span className="section-title">{c.title}</span>
              <span className="text-sm leading-relaxed muted">{c.desc}</span>
              <span className="go mt-auto pt-2">Відкрити →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
