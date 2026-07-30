import { describe, expect, it } from "vitest";
import {
  chanceOfExactGenome,
  classifyGenome,
  greenGeneCount,
  isValidGenome,
  parseGenome,
  predictCross,
} from "./genetics";

describe("parseGenome / isValidGenome", () => {
  it("accepts exactly 6 valid gene letters, case-insensitive", () => {
    expect(isValidGenome("GGGYYY")).toBe(true);
    expect(isValidGenome("gggyyy")).toBe(true);
    expect(parseGenome("gggyyy")).toEqual(["G", "G", "G", "Y", "Y", "Y"]);
  });

  it("rejects wrong length or invalid letters", () => {
    expect(isValidGenome("GGGYY")).toBe(false);
    expect(isValidGenome("GGGYYYY")).toBe(false);
    expect(isValidGenome("GGGYYZ")).toBe(false);
    expect(() => parseGenome("BADGENOME")).toThrow();
  });
});

describe("greenGeneCount", () => {
  it("counts G/Y/H as green and W/X as red", () => {
    expect(greenGeneCount(parseGenome("GGGYYY"))).toBe(6);
    expect(greenGeneCount(parseGenome("GGWWXX"))).toBe(2);
    expect(greenGeneCount(parseGenome("GHYWXW"))).toBe(3);
  });
});

describe("classifyGenome", () => {
  it("marks an exact target match as 'target'", () => {
    const target = parseGenome("GGGYYY");
    expect(classifyGenome(parseGenome("GGGYYY"), target)).toBe("target");
  });

  it("keeps genomes with enough green genes even if not the exact target", () => {
    const target = parseGenome("GGGYYY");
    expect(classifyGenome(parseGenome("GGGGYH"), target)).toBe("keep");
  });

  it("discards genomes with too many red genes", () => {
    const target = parseGenome("GGGYYY");
    expect(classifyGenome(parseGenome("GGWWXX"), target)).toBe("discard");
  });
});

describe("predictCross", () => {
  it("keeps the center's gene when no neighbor outweighs it", () => {
    // Center is G (green, 0.6) with a single W neighbor (red, 1.0) at the other 5 slots
    // matching so only slot 0 differs: neighbor G (0.6) cannot outweigh center's G... use
    // a clear case: center Y (green 0.6), neighbor W (red 1.0) -> neighbor wins (1.0>0.6).
    // For "center keeps its gene", use center W (red 1.0) vs neighbor G (green 0.6): 0.6<1.0.
    const center = parseGenome("WWWWWW");
    const neighbor = parseGenome("GGGGGG");
    const slots = predictCross(center, [neighbor]);
    for (const slot of slots) {
      expect(slot).toEqual([{ gene: "W", probability: 1 }]);
    }
  });

  it("lets a stronger neighbor gene win outright", () => {
    const center = parseGenome("GGGGGG");
    const neighbor = parseGenome("WWWWWW");
    const slots = predictCross(center, [neighbor]);
    for (const slot of slots) {
      expect(slot).toEqual([{ gene: "W", probability: 1 }]);
    }
  });

  it("reproduces rustbreeder's worked tie example: 2xG + 2xH neighbors -> 50/50", () => {
    // Center gene X (red, weight 1.0) is deliberately weaker than the tied 1.2-weight
    // neighbor groups, so it drops out and G/H split the slot evenly (rustbreeder.com/guide).
    const center: ("G" | "Y" | "H" | "W" | "X")[] = ["X", "X", "X", "X", "X", "X"];
    const neighbors = [
      parseGenome("GGGGGG"),
      parseGenome("GGGGGG"),
      parseGenome("HHHHHH"),
      parseGenome("HHHHHH"),
    ];
    const slots = predictCross(center, neighbors);
    for (const slot of slots) {
      expect(slot).toHaveLength(2);
      expect(slot).toEqual(
        expect.arrayContaining([
          { gene: "G", probability: 0.5 },
          { gene: "H", probability: 0.5 },
        ])
      );
    }
  });

  it("collapses a tie to 100% when the center's gene matches the strongest neighbor gene", () => {
    const center = parseGenome("GGGGGG");
    const neighbors = [parseGenome("HHHHHH")];
    // center G (0.6) vs neighbor H (0.6) is an equal-weight tie, but genes differ -> 50/50
    const tieSlots = predictCross(center, neighbors);
    for (const slot of tieSlots) {
      expect(slot).toHaveLength(2);
    }

    // Now with a neighbor that also has G: center G, neighbor G -> same gene, no real tie.
    const sameGeneSlots = predictCross(center, [parseGenome("GGGGGG")]);
    for (const slot of sameGeneSlots) {
      expect(slot).toEqual([{ gene: "G", probability: 1 }]);
    }
  });
});

describe("chanceOfExactGenome", () => {
  it("multiplies per-slot probabilities for the target genome", () => {
    const center = parseGenome("XXXXXX");
    const neighbors = [parseGenome("GGGGGG"), parseGenome("GGGGGG"), parseGenome("HHHHHH"), parseGenome("HHHHHH")];
    const slots = predictCross(center, neighbors);
    const chanceAllG = chanceOfExactGenome(slots, parseGenome("GGGGGG"));
    expect(chanceAllG).toBeCloseTo(0.5 ** 6, 10);
  });

  it("returns 1 for a fully deterministic cross matching the target", () => {
    const center = parseGenome("GGGGGG");
    const slots = predictCross(center, [parseGenome("WWWWWW")]);
    expect(chanceOfExactGenome(slots, parseGenome("WWWWWW"))).toBe(1);
  });
});
