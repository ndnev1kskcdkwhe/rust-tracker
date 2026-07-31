"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

interface RustMapMonument {
  type: string;
  coordinates: { x: number; y: number };
}

interface RustMapData {
  id: string;
  seed: number;
  size: number;
  url: string;
  imageUrl: string;
  imageIconUrl: string;
  totalMonuments: number;
  monuments: RustMapMonument[];
}

type ApiResult =
  | { ok: true; status: "ready"; map: RustMapData; fromCache: boolean }
  | { ok: true; status: "generating"; mapId: string; queuePosition: number | null }
  | { error: string };

type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "generating"; mapId: string; queuePosition: number | null; size: number; seed: number }
  | { kind: "ready"; map: RustMapData; fromCache: boolean }
  | { kind: "error"; message: string };

function groupMonuments(monuments: RustMapMonument[]) {
  const counts = new Map<string, number>();
  for (const m of monuments) {
    counts.set(m.type, (counts.get(m.type) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function humanizeMonumentType(type: string): string {
  return type
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MapsPage() {
  const searchParams = useSearchParams();
  const [size, setSize] = useState(searchParams.get("size") ?? "");
  const [seed, setSeed] = useState(searchParams.get("seed") ?? "");
  const [state, setState] = useState<ViewState>({ kind: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  const fetchMap = async (sizeNum: number, seedNum: number, mapId?: string) => {
    const url = new URL("/api/maps", window.location.origin);
    url.searchParams.set("size", String(sizeNum));
    url.searchParams.set("seed", String(seedNum));
    if (mapId) {
      url.searchParams.set("mapId", mapId);
    }
    let data: ApiResult;
    try {
      const res = await fetch(url);
      // A 500 can come back with an empty body, which makes res.json() throw — without this
      // guard the rejection is unhandled and the page sits on "loading" forever.
      data = (await res.json().catch(() => ({ error: "Сервіс мап зараз недоступний." }))) as ApiResult;
    } catch {
      stopPolling();
      setState({ kind: "error", message: "Не вдалося зв'язатися з сервером. Перевір з'єднання." });
      return;
    }

    if ("error" in data) {
      stopPolling();
      setState({ kind: "error", message: data.error });
      return;
    }
    if (data.status === "ready") {
      stopPolling();
      setState({ kind: "ready", map: data.map, fromCache: data.fromCache });
      return;
    }

    setState({ kind: "generating", mapId: data.mapId, queuePosition: data.queuePosition, size: sizeNum, seed: seedNum });
    if (!pollRef.current) {
      pollAttemptsRef.current = 0;
      pollRef.current = setInterval(() => {
        pollAttemptsRef.current += 1;
        if (pollAttemptsRef.current > 30) {
          stopPolling();
          return;
        }
        fetchMap(sizeNum, seedNum, data.mapId);
      }, 4000);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    stopPolling();

    const sizeNum = Number(size);
    const seedNum = Number(seed);
    if (!Number.isFinite(sizeNum) || !Number.isFinite(seedNum)) {
      setState({ kind: "error", message: "Введи розмір і сід як числа" });
      return;
    }

    setState({ kind: "loading" });
    fetchMap(sizeNum, seedNum);
  };

  return (
    <div className="page">
      <div className="shell">
        <h1 className="page-title rise">Прев&apos;ю мапи</h1>
        <p className="page-lede rise" style={{ ["--d" as string]: "60ms" }}>
          Введи розмір і сід мапи (їх видно в конфігу власного сервера, або якщо адмін вказав їх у
          назві сервера) — покажемо картинку і список монументів через RustMaps.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-7 flex flex-wrap items-end gap-3 rise"
          style={{ ["--d" as string]: "120ms" }}
        >
          <label className="field flex-1 min-w-[8rem]">
            Розмір
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="3500"
              min={1000}
              max={6000}
              required
              className="input mono"
            />
          </label>
          <label className="field flex-1 min-w-[8rem]">
            Сід
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="12345"
              min={0}
              required
              className="input mono"
            />
          </label>
          <button
            type="submit"
            disabled={state.kind === "loading" || state.kind === "generating"}
            className="btn btn-primary shrink-0"
          >
            {state.kind === "loading" || state.kind === "generating" ? "Завантаження..." : "Показати"}
          </button>
        </form>

        <div className="mt-6">
          {state.kind === "error" && <p className="note note-bad">{state.message}</p>}

          {state.kind === "generating" && (
            <div className="panel flex items-start gap-3">
              <span className="spinner mt-1" aria-hidden />
              <p className="text-sm muted leading-relaxed">
                RustMaps ще генерує цю мапу вперше
                {state.queuePosition !== null && ` (позиція в черзі: ${state.queuePosition})`} — це може
                зайняти кілька хвилин. Сторінка сама перевіряє прогрес, можна почекати тут.
              </p>
            </div>
          )}

          {state.kind === "ready" && (
            <div className="panel flex flex-col gap-4 rise">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="section-title mono">
                    {state.map.size} · сід {state.map.seed}
                  </p>
                  <p className="mt-1 text-xs faint">
                    {state.map.totalMonuments} монументів · {state.fromCache ? "з кешу" : "щойно отримано"}
                  </p>
                </div>
                <a href={state.map.url} target="_blank" rel="noopener noreferrer" className="link-accent">
                  rustmaps.com →
                </a>
              </div>

              <a href={state.map.url} target="_blank" rel="noopener noreferrer" className="map-frame">
                <Image
                  src={state.map.imageIconUrl}
                  alt={`Мапа ${state.map.size}/${state.map.seed}`}
                  width={800}
                  height={800}
                  unoptimized
                />
              </a>

              <div>
                <p className="label">Монументи</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {groupMonuments(state.map.monuments).map(([type, count]) => (
                    <span key={type} className="badge">
                      {humanizeMonumentType(type)}
                      {count > 1 && <span className="mono text-[var(--accent)]">×{count}</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
