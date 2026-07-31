import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getDictionary } from "@/lib/i18n/serverLocale";
import { Logo } from "./Logo";
import { HomeHero } from "./HomeHero";
import { HomeFeatures } from "./HomeFeatures";

export default async function Home() {
  const session = await auth();
  const { dict } = await getDictionary();

  return (
    <div className="flex flex-1 flex-col">
      <header className="site-header">
        <Logo />
        <nav className="flex items-center gap-2">
          {session?.user ? (
            <>
              <Link href="/account" className="btn btn-sm">
                {dict.nav.account}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="btn btn-sm">
                  {dict.nav.logout}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-sm">
                {dict.nav.login}
              </Link>
              <Link href="/register" className="btn btn-sm btn-primary">
                {dict.nav.register}
              </Link>
            </>
          )}
        </nav>
      </header>

      <HomeHero />
      <HomeFeatures />

      <footer className="site-footer">
        <span className="faint text-xs">Rust Tracker · {new Date().getFullYear()}</span>
        <span className="faint text-xs">
          Дані: Steam Web API · RustMaps · не афілійовано з Facepunch Studios
        </span>
      </footer>
    </div>
  );
}
