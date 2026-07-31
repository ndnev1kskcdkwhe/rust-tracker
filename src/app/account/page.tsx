import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlayerProfile } from "@/lib/players/getPlayerProfile";
import { SteamIcon } from "../SteamIcon";

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
    <div className="page">
      <div className="shell-wide">
        <h1 className="page-title rise">Особистий кабінет</h1>

        {error && ERROR_MESSAGES[error] && <p className="note note-bad mt-4">{ERROR_MESSAGES[error]}</p>}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Account info */}
          <div className="panel rise">
            <p className="label">Акаунт</p>
            <div className="mt-3 flex flex-col gap-2 text-sm muted">
              <p className="kv">
                <span className="faint">Ім&apos;я</span>
                <span>{user.name || "—"}</span>
              </p>
              <p className="kv">
                <span className="faint">Email</span>
                <span className="truncate">
                  {user.steamId && user.email.endsWith("@steamcommunity.com")
                    ? "не прив'язано"
                    : user.email}
                </span>
              </p>
              <p className="kv">
                <span className="faint">У нас з</span>
                <span>{formatDate(user.createdAt)}</span>
              </p>
            </div>
          </div>

          {/* Steam link status */}
          <div className="panel rise" style={{ ["--d" as string]: "70ms" }}>
            <p className="label">Steam</p>

            {!user.steamId && (
              <div className="mt-3 flex flex-col items-start gap-3">
                <p className="text-sm muted leading-relaxed">
                  Акаунт увійшов через email — щоб бачити свої ігрові дані (профіль, години,
                  бан-статус), прив&apos;яжи Steam.
                </p>
                <Link href="/api/auth/steam/login?mode=link" className="btn btn-steam btn-sm">
                  <SteamIcon /> Прив&apos;язати Steam
                </Link>
              </div>
            )}

            {user.steamId && steamProfile?.ok && (
              <div className="mt-3 flex items-center gap-4">
                <div className="avatar-ring shrink-0">
                  <Image
                    src={steamProfile.profile.avatarUrl}
                    alt={steamProfile.profile.name}
                    width={64}
                    height={64}
                    unoptimized
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-semibold">{steamProfile.profile.name}</span>
                  <span className="text-xs faint">
                    {steamProfile.profile.hoursInRust !== null
                      ? `${steamProfile.profile.hoursInRust} год у Rust`
                      : "години приховані"}
                  </span>
                  <span className={`badge w-fit ${steamProfile.profile.vacBanned ? "badge-bad" : "badge-ok"}`}>
                    {steamProfile.profile.vacBanned ? "VAC бан" : "без VAC-бану"}
                  </span>
                  <Link href={`/players/${user.steamId}`} className="link-accent mt-1">
                    Повний профіль →
                  </Link>
                </div>
              </div>
            )}

            {user.steamId && steamProfile && !steamProfile.ok && (
              <p className="mt-3 text-sm faint">
                Steam прив&apos;язано (<span className="mono">{user.steamId}</span>), але профіль зараз
                недоступний.
              </p>
            )}
          </div>
        </div>

        {/* History */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="panel panel-flush rise" style={{ ["--d" as string]: "140ms" }}>
            <p className="label px-5 pt-5">Переглянуті гравці</p>
            {playerHistory.length === 0 ? (
              <p className="empty-note">Ще немає історії.</p>
            ) : (
              <div className="mt-3">
                {playerHistory.map((entry) => (
                  <Link key={entry.id} href={`/players/${entry.steamId}`} className="row">
                    <span className="mono truncate text-xs">{entry.steamId}</span>
                    <span className="shrink-0 text-[0.65rem] faint">{formatDate(entry.viewedAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="panel panel-flush rise" style={{ ["--d" as string]: "200ms" }}>
            <p className="label px-5 pt-5">Переглянуті мапи</p>
            {mapHistory.length === 0 ? (
              <p className="empty-note">Ще немає історії.</p>
            ) : (
              <div className="mt-3">
                {mapHistory.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/maps?size=${entry.size}&seed=${entry.seed}`}
                    className="row"
                  >
                    <span className="mono truncate text-xs">
                      {entry.size} / {entry.seed}
                    </span>
                    <span className="shrink-0 text-[0.65rem] faint">{formatDate(entry.viewedAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
