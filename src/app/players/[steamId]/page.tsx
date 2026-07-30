import Link from "next/link";
import Image from "next/image";
import { getPlayerProfile } from "@/lib/players/getPlayerProfile";

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

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <div className="w-full max-w-2xl">
        <Link href="/players" className="text-sm text-zinc-600 dark:text-zinc-400">
          ← Новий пошук
        </Link>

        {!result.ok ? (
          <div className="mt-6 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <p className="text-red-600 dark:text-red-400">{result.error}</p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div className="flex items-center gap-4">
              <Image
                src={result.profile.avatarUrl}
                alt={result.profile.name}
                width={64}
                height={64}
                className="rounded-lg"
                unoptimized
              />
              <div>
                <a
                  href={result.profile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-medium text-black hover:underline dark:text-zinc-50"
                >
                  {result.profile.name}
                </a>
                <p className="text-xs text-zinc-500">{result.profile.steamId}</p>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
              <p className="text-zinc-700 dark:text-zinc-300">
                Годин у Rust:{" "}
                <span className="font-medium text-black dark:text-zinc-50">
                  {result.profile.hoursInRust === null
                    ? "приховано в приватності профілю"
                    : result.profile.hoursInRust}
                </span>
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs text-zinc-500">Бан-статус</p>
              <div className="flex flex-wrap gap-2">
                <BanBadge label="VAC" active={result.profile.vacBanned} />
                <BanBadge label="Community" active={result.profile.communityBanned} />
                <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  Game-бани: {result.profile.gameBans}
                </span>
                <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  Economy: {result.profile.economyBan}
                </span>
              </div>
              {result.profile.daysSinceLastBan > 0 && (
                <p className="mt-2 text-xs text-zinc-500">
                  Останній бан: {result.profile.daysSinceLastBan} дн. тому
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs text-zinc-500">Історія імен, сесії, останні сервери</p>
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
        )}
      </div>
    </div>
  );
}
