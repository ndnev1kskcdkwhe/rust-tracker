import Link from "next/link";

const FEATURES = [
  {
    href: "/players",
    emoji: "🔍",
    title: "Пошук гравця",
    desc: "Профіль Steam, години в грі, VAC/game-бани — за SteamID чи посиланням на профіль.",
  },
  {
    href: "/servers",
    emoji: "🖥️",
    title: "Сервери",
    desc: "Пошук серверів у реальному часі: конект, кількість гравців, час вайпу, прев'ю мапи.",
  },
  {
    href: "/calculators",
    emoji: "🧮",
    title: "Калькулятори",
    desc: "Скільки вибухівки треба на рейд і як спланувати схрещування рослин.",
  },
];

export function HomeFeatures() {
  return (
    <section className="relative w-full border-t border-white/10 bg-black px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold text-white">Що є на сайті</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-6 transition-colors hover:border-orange-500/40 hover:bg-white/[.06]"
            >
              <span className="text-3xl">{f.emoji}</span>
              <span className="text-lg font-semibold text-white">{f.title}</span>
              <span className="text-sm text-zinc-400">{f.desc}</span>
              <span className="mt-2 text-sm font-medium text-orange-500 transition-transform group-hover:translate-x-1">
                Перейти →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
