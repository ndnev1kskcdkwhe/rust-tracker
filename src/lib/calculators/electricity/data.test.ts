import { describe, expect, it } from "vitest";
import {
  BATTERIES,
  CONSUMERS,
  ELECTRICAL_BRANCH,
  LOGIC_GATES,
  PASSIVE_COMPONENTS,
  PIPE_CONTAINERS,
  POWER_SOURCES,
  ROOT_COMBINER,
  passthroughOutput,
  sustainingInput,
} from "./data";

/**
 * A duplicate id is silent: the Map lookups in power.ts keep the last entry and the earlier
 * one becomes unreachable. Worth a test now that the catalogue grows from several sources.
 */
describe("catalogue integrity", () => {
  const lists = {
    CONSUMERS,
    BATTERIES,
    POWER_SOURCES,
    PASSIVE_COMPONENTS,
    PIPE_CONTAINERS,
  } as const;

  for (const [name, list] of Object.entries(lists)) {
    it(`has unique ids in ${name}`, () => {
      const ids = list.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  }

  it("gives every consumer a positive draw", () => {
    for (const consumer of CONSUMERS) {
      expect(consumer.consumption, consumer.id).toBeGreaterThan(0);
    }
  });

  it("keeps passive components out of CONSUMERS", () => {
    const consumerIds = new Set(CONSUMERS.map((c) => c.id));
    for (const passive of PASSIVE_COMPONENTS) {
      expect(consumerIds.has(passive.id), passive.id).toBe(false);
    }
  });
});

describe("distribution mechanics", () => {
  it("gives Branch Out what it asks for and passes the rest on", () => {
    expect(ELECTRICAL_BRANCH.split(20, 3)).toEqual({ branchOut: 3, powerOut: 17 });
  });

  it("caps Branch Out at what actually arrives", () => {
    expect(ELECTRICAL_BRANCH.split(2, 10)).toEqual({ branchOut: 2, powerOut: 0 });
  });

  it("sums both inputs of a root combiner", () => {
    expect(ROOT_COMBINER.combine(20, 40)).toBe(60);
  });

  it("hands a passthrough consumer's leftover to the next one", () => {
    expect(passthroughOutput(20, 3)).toBe(17); // heater at 3 rW feeding the next
    expect(passthroughOutput(2, 3)).toBe(0); // never negative
  });
});

describe("logic gates", () => {
  it("opens AND only on both inputs", () => {
    expect(LOGIC_GATES.and(10, 5)).toBe(10);
    expect(LOGIC_GATES.and(10, 0)).toBe(0);
  });

  it("opens OR on either input", () => {
    expect(LOGIC_GATES.or(10, 0)).toBe(10);
    expect(LOGIC_GATES.or(0, 0)).toBe(0);
  });

  it("opens XOR on exactly one input", () => {
    expect(LOGIC_GATES.xor(10, 0)).toBe(10);
    expect(LOGIC_GATES.xor(10, 5)).toBe(0);
  });

  it("closes a blocker while its block input is live", () => {
    expect(LOGIC_GATES.blocker(10, 0)).toBe(10);
    expect(LOGIC_GATES.blocker(10, 1)).toBe(0);
  });
});

describe("sustainingInput", () => {
  it("adds the 25% a battery loses on the way in", () => {
    expect(sustainingInput(20)).toBeCloseTo(25, 9);
    expect(sustainingInput(0)).toBe(0);
  });
});
