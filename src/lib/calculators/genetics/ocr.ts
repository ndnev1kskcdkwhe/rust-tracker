import type { Crop } from "./data";

/**
 * Parses OCR output from Rust's clone-inspection tooltip (the panel shown when hovering a
 * plant clipping in inventory), e.g.:
 *   "A clipping of a hemp plant."
 *   "Genetics H · Y · Y · Y · Y · G"
 *
 * OCR text is noisy: separators vary, Tesseract doesn't reliably preserve line breaks when
 * a wider region is captured (so "look at the line containing Genetics" doesn't work — the
 * whole tooltip can come back as one flat string), and some characters get misread (most
 * commonly 'G' as the digit '6'). To handle this: find the "genetics" label, take a fixed
 * character window after it (not "until the next newline"), correct known misreads, then
 * require the next 6 letters found there to all be valid gene letters. If the capture is
 * cropped so tightly that the "Genetics" label itself isn't in frame, fall back to treating
 * the entire input as the gene sequence (must be exactly 6 valid letters, nothing else).
 */

const VALID_GENE_LETTERS = "GYHWX";
const LABEL = "genetics";
const WINDOW_AFTER_LABEL = 40;

/** Fixes OCR misreads seen in practice before validating gene letters (e.g. 'G' -> '6'). */
function correctCommonMisreads(s: string): string {
  return s.replace(/6/g, "G");
}

function isAllValidGenes(s: string): boolean {
  return s.length > 0 && [...s].every((ch) => VALID_GENE_LETTERS.includes(ch));
}

/** Extracts the 6-letter gene sequence from raw OCR text, or null if the read isn't clean. */
export function parseGenesFromOcrText(text: string): string | null {
  const lower = text.toLowerCase();
  const geneticsIndex = lower.indexOf(LABEL);

  if (geneticsIndex !== -1) {
    const windowStart = geneticsIndex + LABEL.length;
    const candidate = text.slice(windowStart, windowStart + WINDOW_AFTER_LABEL);
    const letters = correctCommonMisreads(candidate).replace(/[^A-Za-z]/g, "").toUpperCase();
    if (letters.length < 6) {
      return null;
    }
    const first6 = letters.slice(0, 6);
    return isAllValidGenes(first6) ? first6 : null;
  }

  // No "Genetics" label found — assume the capture was cropped to just the letters.
  const letters = correctCommonMisreads(text).replace(/[^A-Za-z]/g, "").toUpperCase();
  return letters.length === 6 && isAllValidGenes(letters) ? letters : null;
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
