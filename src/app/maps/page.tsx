"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
    const res = await fetch(url);
    const data: ApiResult = await res.json();

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
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <div className="w-full max-w-2xl">
        <Link href="/" className="text-sm text-zinc-600 dark:text-zinc-400">
          ← На головну
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-black dark:text-zinc-50">Прев&apos;ю мапи</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Введи розмір і сід мапи (їх видно в конфігу власного сервера, або якщо адмін вказав їх у
          назві сервера) — покажемо картинку і список монументів через RustMaps.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-wrap gap-3">
          <input
            type="number"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="Розмір (напр. 3500)"
            min={1000}
            max={6000}
            required
            className="w-48 rounded-lg border border-black/[.08] px-4 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
          />
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="Сід (напр. 12345)"
            min={0}
            required
            className="w-48 rounded-lg border border-black/[.08] px-4 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={state.kind === "loading" || state.kind === "generating"}
            className="h-12 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {state.kind === "loading" || state.kind === "generating" ? "Завантаження..." : "Показати"}
          </button>
        </form>

        <div className="mt-8">
          {state.kind === "error" && (
            <div className="rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
              <p className="text-red-600 dark:text-red-400">{state.message}</p>
            </div>
          )}

          {state.kind === "generating" && (
            <div className="rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
              <p className="text-black dark:text-zinc-50">
                RustMaps ще генерує цю мапу вперше
                {state.queuePosition !== null && ` (позиція в черзі: ${state.queuePosition})`} — це може
                зайняти кілька хвилин. Сторінка сама перевіряє прогрес, можна почекати тут.
              </p>
            </div>
          )}

          {state.kind === "ready" && (
            <div className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-lg font-medium text-black dark:text-zinc-50">
                    Розмір {state.map.size} · Сід {state.map.seed}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {state.map.totalMonuments} монументів · {state.fromCache ? "з кешу" : "щойно отримано"}
                  </p>
                </div>
                <a
                  href={state.map.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
                >
                  Відкрити на rustmaps.com →
                </a>
              </div>

              <Image
                src={state.map.imageIconUrl}
                alt={`Мапа ${state.map.size}/${state.map.seed}`}
                width={800}
                height={800}
                className="w-full rounded-xl border border-black/[.08] dark:border-white/[.145]"
                unoptimized
              />

              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Монументи</p>
                <div className="flex flex-wrap gap-2">
                  {groupMonuments(state.map.monuments).map(([type, count]) => (
                    <span
                      key={type}
                      className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      {humanizeMonumentType(type)}
                      {count > 1 && ` ×${count}`}
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
