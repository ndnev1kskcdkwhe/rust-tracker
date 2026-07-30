import { describe, expect, it } from "vitest";
import { findBestArrangement } from "./arrangement";
import { parseGenome } from "./genetics";

describe("findBestArrangement", () => {
  it("returns null for an empty pool", () => {
    expect(findBestArrangement([], parseGenome("GGGYYY"))).toBeNull();
  });

  it("picks the trivial 0-neighbor solution when the target is already in the pool", () => {
    const pool = [parseGenome("GGGYYY"), parseGenome("WWWWWW")];
    const result = findBestArrangement(pool, parseGenome("GGGYYY"));
    expect(result).not.toBeNull();
    expect(result!.chance).toBe(1);
    expect(result!.neighborIndices).toEqual([]);
    expect(result!.centerIndex).toBe(0);
    expect(result!.expectedAttempts).toBe(1);
  });

  it("finds a deterministic solution that overrides a mismatched center via 2+ same-gene neighbors", () => {
    // Center X (red, weight 1.0) is beaten by 2 G neighbors (green, weight 0.6 each = 1.2 > 1.0),
    // so an all-G target is reachable with certainty even though no pool genome is X-free G-only
    // except the (deliberately distinct) center itself.
    const pool = [parseGenome("XXXXXX"), parseGenome("GGGGGG")];
    const result = findBestArrangement(pool, parseGenome("GGGGGG"));
    expect(result).not.toBeNull();
    expect(result!.chance).toBe(1);
  });

  it("reports a genuinely impossible target as chance 0, not a fabricated solution", () => {
    const pool = [parseGenome("XXXXXX")];
    const result = findBestArrangement(pool, parseGenome("GGGGGG"));
    expect(result).not.toBeNull();
    expect(result!.chance).toBe(0);
    expect(result!.expectedAttempts).toBe(Infinity);
  });

  it("computes the correct tied probability for a mixed target from two opposite homogeneous parents", () => {
    // Center G vs a single H neighbor (both green, equal weight) ties every slot 50/50 —
    // hitting any specific 6-letter G/H pattern (including a mixed one) is (0.5)^6.
    const pool = [parseGenome("GGGGGG"), parseGenome("HHHHHH")];
    const result = findBestArrangement(pool, parseGenome("GGGGGH"));
    expect(result).not.toBeNull();
    expect(result!.chance).toBeCloseTo(0.5 ** 6, 10);
  });

  it("completes quickly with a pool at the default candidate cap", () => {
    const pool = Array.from({ length: 12 }, (_, i) =>
      parseGenome(i % 2 === 0 ? "GGGGGG" : "HHHHHH")
    );
    const start = Date.now();
    const result = findBestArrangement(pool, parseGenome("GGGHHH"));
    const elapsed = Date.now() - start;
    expect(result).not.toBeNull();
    expect(elapsed).toBeLessThan(5000);
  });
});
