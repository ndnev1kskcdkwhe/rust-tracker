import { getPlayerBans, getPlayerSummary, getRustHoursPlayed } from "@/lib/external/steam";
import type { PlayerProfile } from "./types";

const BATTLEMETRICS_UNAVAILABLE_REASON =
  "BattleMetrics API наразі вимагає платної підписки — історія імен, сесії та сервери недоступні.";

/** Builds a fresh PlayerProfile from live external APIs. Returns null if the SteamID doesn't exist. */
export async function buildPlayerProfile(steamId64: string): Promise<PlayerProfile | null> {
  const [summary, bans, hoursInRust] = await Promise.all([
    getPlayerSummary(steamId64),
    getPlayerBans(steamId64),
    getRustHoursPlayed(steamId64),
  ]);

  if (!summary) {
    return null;
  }

  return {
    steamId: summary.steamId,
    name: summary.name,
    avatarUrl: summary.avatarUrl,
    profileUrl: summary.profileUrl,
    isOnline: summary.personaState !== 0,
    realName: summary.realName,
    accountCreatedAt: summary.accountCreatedAt,
    countryCode: summary.countryCode,
    currentGame: summary.currentGame,
    hoursInRust,
    vacBanned: bans?.vacBanned ?? false,
    gameBans: bans?.numberOfGameBans ?? 0,
    communityBanned: bans?.communityBanned ?? false,
    economyBan: bans?.economyBan ?? "none",
    daysSinceLastBan: bans?.daysSinceLastBan ?? 0,
    battlemetrics: { available: false, reason: BATTLEMETRICS_UNAVAILABLE_REASON },
    fetchedAt: new Date().toISOString(),
  };
}
