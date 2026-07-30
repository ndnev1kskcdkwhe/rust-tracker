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
    expect(result!.expectedMatches).toBe(6);
    expect(result!.likelyGenome).toEqual(parseGenome("GGGYYY"));
  });

  it("finds a deterministic solution that overrides a mismatched center via 2+ same-gene neighbors", () => {
    // Center X (red, weight 1.0) is beaten by 2 G neighbors (green, weight 0.6 each = 1.2 > 1.0),
    // so an all-G target is reachable with certainty even though no pool genome is X-free G-only
    // except the (deliberately distinct) center itself.
    const pool = [parseGenome("XXXXXX"), parseGenome("GGGGGG")];
    const result = findBestArrangement(pool, parseGenome("GGGGGG"));
    expect(result).not.toBeNull();
    expect(result!.chance).toBe(1);
    expect(result!.expectedMatches).toBe(6);
  });

  it("reports a genuinely impossible target as chance 0, not a fabricated solution", () => {
    const pool = [parseGenome("XXXXXX")];
    const result = findBestArrangement(pool, parseGenome("GGGGGG"));
    expect(result).not.toBeNull();
    expect(result!.chance).toBe(0);
    expect(result!.expectedAttempts).toBe(Infinity);
    expect(result!.expectedMatches).toBe(0);
    expect(result!.likelyGenome).toEqual(parseGenome("XXXXXX"));
  });

  it("gives useful partial credit when an exact match is impossible but most slots aren't", () => {
    // Only one saved clone, already 5/6 of the way to target — exact match is unreachable
    // (nothing can ever turn that lone X into a G), but expectedMatches should still reflect
    // "5 of 6 slots are already right" instead of collapsing to the same 0 as a totally
    // unrelated pool would give.
    const pool = [parseGenome("XGGGGG")];
    const result = findBestArrangement(pool, parseGenome("GGGGGG"));
    expect(result).not.toBeNull();
    expect(result!.chance).toBe(0);
    expect(result!.expectedMatches).toBe(5);
    expect(result!.likelyGenome).toEqual(parseGenome("XGGGGG"));
  });

  it("prefers a guaranteed 5/6 match over a risky 50/50 gamble at exact-match chance", () => {
    // A 1-neighbor cross (center G + 1 H neighbor) ties every slot 50/50, giving only
    // 3 expected matches for a GGGGGH target — worse than just using the pure-G center with
    // no neighbors at all, which guarantees the first 5 slots and never risks losing them,
    // even though it can never hit the final H slot (expectedMatches 5 beats 3).
    const pool = [parseGenome("GGGGGG"), parseGenome("HHHHHH")];
    const result = findBestArrangement(pool, parseGenome("GGGGGH"));
    expect(result).not.toBeNull();
    expect(result!.expectedMatches).toBe(5);
    expect(result!.chance).toBe(0);
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
