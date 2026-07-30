import Link from "next/link";

export default function CalculatorsPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <div className="w-full max-w-2xl">
        <Link href="/" className="text-sm text-zinc-600 dark:text-zinc-400">
          ← На головну
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-black dark:text-zinc-50">Калькулятори</h1>

        <div className="mt-6 flex flex-col gap-4">
          <Link
            href="/calculators/raid"
            className="rounded-2xl border border-black/[.08] bg-white p-6 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:bg-black dark:hover:bg-white/[.04]"
          >
            <h2 className="text-lg font-medium text-black dark:text-zinc-50">Рейд-калькулятор</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Найдешевша комбінація вибухівки для знесення стіни, фундаменту чи дверей.
            </p>
          </Link>

          <Link
            href="/calculators/farming"
            className="rounded-2xl border border-black/[.08] bg-white p-6 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:bg-black dark:hover:bg-white/[.04]"
          >
            <h2 className="text-lg font-medium text-black dark:text-zinc-50">
              Калькулятор фермерства
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Скільки ударів і часу потрібно, щоб назбирати потрібну кількість ресурсу.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
