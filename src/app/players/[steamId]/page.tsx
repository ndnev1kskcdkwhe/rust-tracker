import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { getPlayerProfile } from "@/lib/players/getPlayerProfile";
import { recordPlayerView } from "@/lib/players/history";
import { countryCodeToFlagEmoji } from "@/lib/players/countryFlag";
import { CopyableSteamId, ShareProfileButton } from "./ProfileActions";

function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="stat">
      <p className="label">{label}</p>
      <p className="stat-value">{value}</p>
      {hint && <p className="mt-1 text-xs faint">{hint}</p>}
    </div>
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
    <div className="page">
      <div className="shell-wide">
        <Link href="/players" className="back-link">
          <span className="back-arrow">←</span> Новий пошук
        </Link>

        {!result.ok ? (
          <div className="panel mt-6 rise">
            <p className="danger-text">{result.error}</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[19rem_1fr]">
            {/* Identity */}
            <div className="panel flex flex-col gap-4 rise">
              <div className="flex flex-col items-center text-center">
                <div className="avatar-ring">
                  <Image
                    src={result.profile.avatarUrl}
                    alt={result.profile.name}
                    width={96}
                    height={96}
                    unoptimized
                  />
                </div>
                <a
                  href={result.profile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-lg font-semibold text-[var(--tx)] hover:text-[var(--accent)] transition-colors"
                >
                  {result.profile.name}
                </a>
                {result.profile.realName && (
                  <p className="text-sm faint">{result.profile.realName}</p>
                )}
                <span className={`badge mt-3 ${result.profile.isOnline ? "badge-ok" : ""}`}>
                  <span className={`dot ${result.profile.isOnline ? "dot-live" : ""}`} />
                  {result.profile.isOnline ? "Онлайн" : "Офлайн"}
                </span>
              </div>

              <CopyableSteamId steamId={result.profile.steamId} />

              <div className="flex flex-col gap-1.5 text-sm muted">
                {result.profile.accountCreatedAt && (
                  <p className="kv">
                    <span className="faint">Створено</span>
                    <span>{new Date(result.profile.accountCreatedAt).toLocaleDateString("uk-UA")}</span>
                  </p>
                )}
                {result.profile.countryCode && (
                  <p className="kv">
                    <span className="faint">Країна</span>
                    <span>
                      {countryCodeToFlagEmoji(result.profile.countryCode)} {result.profile.countryCode}
                    </span>
                  </p>
                )}
                {result.profile.currentGame && (
                  <p className="kv">
                    <span className="faint">Зараз грає</span>
                    <span>{result.profile.currentGame.name}</span>
                  </p>
                )}
              </div>

              <ShareProfileButton />
            </div>

            {/* Stats + bans */}
            <div className="flex flex-col gap-4">
              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 rise"
                style={{ ["--d" as string]: "80ms" }}
              >
                <StatCard
                  label="Годин у Rust"
                  value={result.profile.hoursInRust ?? "—"}
                  hint={result.profile.hoursInRust === null ? "приховано" : undefined}
                />
                <StatCard label="Game-бани" value={result.profile.gameBans} />
                <StatCard label="Economy" value={result.profile.economyBan} />
              </div>

              <div className="panel rise" style={{ ["--d" as string]: "140ms" }}>
                <p className="label">Бан-статус</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`badge ${result.profile.vacBanned ? "badge-bad" : "badge-ok"}`}>
                    VAC: {result.profile.vacBanned ? "так" : "ні"}
                  </span>
                  <span className={`badge ${result.profile.communityBanned ? "badge-bad" : "badge-ok"}`}>
                    Community: {result.profile.communityBanned ? "так" : "ні"}
                  </span>
                </div>
                {result.profile.daysSinceLastBan > 0 && (
                  <p className="mt-3 text-xs faint">
                    Останній бан: {result.profile.daysSinceLastBan} дн. тому
                  </p>
                )}
                {!result.profile.vacBanned &&
                  !result.profile.communityBanned &&
                  result.profile.gameBans === 0 && (
                    <p className="mt-3 text-sm" style={{ color: "var(--ok)" }}>
                      Чиста репутація — банів немає.
                    </p>
                  )}
              </div>

              <div className="panel rise" style={{ ["--d" as string]: "200ms" }}>
                <p className="label">Історія імен, сесії, останні сервери, K/D</p>
                {result.profile.battlemetrics.available ? null : (
                  <p className="note note-warn mt-3">{result.profile.battlemetrics.reason}</p>
                )}
              </div>

              <p className="text-xs faint">
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
