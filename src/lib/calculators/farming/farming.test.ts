import { describe, expect, it } from "vitest";
import { averageYieldPerHit, hitsNeeded, hitsPerSecond, timeNeededSeconds } from "./farming";

describe("averageYieldPerHit", () => {
  it("derives a positive yield for every documented tool/resource pair", () => {
    expect(averageYieldPerHit("wood", "stoneHatchet")).toBeCloseTo(20.95, 1);
    expect(averageYieldPerHit("wood", "chainsaw")).toBe(30);
  });

  it("throws for an unknown tool on a given resource", () => {
    expect(() => averageYieldPerHit("wood", "jackhammer")).toThrow();
  });
});

describe("hitsNeeded", () => {
  it("scales inversely with the gather-rate multiplier", () => {
    const base = hitsNeeded("stone", "pickaxe", 1000, 1);
    const doubled = hitsNeeded("stone", "pickaxe", 1000, 2);
    expect(doubled).toBeLessThan(base);
  });

  it("rounds up to a whole number of hits", () => {
    const hits = hitsNeeded("wood", "chainsaw", 100, 1);
    expect(Number.isInteger(hits)).toBe(true);
    expect(hits).toBeGreaterThan(0);
  });
});

describe("timeNeededSeconds", () => {
  it("equals hitsNeeded divided by hits-per-second", () => {
    const hits = hitsNeeded("sulfurOre", "jackhammer", 500, 1);
    const time = timeNeededSeconds("sulfurOre", "jackhammer", 500, 1);
    expect(time).toBeCloseTo(hits / hitsPerSecond("sulfurOre", "jackhammer"), 5);
  });
});
