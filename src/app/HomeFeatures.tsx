import Link from "next/link";
import { getDictionary } from "@/lib/i18n/serverLocale";

const HREFS = ["/players", "/servers", "/calculators"];
const EMOJIS = ["🔍", "🖥️", "🧮"];

export async function HomeFeatures() {
  const { dict } = await getDictionary();

  return (
    <section className="relative w-full border-t border-white/10 bg-black px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold text-white">{dict.home.featuresTitle}</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {dict.home.features.map((f, i) => (
            <Link
              key={HREFS[i]}
              href={HREFS[i]}
              className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-6 transition-colors hover:border-orange-500/40 hover:bg-white/[.06]"
            >
              <span className="text-3xl">{EMOJIS[i]}</span>
              <span className="text-lg font-semibold text-white">{f.title}</span>
              <span className="text-sm text-zinc-400">{f.desc}</span>
              <span className="mt-2 text-sm font-medium text-orange-500 transition-transform group-hover:translate-x-1">
                {f.linkText}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
