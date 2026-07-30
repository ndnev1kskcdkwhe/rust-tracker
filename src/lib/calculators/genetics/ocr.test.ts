import { describe, expect, it } from "vitest";
import { parseCropFromOcrText, parseGenesFromOcrText } from "./ocr";

describe("parseGenesFromOcrText", () => {
  it("parses the spaced-dot-separated format from the real tooltip", () => {
    const text = "A clipping of a hemp plant.\nGenetics H · Y · Y · Y · Y · G\nResiliences:";
    expect(parseGenesFromOcrText(text)).toBe("HYYYYG");
  });

  it("is tolerant of missing separators and mixed case", () => {
    const text = "Genetics hyyyyg\nResiliences:";
    expect(parseGenesFromOcrText(text)).toBe("HYYYYG");
  });

  it("returns null when the genetics line contains a stray/misread character", () => {
    const text = "Genetics H · Y · Y · Y · Y · Q\nResiliences:";
    expect(parseGenesFromOcrText(text)).toBeNull();
  });

  it("returns null when there is no genetics line at all", () => {
    expect(parseGenesFromOcrText("A clipping of a hemp plant.")).toBeNull();
  });

  it("returns null when fewer than 6 gene letters are found", () => {
    expect(parseGenesFromOcrText("Genetics H · Y · Y")).toBeNull();
  });

  it("ignores content on later lines (e.g. Resiliences bleeding into the crop)", () => {
    const text = "Genetics H · Y · Y · Y · Y · G\nResiliences: Water 15%";
    expect(parseGenesFromOcrText(text)).toBe("HYYYYG");
  });

  it("corrects '6' misread as 'G' (real Tesseract output seen from the game)", () => {
    const text = "Genetics W W H 6 H W Resiliences: Water 15%";
    expect(parseGenesFromOcrText(text)).toBe("WWHGHW");
  });

  it("handles a wide capture with no real newlines between UI sections (regression)", () => {
    // Real OCR output when the calibration rectangle covers the whole tooltip panel,
    // not just the Genetics row — Tesseract flattens it into one line.
    const text =
      'as - Ac ipping of a hemp plant. *- INFORMATION ACTIONS Harvests 1 Genetics W W H 6 H W ' +
      'Resiliences: Water 15% Light 10% Ground M10% Temperature 110 % + orp SPLITTING ' +
      '"SET AMOUNT & DRAG ICON " x1';
    expect(parseGenesFromOcrText(text)).toBe("WWHGHW");
  });

  it("falls back to treating the whole input as the gene sequence when no label is present", () => {
    expect(parseGenesFromOcrText("hyyyyg")).toBe("HYYYYG");
  });

  it("does not fall back to whole-input mode if there's extra text but no label", () => {
    expect(parseGenesFromOcrText("hyyyyg extra")).toBeNull();
  });
});

describe("parseCropFromOcrText", () => {
  it("detects hemp", () => {
    expect(parseCropFromOcrText("A clipping of a hemp plant.")).toBe("HEMP");
  });

  it("detects a berry color before the generic 'berry' keyword", () => {
    expect(parseCropFromOcrText("A clipping of a red berry plant.")).toBe("BERRY_RED");
  });

  it("returns null when nothing matches", () => {
    expect(parseCropFromOcrText("Some unrelated tooltip text")).toBeNull();
  });
});
