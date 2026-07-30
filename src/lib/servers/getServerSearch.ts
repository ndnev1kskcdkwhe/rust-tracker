import { prisma } from "@/lib/prisma";
import { searchRustServers, type RustServer } from "@/lib/external/steamServers";

/** 90 seconds — much shorter than PlayerCache's 30 min, since player counts and wipe
 * state change far more often than a Steam profile does. */
const CACHE_TTL_MS = 90 * 1000;

export type GetServerSearchResult =
  | { ok: true; servers: RustServer[]; fromCache: boolean }
  | { ok: false; error: string };

/**
 * Searches Rust servers by name, serving from the database cache when fresh instead of
 * hitting Steam's master server list on every search for the same query.
 */
export async function getServerSearch(rawQuery: string): Promise<GetServerSearchResult> {
  const key = rawQuery.trim().toLowerCase();
  if (!key) {
    return { ok: false, error: "Введи назву сервера для пошуку" };
  }

  const cached = await prisma.serverCache.findUnique({ where: { query: key } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return { ok: true, servers: cached.data as unknown as RustServer[], fromCache: true };
  }

  let servers: RustServer[];
  try {
    servers = await searchRustServers(key);
  } catch {
    return { ok: false, error: "Не вдалося отримати список серверів від Steam" };
  }

  const jsonData = JSON.parse(JSON.stringify(servers));
  await prisma.serverCache.upsert({
    where: { query: key },
    create: { query: key, data: jsonData },
    update: { data: jsonData, fetchedAt: new Date() },
  });

  return { ok: true, servers, fromCache: false };
}
