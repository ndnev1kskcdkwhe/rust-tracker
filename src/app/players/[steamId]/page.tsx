import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { getPlayerProfile } from "@/lib/players/getPlayerProfile";
import { recordPlayerView } from "@/lib/players/history";
import { countryCodeToFlagEmoji } from "@/lib/players/countryFlag";
import { CopyableSteamId, ShareProfileButton } from "./ProfileActions";

function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-black dark:text-zinc-50">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function BanBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active ? "bg-red-600 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
      }`}
    >
      {label}: {active ? "так" : "ні"}
    </span>
  );
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ steamId: string }>;
}) {
  const { steamId } = await params;
  const result = await getPlayerProfile(decodeURIComponent(steamId));

  if (result.ok) {
    const session = await auth();
    if (session?.user?.id) {
      await recordPlayerView(session.user.id, result.profile.steamId);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <div className="w-full max-w-4xl">
        <Link href="/players" className="text-sm text-zinc-600 dark:text-zinc-400">
          ← Новий пошук
        </Link>

        {!result.ok ? (
          <div className="mt-6 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <p className="text-red-600 dark:text-red-400">{result.error}</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
            {/* Left: identity card */}
            <div className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
              <div className="flex flex-col items-center text-center">
                <Image
                  src={result.profile.avatarUrl}
                  alt={result.profile.name}
                  width={96}
                  height={96}
                  className="rounded-xl"
                  unoptimized
                />
                <a
                  href={result.profile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-lg font-medium text-black hover:underline dark:text-zinc-50"
                >
                  {result.profile.name}
                </a>
                {result.profile.realName && (
                  <p className="text-sm text-zinc-500">{result.profile.realName}</p>
                )}
                <span
                  className={`mt-2 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    result.profile.isOnline
                      ? "bg-green-600/10 text-green-700 dark:text-green-400"
                      : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      result.profile.isOnline ? "bg-green-500" : "bg-zinc-400"
                    }`}
                  />
                  {result.profile.isOnline ? "Онлайн" : "Офлайн"}
                </span>
              </div>

              <CopyableSteamId steamId={result.profile.steamId} />

              <div className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                {result.profile.accountCreatedAt && (
                  <p>
                    Створено:{" "}
                    <span className="font-medium text-black dark:text-zinc-50">
                      {new Date(result.profile.accountCreatedAt).toLocaleDateString("uk-UA")}
                    </span>
                  </p>
                )}
                {result.profile.countryCode && (
                  <p>
                    Країна:{" "}
                    <span className="font-medium text-black dark:text-zinc-50">
                      {countryCodeToFlagEmoji(result.profile.countryCode)} {result.profile.countryCode}
                    </span>
                  </p>
                )}
                {result.profile.currentGame && (
                  <p>
                    Зараз грає:{" "}
                    <span className="font-medium text-black dark:text-zinc-50">
                      {result.profile.currentGame.name}
                    </span>
                    {result.profile.currentGame.serverIp && (
                      <span className="block font-mono text-xs">{result.profile.currentGame.serverIp}</span>
                    )}
                  </p>
                )}
              </div>

              <ShareProfileButton />
            </div>

            {/* Right: stats + bans */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Годин у Rust"
                  value={result.profile.hoursInRust ?? "—"}
                  hint={result.profile.hoursInRust === null ? "приховано в приватності" : undefined}
                />
                <StatCard label="Game-бани" value={result.profile.gameBans} />
                <StatCard label="Economy" value={result.profile.economyBan} />
              </div>

              <div className="rounded-2xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Бан-статус</p>
                <div className="flex flex-wrap gap-2">
                  <BanBadge label="VAC" active={result.profile.vacBanned} />
                  <BanBadge label="Community" active={result.profile.communityBanned} />
                </div>
                {result.profile.daysSinceLastBan > 0 && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Останній бан: {result.profile.daysSinceLastBan} дн. тому
                  </p>
                )}
                {!result.profile.vacBanned && !result.profile.communityBanned && result.profile.gameBans === 0 && (
                  <p className="mt-2 text-sm text-green-700 dark:text-green-400">Чиста репутація — банів немає.</p>
                )}
              </div>

              <div className="rounded-2xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                  Історія імен, сесії, останні сервери, K/D
                </p>
                {result.profile.battlemetrics.available ? null : (
                  <p className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                    {result.profile.battlemetrics.reason}
                  </p>
                )}
              </div>

              <p className="text-xs text-zinc-400">
                {result.fromCache ? "З кешу" : "Свіжі дані"} · оновлено{" "}
                {new Date(result.profile.fetchedAt).toLocaleString("uk-UA")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
