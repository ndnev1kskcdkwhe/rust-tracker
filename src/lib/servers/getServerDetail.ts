import { prisma } from "@/lib/prisma";
import { getServerByAddr, type RustServer } from "@/lib/external/steamServers";
import { queryServerRules } from "@/lib/external/rustQuery";
import { parseMapSeedFromText } from "./parseMapSeed";
import { estimateNextWipe, parseWipeCycleFromText, type WipeCycle } from "./parseWipeSchedule";

/** Same 90s window as search results — player count/wipe state are live data. */
const CACHE_TTL_MS = 90 * 1000;

export interface ResolvedMapSeed {
  size: number;
  seed: number;
  /** "live" — read directly off the server via A2S_RULES (real, exact). "name" — best-effort
   * regex over the server's name/map text (fallback for servers that don't answer rules queries). */
  source: "live" | "name";
}

export interface ServerDetail {
  server: RustServer;
  mapSeed: ResolvedMapSeed | null;
  wipeCycle: WipeCycle | null;
  /** ISO timestamp — a rough estimate (last wipe + detected cycle length), never a confirmed time. */
  estimatedNextWipe: string | null;
  fetchedAt: string;
}

export type GetServerDetailResult =
  | { ok: true; detail: ServerDetail; fromCache: boolean }
  | { ok: false; error: string };

/**
 * Resolves full detail for one server by its Steam query address, including a best-effort
 * attempt at the real map seed: first a live A2S_RULES probe of the server itself (accurate
 * when it works), falling back to parsing the server's name/map text when the server doesn't
 * answer (many don't — that's expected, not a bug).
 */
export async function getServerDetail(queryAddr: string): Promise<GetServerDetailResult> {
  const cacheKey = `detail:${queryAddr}`;
  const cached = await prisma.serverCache.findUnique({ where: { query: cacheKey } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return { ok: true, detail: cached.data as unknown as ServerDetail, fromCache: true };
  }

  let server: RustServer | null;
  try {
    server = await getServerByAddr(queryAddr);
  } catch {
    return { ok: false, error: "Не вдалося звернутися до Steam" };
  }
  if (!server) {
    return { ok: false, error: "Сервер не знайдено — можливо, він офлайн або змінив адресу" };
  }

  const mapSeed = await resolveMapSeed(server);
  const wipeCycle = parseWipeCycleFromText(server.name);
  const estimatedNextWipe = estimateNextWipe(server.wipedAt, wipeCycle);

  const detail: ServerDetail = {
    server,
    mapSeed,
    wipeCycle,
    estimatedNextWipe,
    fetchedAt: new Date().toISOString(),
  };

  const jsonData = JSON.parse(JSON.stringify(detail));
  await prisma.serverCache.upsert({
    where: { query: cacheKey },
    create: { query: cacheKey, data: jsonData },
    update: { data: jsonData, fetchedAt: new Date() },
  });

  return { ok: true, detail, fromCache: false };
}

async function resolveMapSeed(server: RustServer): Promise<ResolvedMapSeed | null> {
  const [ip, portStr] = server.queryAddr.split(":");
  const port = Number(portStr);
  if (ip && Number.isFinite(port)) {
    const rules = await queryServerRules(ip, port);
    if (rules?.worldSeed != null && rules?.worldSize != null) {
      return { size: rules.worldSize, seed: rules.worldSeed, source: "live" };
    }
  }

  const parsed = parseMapSeedFromText(`${server.name} ${server.map}`);
  return parsed ? { ...parsed, source: "name" } : null;
}
