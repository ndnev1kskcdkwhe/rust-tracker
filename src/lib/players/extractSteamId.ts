/** Finds a 17-digit SteamID64 in OCR text (e.g. from Rust's F7 "Report Player" screenshot). */
const STEAM_ID64_PATTERN = /\b\d{17}\b/;

export function extractSteamId64FromText(text: string): string | null {
  const match = text.match(STEAM_ID64_PATTERN);
  return match ? match[0] : null;
}
