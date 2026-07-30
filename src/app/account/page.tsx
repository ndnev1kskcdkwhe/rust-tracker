import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlayerProfile } from "@/lib/players/getPlayerProfile";

const ERROR_MESSAGES: Record<string, string> = {
  SteamLink: "Не вдалося прив'язати Steam. Спробуй ще раз.",
  SteamTaken: "Цей Steam-акаунт вже прив'язаний до іншого користувача сайту.",
};

function formatDate(date: Date): string {
  return date.toLocaleString("uk-UA");
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { error } = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    redirect("/login");
  }

  const [playerHistory, mapHistory] = await Promise.all([
    prisma.playerViewHistory.findMany({
      where: { userId: user.id },
      orderBy: { viewedAt: "desc" },
      take: 20,
    }),
    prisma.mapViewHistory.findMany({
      where: { userId: user.id },
      orderBy: { viewedAt: "desc" },
      take: 20,
    }),
  ]);

  const steamProfile = user.steamId ? await getPlayerProfile(user.steamId) : null;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <div className="w-full max-w-3xl">
        <Link href="/" className="text-sm text-zinc-600 dark:text-zinc-400">
          ← На головну
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-black dark:text-zinc-50">Особистий кабінет</h1>

        {error && ERROR_MESSAGES[error] && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {ERROR_MESSAGES[error]}
          </div>
        )}

        {/* Account info */}
        <div className="mt-6 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Акаунт</p>
          <div className="mt-2 flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            <p>
              Ім&apos;я: <span className="font-medium text-black dark:text-zinc-50">{user.name || "—"}</span>
            </p>
            <p>
              Email:{" "}
              <span className="font-medium text-black dark:text-zinc-50">
                {user.steamId && user.email.endsWith("@steamcommunity.com") ? "не прив'язано" : user.email}
              </span>
            </p>
            <p>
              У нас з: <span className="font-medium text-black dark:text-zinc-50">{formatDate(user.createdAt)}</span>
            </p>
          </div>
        </div>

        {/* Steam link status */}
        <div className="mt-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Steam</p>

          {!user.steamId && (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Акаунт увійшов через email — щоб бачити свої ігрові дані (профіль, години, бан-статус),
                прив&apos;яжи Steam.
              </p>
              <Link
                href="/api/auth/steam/login?mode=link"
                className="flex h-11 items-center gap-2 rounded-full bg-[#1b2838] px-6 text-sm font-medium text-white transition-colors hover:bg-[#2a3f5a]"
              >
                <span aria-hidden>🎮</span> Прив&apos;язати Steam
              </Link>
            </div>
          )}

          {user.steamId && steamProfile?.ok && (
            <div className="flex items-center gap-4">
              <Image
                src={steamProfile.profile.avatarUrl}
                alt={steamProfile.profile.name}
                width={64}
                height={64}
                className="rounded-xl"
                unoptimized
              />
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-black dark:text-zinc-50">{steamProfile.profile.name}</span>
                <span className="text-sm text-zinc-500">
                  {steamProfile.profile.hoursInRust !== null
                    ? `${steamProfile.profile.hoursInRust} год у Rust`
                    : "години приховані в приватності"}
                  {" · "}
                  {steamProfile.profile.vacBanned ? "VAC бан" : "без VAC-бану"}
                </span>
                <Link
                  href={`/players/${user.steamId}`}
                  className="mt-1 text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
                >
                  Повний профіль →
                </Link>
              </div>
            </div>
          )}

          {user.steamId && steamProfile && !steamProfile.ok && (
            <p className="text-sm text-zinc-500">Steam прив&apos;язано ({user.steamId}), але профіль зараз недоступний.</p>
          )}
        </div>

        {/* History */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Переглянуті гравці</p>
            {playerHistory.length === 0 ? (
              <p className="text-sm text-zinc-500">Ще немає історії.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {playerHistory.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link
                      href={`/players/${entry.steamId}`}
                      className="truncate font-mono text-black hover:underline dark:text-zinc-50"
                    >
                      {entry.steamId}
                    </Link>
                    <span className="shrink-0 text-xs text-zinc-500">{formatDate(entry.viewedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Переглянуті мапи</p>
            {mapHistory.length === 0 ? (
              <p className="text-sm text-zinc-500">Ще немає історії.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {mapHistory.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link
                      href={`/maps?size=${entry.size}&seed=${entry.seed}`}
                      className="truncate text-black hover:underline dark:text-zinc-50"
                    >
                      {entry.size} / {entry.seed}
                    </Link>
                    <span className="shrink-0 text-xs text-zinc-500">{formatDate(entry.viewedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
