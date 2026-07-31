"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

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

/** Fill level drives the bar colour: near-empty and completely rammed are both
 * worth spotting at a glance when scanning a long list. */
function fillTone(players: number, max: number): string {
  if (max <= 0) return "";
  const ratio = players / max;
  if (ratio >= 0.95) return "fill-full";
  if (ratio >= 0.5) return "fill-busy";
  return "";
}

export default function ServersPage() {
  const { dict } = useTranslation();
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
      // Everything below is guarded: a failed request (or a 500 with an empty body, which
      // makes res.json() throw) must still resolve into an error state. Otherwise the row
      // stays on "loading" forever, since isLoading is derived from result.query.
      try {
        const res = await fetch(`/api/servers?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json().catch(() => ({}));
        if (thisRequestId !== requestIdRef.current) {
          return; // a newer keystroke already superseded this request
        }
        if (!res.ok) {
          setResult({
            query: trimmed,
            status: "error",
            message: data.error ?? "Сервіс пошуку зараз недоступний. Спробуй ще раз.",
          });
          return;
        }
        setResult({ query: trimmed, status: "ready", servers: data.servers ?? [] });
      } catch {
        if (thisRequestId !== requestIdRef.current) {
          return;
        }
        setResult({
          query: trimmed,
          status: "error",
          message: "Не вдалося зв'язатися з сервером. Перевір з'єднання.",
        });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, dict.servers.empty]);

  const trimmedQuery = query.trim();
  const isLoading = trimmedQuery !== "" && result?.query !== trimmedQuery;

  return (
    <div className="page">
      <div className="shell">
        {/* No in-page "home" link: the floating home pill in the layout already covers it,
            and two of them in one viewport read as a mistake. */}
        <h1 className="page-title rise">{dict.servers.title}</h1>
        <p className="page-lede rise" style={{ ["--d" as string]: "60ms" }}>
          {dict.servers.subtitle}
        </p>

        <div className="search-bar mt-7 rise" style={{ ["--d" as string]: "120ms" }}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden className="search-bar-icon">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.servers.placeholder}
            autoFocus
            className="search-bar-input"
            aria-label={dict.servers.title}
          />
          {isLoading && <span className="spinner" aria-hidden />}
        </div>

        <div className="panel panel-flush mt-5 rise" style={{ ["--d" as string]: "180ms" }}>
          {!trimmedQuery && <p className="empty-note">{dict.servers.idle}</p>}

          {trimmedQuery && isLoading && <p className="empty-note">{dict.servers.loading}</p>}

          {trimmedQuery && !isLoading && result?.status === "error" && (
            <p className="empty-note danger-text">{result.message}</p>
          )}

          {trimmedQuery && !isLoading && result?.status === "ready" && result.servers.length === 0 && (
            <p className="empty-note">{dict.servers.empty}</p>
          )}

          {trimmedQuery &&
            !isLoading &&
            result?.status === "ready" &&
            result.servers.map((server, i) => (
              <Link
                key={server.queryAddr}
                href={`/servers/${encodeURIComponent(server.queryAddr)}`}
                className="row rise"
                style={{ ["--d" as string]: `${Math.min(i, 12) * 25}ms` }}
              >
                <span className="truncate">{server.name}</span>
                <span className="shrink-0 text-right">
                  <span className="mono text-xs faint">
                    {server.players}/{server.maxPlayers}
                  </span>
                  <span className="fill">
                    <span
                      className={`fill-bar ${fillTone(server.players, server.maxPlayers)}`}
                      style={{
                        width: `${Math.min(100, server.maxPlayers > 0 ? (server.players / server.maxPlayers) * 100 : 0)}%`,
                      }}
                    />
                  </span>
                </span>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
