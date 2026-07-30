/**
 * Steam master server list client (IGameServersService/GetServerList). Requires STEAM_API_KEY.
 * Verified live on 2026-07-31. This covers server search (name, players, map, connect info)
 * without needing BattleMetrics at all.
 *
 * Two field-shape gotchas confirmed by live testing:
 * - `addr` is "ip:queryport" — NOT the port players connect with. The real connect port is
 *   the separate `gameport` field (consistently different from the port in `addr`, e.g.
 *   addr "5.58.1.140:28016" with gameport 28015). Always build connect links from ip + gameport.
 * - `gametype` is a comma-separated tag string. Every server observed carries an identical
 *   `cs158240` token regardless of who's hosting — this is some fixed client/build marker, not
 *   a per-server map seed, so it cannot be used to derive a RustMaps seed. The only genuinely
 *   per-server, useful tag found is `born<unix-seconds>` (map generation time = last wipe).
 */

const RUST_APP_ID = 252490;

function getApiKey(): string {
  const key = process.env.STEAM_API_KEY;
  if (!key) {
    throw new Error("STEAM_API_KEY is not set in the environment");
  }
  return key;
}

const KNOWN_REGION_CODES = new Set(["EU", "US", "NA", "SA", "AS", "OC", "AF", "RU"]);

function parseGametype(gametype: string): { wipedAt: string | null; gameMode: string | null; region: string | null } {
  const tokens = gametype.split(",");
  let wipedAt: string | null = null;
  let gameMode: string | null = null;
  let region: string | null = null;

  for (const token of tokens) {
    const bornMatch = token.match(/^born(\d+)$/);
    if (bornMatch) {
      wipedAt = new Date(Number(bornMatch[1]) * 1000).toISOString();
      continue;
    }
    const gmMatch = token.match(/^gm(\w+)$/);
    if (gmMatch && !gameMode) {
      gameMode = gmMatch[1];
      continue;
    }
    if (!region && KNOWN_REGION_CODES.has(token)) {
      region = token;
    }
  }

  return { wipedAt, gameMode, region };
}

export interface RustServer {
  /** "ip:port" — the address to actually connect to (steam://connect/{connectAddr}). */
  connectAddr: string;
  /** "ip:port" — Steam's master-list query address (the raw `addr` field). Used to re-look up
   * this exact server (`getServerByAddr`) and as the target for a raw A2S_RULES query. */
  queryAddr: string;
  name: string;
  players: number;
  maxPlayers: number;
  /** Almost always "Procedural Map" for generated maps — doesn't expose the seed. */
  map: string;
  /** VAC-secured. */
  secure: boolean;
  /** Raw value after "gm" in the gametype tags, e.g. "rust" or "vanilla" — null if absent. */
  gameMode: string | null;
  /** Best-effort region code parsed from gametype tags (e.g. "EU") — null if not present. */
  region: string | null;
  /** ISO timestamp of the server's last wipe, parsed from the `born<unix>` gametype tag. */
  wipedAt: string | null;
  version: string;
}

interface RawSteamServer {
  addr: string;
  gameport: number;
  name: string;
  players: number;
  max_players: number;
  map: string;
  secure: boolean;
  version: string;
  gametype: string;
}

function normalizeServer(raw: RawSteamServer): RustServer {
  const ip = raw.addr.split(":")[0];
  const { wipedAt, gameMode, region } = parseGametype(raw.gametype ?? "");

  return {
    connectAddr: `${ip}:${raw.gameport}`,
    queryAddr: raw.addr,
    name: raw.name,
    players: raw.players,
    maxPlayers: raw.max_players,
    map: raw.map,
    secure: raw.secure,
    gameMode,
    region,
    wipedAt,
    version: raw.version,
  };
}

/** Escapes characters that would break the master-server filter's backslash/`*` syntax. */
function sanitizeNameQuery(query: string): string {
  return query.replace(/[\\*]/g, "");
}

export async function searchRustServers(nameQuery: string, limit = 20): Promise<RustServer[]> {
  const safeQuery = sanitizeNameQuery(nameQuery).trim();
  if (!safeQuery) {
    throw new Error("Порожній пошуковий запит");
  }

  const url = new URL("https://api.steampowered.com/IGameServersService/GetServerList/v1/");
  url.searchParams.set("key", getApiKey());
  url.searchParams.set("filter", `\\appid\\${RUST_APP_ID}\\name_match\\*${safeQuery}*`);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Steam GetServerList failed: ${res.status}`);
  }
  const data = await res.json();
  const servers: RawSteamServer[] = data?.response?.servers ?? [];
  return servers.map(normalizeServer);
}

/** Looks up one specific server by its query address (Steam's `\addr\` filter, verified live). */
export async function getServerByAddr(queryAddr: string): Promise<RustServer | null> {
  const url = new URL("https://api.steampowered.com/IGameServersService/GetServerList/v1/");
  url.searchParams.set("key", getApiKey());
  url.searchParams.set("filter", `\\appid\\${RUST_APP_ID}\\addr\\${queryAddr}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Steam GetServerList failed: ${res.status}`);
  }
  const data = await res.json();
  const servers: RawSteamServer[] = data?.response?.servers ?? [];
  return servers.length > 0 ? normalizeServer(servers[0]) : null;
}
