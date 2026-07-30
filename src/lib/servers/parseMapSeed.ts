export interface ParsedMapSeed {
  seed: number;
  size: number;
}

/**
 * Best-effort extraction of a RustMaps seed+size from free-form text (a server's name/map
 * field). Steam's server list doesn't expose the seed for any server — some admins put it
 * directly in the server name for marketing, so this is a heuristic over that text, not a
 * reliable source: returns null whenever nothing confidently matches.
 */
export function parseMapSeedFromText(text: string): ParsedMapSeed | null {
  const lower = text.toLowerCase();

  const labeled =
    lower.match(/size[:\s]*(\d{3,5})[^\d]{1,15}seed[:\s]*(\d{1,10})/) ??
    swapSeedSize(lower.match(/seed[:\s]*(\d{1,10})[^\d]{1,15}size[:\s]*(\d{3,5})/));
  if (labeled) {
    return validate(Number(labeled[1]), Number(labeled[2]));
  }

  const shorthand = lower.match(/\b(\d{3,5})\s*x\s*(\d{1,10})\b/);
  if (shorthand) {
    return validate(Number(shorthand[1]), Number(shorthand[2]));
  }

  return null;
}

function swapSeedSize(match: RegExpMatchArray | null): RegExpMatchArray | null {
  if (!match) {
    return null;
  }
  // Reuse the same [size, seed] shape as the "size...seed" pattern.
  const swapped = [match[0], match[2], match[1]] as unknown as RegExpMatchArray;
  return swapped;
}

/** Rust map sizes practically range ~1000-6000; reject anything outside that as a false match. */
function validate(size: number, seed: number): ParsedMapSeed | null {
  if (size < 1000 || size > 6000) {
    return null;
  }
  return { size, seed };
}
