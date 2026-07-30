import { prisma } from "@/lib/prisma";
import { resolveVanityUrl } from "@/lib/external/steam";
import { parseSteamIdInput } from "./steamId";
import { buildPlayerProfile } from "./buildPlayerProfile";
import type { PlayerProfile } from "./types";

/** 30 minutes — within the brief's "15-60 min" cache window. */
const CACHE_TTL_MS = 30 * 60 * 1000;

export type GetPlayerProfileResult =
  | { ok: true; profile: PlayerProfile; fromCache: boolean }
  | { ok: false; error: string };

/**
 * Resolves search input (SteamID64, profile URL, vanity URL, or bare vanity name) to a
 * player profile, serving from the database cache when fresh instead of hitting Steam's API
 * on every search for the same player.
 */
export async function getPlayerProfile(rawInput: string): Promise<GetPlayerProfileResult> {
  const parsed = parseSteamIdInput(rawInput);
  if (!parsed) {
    return { ok: false, error: "Введи SteamID, посилання на профіль або vanity-ім'я" };
  }

  let steamId64: string;
  if (parsed.type === "steamId64") {
    steamId64 = parsed.value;
  } else {
    const resolved = await resolveVanityUrl(parsed.value);
    if (!resolved) {
      return { ok: false, error: `Не вдалося знайти гравця "${parsed.value}"` };
    }
    steamId64 = resolved;
  }

  const cached = await prisma.playerCache.findUnique({ where: { steamId: steamId64 } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return { ok: true, profile: cached.data as unknown as PlayerProfile, fromCache: true };
  }

  const profile = await buildPlayerProfile(steamId64);
  if (!profile) {
    return { ok: false, error: "Гравця не знайдено — перевір SteamID чи посилання" };
  }

  const jsonData = JSON.parse(JSON.stringify(profile));
  await prisma.playerCache.upsert({
    where: { steamId: steamId64 },
    create: { steamId: steamId64, data: jsonData },
    update: { data: jsonData, fetchedAt: new Date() },
  });

  return { ok: true, profile, fromCache: false };
}
