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
      <div className="page">
        <div className="shell-wide">
          <Link href="/servers" className="back-link">
            <span className="back-arrow">←</span> Новий пошук
          </Link>
          <div className="panel mt-6 rise">
            <p className="danger-text">{result.error}</p>
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

  const fillPct = server.maxPlayers > 0 ? (server.players / server.maxPlayers) * 100 : 0;

  return (
    <div className="page">
      <div className="shell-wide">
        <Link href="/servers" className="back-link">
          <span className="back-arrow">←</span> Новий пошук
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr_20rem]">
          {/* Server info */}
          <div className="panel flex flex-col gap-5 rise">
            <div>
              <h1 className="text-xl font-bold leading-snug tracking-tight">{server.name}</h1>
              <div className="mt-3 flex items-center gap-3">
                <span className="mono text-sm">
                  <span className="text-[var(--accent)] font-semibold">{server.players}</span>
                  <span className="faint"> / {server.maxPlayers}</span>
                </span>
                <span className="fill grow" style={{ width: "auto", maxWidth: "12rem" }}>
                  <span className="fill-bar fill-busy" style={{ width: `${Math.min(100, fillPct)}%` }} />
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {server.region && <span className="badge">{server.region}</span>}
              {server.gameMode && <span className="badge">{server.gameMode}</span>}
              <span className="badge">{server.map}</span>
              <span className={`badge ${server.secure ? "badge-ok" : "badge-warn"}`}>
                {server.secure ? "VAC secure" : "без VAC"}
              </span>
            </div>

            <div className="inset flex flex-col gap-2 text-sm">
              <p className="kv">
                <span className="faint">Останній вайп</span>
                <span>{formatDate(server.wipedAt)}</span>
              </p>
              <p className="kv">
                <span className="faint">Наступний вайп</span>
                {estimatedNextWipe ? (
                  <span>
                    {formatDate(estimatedNextWipe)}
                    <span className="block text-xs faint">
                      орієнтовно, {wipeCycle && CYCLE_LABEL[wipeCycle]}
                    </span>
                  </span>
                ) : (
                  <span className="faint text-right text-xs">
                    невідомо — цикл не вказано
                    <br />в назві сервера
                  </span>
                )}
              </p>
            </div>

            <a
              href={`steam://run/${RUST_APP_ID}//+connect%20${server.connectAddr}`}
              className="btn btn-primary w-full"
            >
              Підключитись
            </a>

            <div className="flex flex-col gap-2">
              <p className="label">Адреса</p>
              <CopyableAddress label="Game Port" address={server.connectAddr} commandPrefix="client.connect" />
              <CopyableAddress label="Query Port" address={server.queryAddr} />
            </div>

            <p className="text-xs faint">
              {result.fromCache ? "З кешу" : "Свіжі дані"} · оновлено {formatDate(detail.fetchedAt)}
            </p>
          </div>

          {/* Map */}
          <div className="panel rise" style={{ ["--d" as string]: "90ms" }}>
            <p className="label">Мапа</p>

            {!mapSeed && (
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-sm muted">
                  Сід мапи не вдалося визначити — сервер не передає ці дані публічно.
                </p>
                <Link href="/maps" className="link-accent">
                  Спробувати вручну за сідом →
                </Link>
              </div>
            )}

            {mapSeed && mapPreview?.ok && mapPreview.status === "ready" && (
              <div className="mt-3 flex flex-col gap-3">
                <a
                  href={mapPreview.map.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-frame"
                >
                  <Image
                    src={mapPreview.map.imageIconUrl}
                    alt={`Мапа ${mapSeed.size}/${mapSeed.seed}`}
                    width={400}
                    height={400}
                    unoptimized
                  />
                </a>
                <div className="flex flex-col gap-1 text-xs faint">
                  <span className="mono">
                    {mapSeed.size} · сід {mapSeed.seed}
                  </span>
                  <span>{mapPreview.map.totalMonuments} монументів</span>
                  <span>
                    {mapSeed.source === "live" ? "визначено напряму з сервера" : "визначено з назви сервера"}
                  </span>
                </div>
                <a
                  href={mapPreview.map.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-accent"
                >
                  Відкрити на rustmaps.com →
                </a>
              </div>
            )}

            {mapSeed && mapPreview?.ok && mapPreview.status === "generating" && (
              <p className="note note-warn mt-3">
                RustMaps ще генерує цю мапу — спробуй відкрити сторінку ще раз за кілька хвилин.
              </p>
            )}

            {mapSeed && mapPreview && !mapPreview.ok && (
              <p className="note note-bad mt-3">{mapPreview.error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
