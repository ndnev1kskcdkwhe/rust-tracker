export type SteamIdInput = { type: "steamId64"; value: string } | { type: "vanity"; value: string };

const STEAM_ID64_REGEX = /^\d{17}$/;

/**
 * Parses user search input into either an already-resolved SteamID64 or a vanity name that
 * still needs resolving via the Steam Web API (ResolveVanityURL). Accepts:
 * - a raw SteamID64 ("76561197960287930")
 * - a profile URL ("https://steamcommunity.com/profiles/76561197960287930")
 * - a vanity URL ("https://steamcommunity.com/id/somename")
 * - a bare vanity name ("somename")
 */
export function parseSteamIdInput(input: string): SteamIdInput | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (STEAM_ID64_REGEX.test(trimmed)) {
    return { type: "steamId64", value: trimmed };
  }

  const profileMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (profileMatch) {
    return { type: "steamId64", value: profileMatch[1] };
  }

  const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/\s?#]+)/i);
  if (vanityMatch) {
    return { type: "vanity", value: vanityMatch[1] };
  }

  // No recognizable SteamID pattern or URL shape — treat the whole input as a vanity name.
  return { type: "vanity", value: trimmed };
}
