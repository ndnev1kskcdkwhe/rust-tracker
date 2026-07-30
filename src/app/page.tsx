import Link from "next/link";
import { auth, signOut } from "@/auth";
import { HomeHero } from "./HomeHero";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col bg-black font-sans">
      <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
        <span className="text-sm font-bold uppercase tracking-widest text-white">
          Rust <span className="text-orange-500">Tracker</span>
        </span>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/players" className="text-zinc-300 transition-colors hover:text-white">
            Пошук гравця
          </Link>
          <Link href="/servers" className="text-zinc-300 transition-colors hover:text-white">
            Сервери
          </Link>
          <Link href="/maps" className="text-zinc-300 transition-colors hover:text-white">
            Мапи
          </Link>
          <Link href="/calculators" className="text-zinc-300 transition-colors hover:text-white">
            Калькулятори
          </Link>
          {session?.user ? (
            <>
              <span className="text-zinc-500">{session.user.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-full border border-white/15 px-4 py-1.5 text-zinc-300 transition-colors hover:border-white/30 hover:text-white"
                >
                  Вийти
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-zinc-300 transition-colors hover:text-white">
                Увійти
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-white px-4 py-1.5 font-medium text-black transition-colors hover:bg-zinc-200"
              >
                Реєстрація
              </Link>
            </>
          )}
        </div>
      </nav>

      <HomeHero />
    </div>
  );
}
