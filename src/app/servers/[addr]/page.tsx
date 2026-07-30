import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { getServerDetail } from "@/lib/servers/getServerDetail";
import { RUST_APP_ID } from "@/lib/external/steamServers";
import { getMapPreview } from "@/lib/maps/getMapPreview";
import { recordMapView } from "@/lib/maps/history";
import { CopyableAddress } from "./ServerActions";

function formatDate(iso: string | null): string {
  if (!iso) {
    return "невідомо";
  }
  return new Date(iso).toLocaleString("uk-UA");
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        tone === "green"
          ? "bg-green-600/10 text-green-700 dark:text-green-400"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      }`}
    >
      {children}
    </span>
  );
}

const CYCLE_LABEL: Record<string, string> = {
  weekly: "щотижня",
  biweekly: "раз на 2 тижні",
  monthly: "щомісяця",
};

export default async function ServerDetailPage({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  const result = await getServerDetail(decodeURIComponent(addr));

  if (!result.ok) {
    return (
      <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
        <div className="w-full max-w-3xl">
          <Link href="/servers" className="text-sm text-zinc-600 dark:text-zinc-400">
            ← Новий пошук
          </Link>
          <div className="mt-6 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <p className="text-red-600 dark:text-red-400">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const { detail } = result;
  const { server, mapSeed, wipeCycle, estimatedNextWipe } = detail;

  const mapPreview = mapSeed ? await getMapPreview(mapSeed.size, mapSeed.seed) : null;

  if (mapSeed && mapPreview?.ok && mapPreview.status === "ready") {
    const session = await auth();
    if (session?.user?.id) {
      await recordMapView(session.user.id, mapSeed.size, mapSeed.seed);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <div className="w-full max-w-3xl">
        <Link href="/servers" className="text-sm text-zinc-600 dark:text-zinc-400">
          ← Новий пошук
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr_280px]">
          {/* Left: server info */}
          <div className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div>
              <h1 className="text-xl font-semibold text-black dark:text-zinc-50">{server.name}</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {server.players}/{server.maxPlayers} гравців · {server.map}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {server.region && <Badge>{server.region}</Badge>}
              {server.gameMode && <Badge>{server.gameMode}</Badge>}
              <Badge tone={server.secure ? "green" : "neutral"}>
                {server.secure ? "VAC secure" : "не захищено VAC"}
              </Badge>
            </div>

            <div className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                Останній вайп:{" "}
                <span className="font-medium text-black dark:text-zinc-50">
                  {formatDate(server.wipedAt)}
                </span>
              </p>
              <p>
                Наступний вайп:{" "}
                {estimatedNextWipe ? (
                  <span className="font-medium text-black dark:text-zinc-50">
                    {formatDate(estimatedNextWipe)}{" "}
                    <span className="font-normal text-zinc-500">
                      (орієнтовно, {wipeCycle && CYCLE_LABEL[wipeCycle]})
                    </span>
                  </span>
                ) : (
                  <span className="text-zinc-500">невідомо — цикл вайпу не вказано в назві сервера</span>
                )}
              </p>
            </div>

            <a
              href={`steam://run/${RUST_APP_ID}//+connect%20${server.connectAddr}`}
              className="mt-2 flex h-11 items-center justify-center rounded-full bg-orange-600 px-6 text-sm font-medium text-white transition-colors hover:bg-orange-500"
            >
              Підключитись
            </a>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Адреса</p>
              <CopyableAddress label="Game Port" address={server.connectAddr} commandPrefix="client.connect" />
              <CopyableAddress label="Query Port" address={server.queryAddr} />
            </div>

            <p className="text-xs text-zinc-400">
              {result.fromCache ? "З кешу" : "Свіжі дані"} · оновлено {formatDate(detail.fetchedAt)}
            </p>
          </div>

          {/* Right: map panel */}
          <div className="rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
            <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Мапа</p>

            {!mapSeed && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Сід мапи не вдалося визначити — сервер не передає ці дані публічно.
                </p>
                <Link
                  href="/maps"
                  className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
                >
                  Спробувати вручну за сідом →
                </Link>
              </div>
            )}

            {mapSeed && mapPreview?.ok && mapPreview.status === "ready" && (
              <div className="flex flex-col gap-3">
                <Image
                  src={mapPreview.map.imageIconUrl}
                  alt={`Мапа ${mapSeed.size}/${mapSeed.seed}`}
                  width={400}
                  height={400}
                  className="w-full rounded-xl border border-black/[.08] dark:border-white/[.145]"
                  unoptimized
                />
                <p className="text-xs text-zinc-500">
                  Розмір {mapSeed.size} · Сід {mapSeed.seed} · {mapPreview.map.totalMonuments} монументів
                  <br />
                  {mapSeed.source === "live" ? "визначено напряму з сервера" : "визначено з назви сервера"}
                </p>
                <a
                  href={mapPreview.map.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
                >
                  Відкрити на rustmaps.com →
                </a>
              </div>
            )}

            {mapSeed && mapPreview?.ok && mapPreview.status === "generating" && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                RustMaps ще генерує цю мапу — спробуй відкрити сторінку ще раз за кілька хвилин.
              </p>
            )}

            {mapSeed && mapPreview && !mapPreview.ok && (
              <p className="text-sm text-red-600 dark:text-red-400">{mapPreview.error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
