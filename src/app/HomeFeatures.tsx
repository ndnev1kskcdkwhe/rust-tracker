import Link from "next/link";
import { getDictionary } from "@/lib/i18n/serverLocale";

const FEATURES = [
  {
    href: "/players",
    icon: (
      <>
        <circle cx="12" cy="8.5" r="3.8" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M4.5 20c.9-3.7 3.9-5.6 7.5-5.6s6.6 1.9 7.5 5.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    href: "/servers",
    icon: (
      <>
        <rect x="3.2" y="4.5" width="17.6" height="6" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
        <rect x="3.2" y="13.5" width="17.6" height="6" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6.8 7.5h.01M6.8 16.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/calculators",
    icon: (
      <>
        <rect x="4.5" y="3" width="15" height="18" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 7.5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </>
    ),
  },
];

export async function HomeFeatures() {
  const { dict } = await getDictionary();

  return (
    <section className="features">
      <div className="shell-wide">
        <p className="label text-center">{dict.home.featuresTitle}</p>
        <div className="features-grid">
          {dict.home.features.map((f, i) => (
            <Link key={FEATURES[i].href} href={FEATURES[i].href} className="card-link">
              <span className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                  {FEATURES[i].icon}
                </svg>
              </span>
              <span className="section-title">{f.title}</span>
              <span className="text-sm leading-relaxed muted">{f.desc}</span>
              <span className="go mt-auto pt-2">{f.linkText}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
