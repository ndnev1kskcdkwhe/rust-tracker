import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-8 py-32 px-16 bg-white dark:bg-black">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Rust Tracker
        </h1>

        {session?.user ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-zinc-600 dark:text-zinc-400">
              Увійшли як <span className="font-medium text-black dark:text-zinc-50">{session.user.email}</span>
            </p>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="h-11 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                Вийти
              </button>
            </form>
          </div>
        ) : (
          <div className="flex gap-4">
            <Link
              href="/login"
              className="flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Увійти
            </Link>
            <Link
              href="/register"
              className="flex h-11 items-center justify-center rounded-full border border-solid border-black/[.08] px-6 text-sm font-medium transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              Реєстрація
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
