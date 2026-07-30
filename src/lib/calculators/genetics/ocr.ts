import type { Crop } from "./data";

/**
 * Parses OCR output from Rust's clone-inspection tooltip (the panel shown when hovering a
 * plant clipping in inventory), e.g.:
 *   "A clipping of a hemp plant."
 *   "Genetics H · Y · Y · Y · Y · G"
 *
 * OCR text is noisy (inconsistent spacing/separators, occasional case errors), so gene
 * extraction only looks at the line containing "Genetics" and requires every remaining
 * letter on that line to be a valid gene letter — if anything unexpected shows up, it's
 * treated as a failed read rather than guessed at.
 */

const VALID_GENE_LETTERS = "GYHWX";

/** Extracts the 6-letter gene sequence from raw OCR text, or null if the read isn't clean. */
export function parseGenesFromOcrText(text: string): string | null {
  const lower = text.toLowerCase();
  const geneticsIndex = lower.indexOf("genetics");
  if (geneticsIndex === -1) {
    return null;
  }

  const restOfText = text.slice(geneticsIndex);
  const firstLine = restOfText.split(/\r?\n/)[0];
  const afterLabel = firstLine.replace(/genetics/i, "");
  const letters = afterLabel.replace(/[^A-Za-z]/g, "").toUpperCase();

  if (letters.length < 6) {
    return null;
  }
  const first6 = letters.slice(0, 6);
  if (![...first6].every((ch) => VALID_GENE_LETTERS.includes(ch))) {
    return null;
  }
  return first6;
}

const CROP_KEYWORDS: [string, Crop][] = [
  ["red berry", "BERRY_RED"],
  ["blue berry", "BERRY_BLUE"],
  ["yellow berry", "BERRY_YELLOW"],
  ["white berry", "BERRY_WHITE"],
  ["hemp", "HEMP"],
  ["potato", "POTATO"],
  ["pumpkin", "PUMPKIN"],
  ["corn", "CORN"],
];

/** Best-effort crop detection from the "A clipping of a X plant" line, if present in the capture. */
export function parseCropFromOcrText(text: string): Crop | null {
  const lower = text.toLowerCase();
  for (const [keyword, crop] of CROP_KEYWORDS) {
    if (lower.includes(keyword)) {
      return crop;
    }
  }
  return null;
}
