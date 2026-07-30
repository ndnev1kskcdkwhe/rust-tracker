"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface RustServer {
  queryAddr: string;
  name: string;
  players: number;
  maxPlayers: number;
}

type SearchResult =
  | { query: string; status: "ready"; servers: RustServer[] }
  | { query: string; status: "error"; message: string };

const DEBOUNCE_MS = 300;

export default function ServersPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const thisRequestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/servers?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (thisRequestId !== requestIdRef.current) {
        return; // a newer keystroke already superseded this request
      }
      if (!res.ok) {
        setResult({ query: trimmed, status: "error", message: data.error ?? "Не вдалося знайти сервери" });
        return;
      }
      setResult({ query: trimmed, status: "ready", servers: data.servers });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const trimmedQuery = query.trim();
  const isLoading = trimmedQuery !== "" && result?.query !== trimmedQuery;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <div className="w-full max-w-2xl">
        <Link href="/" className="text-sm text-zinc-600 dark:text-zinc-400">
          ← На головну
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-black dark:text-zinc-50">Пошук сервера</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Почни вводити назву — результати з&apos;являються одразу.
        </p>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rust Hungary, Facepunch, EU Vanilla..."
          autoFocus
          className="mt-6 w-full rounded-lg border border-black/[.08] px-4 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
        />

        <div className="mt-6 flex flex-col divide-y divide-black/[.06] rounded-2xl border border-black/[.08] bg-white dark:divide-white/[.08] dark:border-white/[.145] dark:bg-black">
          {!trimmedQuery && <p className="px-5 py-6 text-sm text-zinc-500">Введи назву сервера вище.</p>}

          {trimmedQuery && isLoading && <p className="px-5 py-6 text-sm text-zinc-500">Шукаю...</p>}

          {trimmedQuery && !isLoading && result?.status === "error" && (
            <p className="px-5 py-6 text-sm text-red-600 dark:text-red-400">{result.message}</p>
          )}

          {trimmedQuery && !isLoading && result?.status === "ready" && result.servers.length === 0 && (
            <p className="px-5 py-6 text-sm text-zinc-500">Нічого не знайдено за цим запитом.</p>
          )}

          {trimmedQuery &&
            !isLoading &&
            result?.status === "ready" &&
            result.servers.map((server) => (
              <Link
                key={server.queryAddr}
                href={`/servers/${encodeURIComponent(server.queryAddr)}`}
                className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-black/[.03] dark:hover:bg-white/[.05]"
              >
                <span className="truncate text-black dark:text-zinc-50">{server.name}</span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {server.players}/{server.maxPlayers}
                </span>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
