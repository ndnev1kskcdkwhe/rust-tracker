/**
 * Steam Web API client. Requires STEAM_API_KEY in the environment.
 * Endpoints verified live against the real API on 2026-07-30.
 */

const RUST_APP_ID = 252490;

function getApiKey(): string {
  const key = process.env.STEAM_API_KEY;
  if (!key) {
    throw new Error("STEAM_API_KEY is not set in the environment");
  }
  return key;
}

export interface SteamPlayerSummary {
  steamId: string;
  name: string;
  avatarUrl: string;
  profileUrl: string;
  /** 0 = offline, 1 = online, etc. — see Steam's EPersonaState. */
  personaState: number;
}

export async function getPlayerSummary(steamId64: string): Promise<SteamPlayerSummary | null> {
  const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/");
  url.searchParams.set("key", getApiKey());
  url.searchParams.set("steamids", steamId64);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Steam GetPlayerSummaries failed: ${res.status}`);
  }
  const data = await res.json();
  const player = data?.response?.players?.[0];
  if (!player) {
    return null;
  }

  return {
    steamId: player.steamid,
    name: player.personaname,
    avatarUrl: player.avatarfull,
    profileUrl: player.profileurl,
    personaState: player.personastate,
  };
}

export interface SteamPlayerBans {
  vacBanned: boolean;
  numberOfVacBans: number;
  numberOfGameBans: number;
  /** Days since the player's most recent ban (VAC or game), if any. */
  daysSinceLastBan: number;
  communityBanned: boolean;
  /** "none" | "probation" | "banned" */
  economyBan: string;
}

export async function getPlayerBans(steamId64: string): Promise<SteamPlayerBans | null> {
  const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/");
  url.searchParams.set("key", getApiKey());
  url.searchParams.set("steamids", steamId64);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Steam GetPlayerBans failed: ${res.status}`);
  }
  const data = await res.json();
  const player = data?.players?.[0];
  if (!player) {
    return null;
  }

  return {
    vacBanned: player.VACBanned,
    numberOfVacBans: player.NumberOfVACBans,
    numberOfGameBans: player.NumberOfGameBans,
    daysSinceLastBan: player.DaysSinceLastBan,
    communityBanned: player.CommunityBanned,
    economyBan: player.EconomyBan,
  };
}

/**
 * Hours played in Rust, or null if unavailable — the Steam API returns an empty response
 * (not an error) when the target account has "game details" set to private, which is the
 * default privacy setting, so this is an expected outcome, not a failure.
 */
export async function getRustHoursPlayed(steamId64: string): Promise<number | null> {
  const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/");
  url.searchParams.set("key", getApiKey());
  url.searchParams.set("steamid", steamId64);
  url.searchParams.set("include_appinfo", "true");
  url.searchParams.set("appids_filter[0]", String(RUST_APP_ID));
  url.searchParams.set("format", "json");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Steam GetOwnedGames failed: ${res.status}`);
  }
  const data = await res.json();
  const games = data?.response?.games;
  if (!Array.isArray(games) || games.length === 0) {
    return null;
  }
  const rust = games.find((g: { appid: number }) => g.appid === RUST_APP_ID);
  if (!rust) {
    return null;
  }
  return Math.round((rust.playtime_forever / 60) * 10) / 10;
}

/** Resolves a vanity URL name (e.g. "GabeLoganNewell") to a SteamID64, or null if not found. */
export async function resolveVanityUrl(vanity: string): Promise<string | null> {
  const url = new URL("https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/");
  url.searchParams.set("key", getApiKey());
  url.searchParams.set("vanityurl", vanity);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Steam ResolveVanityURL failed: ${res.status}`);
  }
  const data = await res.json();
  if (data?.response?.success !== 1) {
    return null;
  }
  return data.response.steamid;
}
