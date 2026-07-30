import { describe, expect, it } from "vitest";
import { parseMapSeedFromText } from "./parseMapSeed";

describe("parseMapSeedFromText", () => {
  it("returns null when nothing looks like a seed/size", () => {
    expect(parseMapSeedFromText("My Cool Rust Server")).toBeNull();
    expect(parseMapSeedFromText("[EU] Rust Official 100")).toBeNull();
  });

  it("parses labeled 'size X seed Y'", () => {
    expect(parseMapSeedFromText("My Server | Size: 3500 Seed: 12345")).toEqual({
      size: 3500,
      seed: 12345,
    });
  });

  it("parses labeled 'seed Y size X' (reversed order)", () => {
    expect(parseMapSeedFromText("My Server | Seed 98765 Size 4500")).toEqual({
      size: 4500,
      seed: 98765,
    });
  });

  it("parses 'SIZExSEED' shorthand", () => {
    expect(parseMapSeedFromText("Vanilla 3000x54321 Wipe Sunday")).toEqual({
      size: 3000,
      seed: 54321,
    });
  });

  it("rejects sizes outside the plausible Rust map size range", () => {
    expect(parseMapSeedFromText("Size: 50 Seed: 12345")).toBeNull();
    expect(parseMapSeedFromText("Size: 99999 Seed: 12345")).toBeNull();
  });
});
