"use client";

import { useState } from "react";
import Link from "next/link";
import { parseMapSeedFromText } from "@/lib/servers/parseMapSeed";

interface RustServer {
  connectAddr: string;
  name: string;
  players: number;
  maxPlayers: number;
  map: string;
  secure: boolean;
  gameMode: string | null;
  region: string | null;
  wipedAt: string | null;
  version: string;
}

type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; servers: RustServer[]; fromCache: boolean }
  | { kind: "error"; message: string };

function formatWipe(wipedAt: string | null): string {
  if (!wipedAt) {
    return "невідомо";
  }
  const date = new Date(wipedAt);
  const hoursAgo = Math.round((Date.now() - date.getTime()) / 3_600_000);
  if (hoursAgo < 1) {
    return "менше години тому";
  }
  if (hoursAgo < 48) {
    return `${hoursAgo} год тому`;
  }
  return date.toLocaleDateString("uk-UA");
}

export default function ServersPage() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<ViewState>({ kind: "idle" });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    setState({ kind: "loading" });
    const res = await fetch(`/api/servers?q=${encodeURIComponent(trimmed)}`);
    const data = await res.json();

    if (!res.ok) {
      setState({ kind: "error", message: data.error ?? "Не вдалося знайти сервери" });
      return;
    }
    setState({ kind: "ready", servers: data.servers, fromCache: data.fromCache });
  };

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <div className="w-full max-w-3xl">
        <Link href="/" className="text-sm text-zinc-600 dark:text-zinc-400">
          ← На головну
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-black dark:text-zinc-50">Пошук сервера</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Введи назву (чи частину назви) сервера — покажемо конект, гравців і час вайпу.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rust Hungary, Facepunch, EU Vanilla..."
            className="flex-1 rounded-lg border border-black/[.08] px-4 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={state.kind === "loading"}
            className="h-12 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {state.kind === "loading" ? "Шукаю..." : "Шукати"}
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-3">
          {state.kind === "error" && (
            <div className="rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
              <p className="text-red-600 dark:text-red-400">{state.message}</p>
            </div>
          )}

          {state.kind === "ready" && state.servers.length === 0 && (
            <div className="rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
              <p className="text-zinc-600 dark:text-zinc-400">Нічого не знайдено за цим запитом.</p>
            </div>
          )}

          {state.kind === "ready" &&
            state.servers.map((server) => {
              const parsedSeed = parseMapSeedFromText(`${server.name} ${server.map}`);
              return (
                <div
                  key={server.connectAddr}
                  className="flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-black dark:text-zinc-50">{server.name}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                      <span>
                        {server.players}/{server.maxPlayers} гравців
                      </span>
                      <span>{server.map}</span>
                      {server.region && <span>{server.region}</span>}
                      {server.gameMode && <span>{server.gameMode}</span>}
                      <span className={server.secure ? "text-green-600 dark:text-green-400" : ""}>
                        {server.secure ? "VAC secure" : "не захищено VAC"}
                      </span>
                      <span>Вайп: {formatWipe(server.wipedAt)}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {parsedSeed && (
                      <Link
                        href={`/maps?size=${parsedSeed.size}&seed=${parsedSeed.seed}`}
                        className="flex h-10 items-center justify-center rounded-full border border-black/[.08] px-4 text-sm font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-white/[.08]"
                      >
                        Мапа
                      </Link>
                    )}
                    <a
                      href={`steam://connect/${server.connectAddr}`}
                      className="flex h-10 items-center justify-center rounded-full bg-orange-600 px-4 text-sm font-medium text-white transition-colors hover:bg-orange-500"
                    >
                      Конект
                    </a>
                  </div>
                </div>
              );
            })}

          {state.kind === "ready" && (
            <p className="text-xs text-zinc-400">{state.fromCache ? "З кешу" : "Свіжі дані"}</p>
          )}
        </div>
      </div>
    </div>
  );
}
