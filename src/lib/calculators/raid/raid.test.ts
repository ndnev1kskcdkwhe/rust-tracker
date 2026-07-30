import { describe, expect, it } from "vitest";
import { cheapestCombination, getTargetHp, hitsNeeded } from "./raid";
import type { RaidTarget } from "./data";

describe("hitsNeeded", () => {
  it("matches sourced hit counts for generic pieces", () => {
    const woodWall: RaidTarget = { kind: "generic", tier: "wood", side: "hard" };
    expect(hitsNeeded(woodWall, "rocket")).toBe(2);
    expect(hitsNeeded(woodWall, "satchel")).toBe(3);
    expect(hitsNeeded(woodWall, "c4")).toBe(1);
    expect(hitsNeeded(woodWall, "beancan")).toBe(13);

    const stoneWall: RaidTarget = { kind: "generic", tier: "stone", side: "hard" };
    expect(hitsNeeded(stoneWall, "rocket")).toBe(4);
    expect(hitsNeeded(stoneWall, "satchel")).toBe(10);

    const armoredWall: RaidTarget = { kind: "generic", tier: "armored", side: "hard" };
    expect(hitsNeeded(armoredWall, "rocket")).toBe(15);
    expect(hitsNeeded(armoredWall, "c4")).toBe(8);
  });

  it("treats twig as a one-hit-kill for full explosives, but not always for ammo", () => {
    const twigHard: RaidTarget = { kind: "generic", tier: "twig", side: "hard" };
    const twigSoft: RaidTarget = { kind: "generic", tier: "twig", side: "soft" };
    expect(hitsNeeded(twigHard, "rocket")).toBe(1);
    expect(hitsNeeded(twigHard, "satchel")).toBe(1);
    expect(hitsNeeded(twigHard, "c4")).toBe(1);
    expect(hitsNeeded(twigHard, "beancan")).toBe(1);
    expect(hitsNeeded(twigHard, "explosiveAmmo")).toBe(2);
    expect(hitsNeeded(twigSoft, "explosiveAmmo")).toBe(1);
  });

  it("has no hard/soft-side difference for pure explosives (documented game mechanic)", () => {
    const hard: RaidTarget = { kind: "generic", tier: "stone", side: "hard" };
    const soft: RaidTarget = { kind: "generic", tier: "stone", side: "soft" };
    expect(hitsNeeded(hard, "rocket")).toBe(hitsNeeded(soft, "rocket"));
    expect(hitsNeeded(hard, "c4")).toBe(hitsNeeded(soft, "c4"));
  });

  it("matches sourced hit counts for doors", () => {
    expect(hitsNeeded({ kind: "door", door: "woodenDoor" }, "rocket")).toBe(1);
    expect(hitsNeeded({ kind: "door", door: "sheetMetalDoor" }, "rocket")).toBe(2);
    expect(hitsNeeded({ kind: "door", door: "garageDoor" }, "satchel")).toBe(9);
    expect(hitsNeeded({ kind: "door", door: "armoredDoor" }, "explosiveAmmo")).toBe(250);
  });
});

describe("getTargetHp", () => {
  it("returns tier HP for generic pieces and item HP for doors", () => {
    expect(getTargetHp({ kind: "generic", tier: "armored", side: "hard" })).toBe(2000);
    expect(getTargetHp({ kind: "door", door: "garageDoor" })).toBe(600);
  });
});

describe("cheapestCombination", () => {
  it("returns null when no explosives are available", () => {
    const target: RaidTarget = { kind: "generic", tier: "wood", side: "hard" };
    expect(cheapestCombination(target, [])).toBeNull();
  });

  it("matches the known single-explosive sulfur cost when only one type is available", () => {
    const target: RaidTarget = { kind: "generic", tier: "wood", side: "hard" };
    const result = cheapestCombination(target, ["rocket"]);
    expect(result).toEqual({ combination: { rocket: 2 }, totalSulfurCost: 2800 });
  });

  it("never costs more than the cheapest single available explosive", () => {
    const target: RaidTarget = { kind: "generic", tier: "stone", side: "hard" };
    const all = cheapestCombination(target, ["rocket", "satchel", "c4", "beancan", "explosiveAmmo"]);
    const c4Only = cheapestCombination(target, ["c4"]);
    expect(all).not.toBeNull();
    expect(c4Only).not.toBeNull();
    expect(all!.totalSulfurCost).toBeLessThanOrEqual(c4Only!.totalSulfurCost);
  });

  it("picks a single one-hit-kill explosive for twig when available", () => {
    const target: RaidTarget = { kind: "generic", tier: "twig", side: "hard" };
    const result = cheapestCombination(target, ["beancan", "rocket"]);
    expect(result).toEqual({ combination: { beancan: 1 }, totalSulfurCost: 120 });
  });
});
