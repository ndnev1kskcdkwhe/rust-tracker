import { describe, expect, it } from "vitest";
import {
  batteriesNeeded,
  chargeTime,
  fitBattery,
  getBattery,
  getPowerSource,
  pickBattery,
  sourcesNeeded,
  totalConsumption,
} from "./power";

const small = getBattery("small")!;
const medium = getBattery("medium")!;
const large = getBattery("large")!;
const solar = getPowerSource("largeSolarPanel")!;
const turbine = getPowerSource("windTurbine")!;
const generator = getPowerSource("smallGenerator")!;

describe("totalConsumption", () => {
  it("returns an empty load for no consumers", () => {
    expect(totalConsumption([])).toEqual({ totalDraw: 0, totalItems: 0, lines: [] });
  });

  it("sums a mixed list", () => {
    // 9 × 3 rW furnaces + 2 × 10 rW turrets
    const load = totalConsumption([
      { consumerId: "electricFurnace", count: 9 },
      { consumerId: "autoTurret", count: 2 },
    ]);
    expect(load.totalDraw).toBe(47);
    expect(load.totalItems).toBe(11);
    expect(load.lines.map((l) => l.draw)).toEqual([27, 20]);
  });

  it("merges repeated ids into one line", () => {
    const split = totalConsumption([
      { consumerId: "electricFurnace", count: 2 },
      { consumerId: "electricFurnace", count: 7 },
    ]);
    expect(split.lines).toHaveLength(1);
    expect(split).toEqual(totalConsumption([{ consumerId: "electricFurnace", count: 9 }]));
  });

  it("drops zero-count items instead of listing them", () => {
    const load = totalConsumption([
      { consumerId: "electricFurnace", count: 0 },
      { consumerId: "simpleLight", count: 4 },
    ]);
    expect(load.totalDraw).toBe(4);
    expect(load.lines).toHaveLength(1);
  });

  it("throws on an unknown consumer instead of counting it as 0 rW", () => {
    expect(() => totalConsumption([{ consumerId: "nuclearReactor", count: 1 }])).toThrow(
      /Unknown consumer/
    );
  });

  it("throws on a negative or fractional count", () => {
    expect(() => totalConsumption([{ consumerId: "simpleLight", count: -1 }])).toThrow();
    expect(() => totalConsumption([{ consumerId: "simpleLight", count: 1.5 }])).toThrow();
  });
});

describe("fitBattery", () => {
  it("reports runtime and sustaining input for a load within the ceiling", () => {
    const fit = fitBattery(medium, 27);
    expect(fit.status).toBe("ok");
    expect(fit.overCeilingBy).toBe(0);
    expect(fit.runtimeMinutes).toBeCloseTo(9000 / 27, 6); // 333.33 min
    expect(fit.sustainingInputRW).toBe(33.75); // 27 × 1.25
  });

  it("flags a load over the output ceiling and quotes no runtime", () => {
    const fit = fitBattery(small, 27); // small tops out at 15 rW
    expect(fit.status).toBe("overCeiling");
    expect(fit.overCeilingBy).toBe(12);
    expect(fit.runtimeMinutes).toBeNull();
    // The input figure still holds — it is a property of the load, not of the battery.
    expect(fit.sustainingInputRW).toBe(33.75);
  });

  it("treats a load exactly at the ceiling as fitting", () => {
    const fit = fitBattery(large, 100);
    expect(fit.status).toBe("ok");
    expect(fit.runtimeMinutes).toBe(240); // 24000 / 100
  });

  it("calls an unloaded battery idle rather than infinitely lasting", () => {
    const fit = fitBattery(large, 0);
    expect(fit.status).toBe("idle");
    expect(fit.runtimeMinutes).toBeNull();
    expect(fit.sustainingInputRW).toBe(0);
    expect(fit.overCeilingBy).toBe(0);
  });

  it("rejects a negative draw", () => {
    expect(() => fitBattery(large, -5)).toThrow();
  });
});

describe("pickBattery", () => {
  it("picks the smallest battery whose ceiling covers the draw", () => {
    expect(pickBattery(10)!.battery.id).toBe("small");
    expect(pickBattery(27)!.battery.id).toBe("medium");
    expect(pickBattery(80)!.battery.id).toBe("large");
  });

  it("moves up a size when the smallest one drains too fast", () => {
    expect(pickBattery(10, { minRuntimeMinutes: 40 })!.battery.id).toBe("small"); // 400/10 = 40
    expect(pickBattery(10, { minRuntimeMinutes: 120 })!.battery.id).toBe("medium");
  });

  it("returns null when no single battery can serve the load", () => {
    expect(pickBattery(150)).toBeNull(); // above the large battery's 100 rW ceiling
    expect(pickBattery(100, { minRuntimeMinutes: 600 })).toBeNull(); // 24000/100 = 240 min
  });

  it("picks the smallest battery for no load at all", () => {
    const fit = pickBattery(0);
    expect(fit!.battery.id).toBe("small");
    expect(fit!.status).toBe("idle");
  });
});

describe("batteriesNeeded", () => {
  it("needs none without a load", () => {
    expect(batteriesNeeded(large, 0)).toBe(0);
  });

  it("needs one while the draw fits the ceiling", () => {
    expect(batteriesNeeded(large, 100)).toBe(1);
  });

  it("splits a draw above the ceiling across batteries", () => {
    expect(batteriesNeeded(large, 150)).toBe(2);
    expect(batteriesNeeded(large, 201)).toBe(3);
    expect(batteriesNeeded(small, 27)).toBe(2); // 15 rW each
  });

  it("adds batteries when one has enough output but not enough stored charge", () => {
    // 10 rW for 8 hours = 4800 rWm; a small battery holds 400.
    expect(batteriesNeeded(small, 10, 480)).toBe(12);
    expect(batteriesNeeded(medium, 10, 480)).toBe(1); // 9000 rWm is plenty
  });
});

describe("sourcesNeeded", () => {
  it("sizes generation for a battery-fed circuit at 1.25× the draw", () => {
    const panels = sourcesNeeded(solar, 27); // needs 33.75 rW, panels peak at 20
    expect(panels.requiredInputRW).toBe(33.75);
    expect(panels.countAtPeak).toBe(2);
    expect(panels.countAtWorst).toBeNull(); // panels make 0 rW at night
  });

  it("drops the 25% storage loss when consumers are wired straight to the source", () => {
    const direct = sourcesNeeded(solar, 20, { throughBattery: false });
    expect(direct.requiredInputRW).toBe(20);
    expect(direct.countAtPeak).toBe(1);

    const stored = sourcesNeeded(solar, 20);
    expect(stored.requiredInputRW).toBe(25);
    expect(stored.countAtPeak).toBe(2);
  });

  it("gives a worst-case count only for a source with a floor above zero", () => {
    expect(sourcesNeeded(generator, 27).countAtWorst).toBe(1); // steady 40 rW
    expect(sourcesNeeded(turbine, 27).countAtWorst).toBeNull(); // 0 rW in dead air
  });

  it("does not add a spare generator to float-point dust", () => {
    // 32 / 0.8 is exactly 40 rW, which one 40 rW generator covers.
    const exact = sourcesNeeded(generator, 32);
    expect(exact.requiredInputRW).toBe(40);
    expect(exact.countAtPeak).toBe(1);
    expect(exact.countAtWorst).toBe(1);
  });

  it("needs nothing for no load", () => {
    const none = sourcesNeeded(solar, 0);
    expect(none.countAtPeak).toBe(0);
    expect(none.countAtWorst).toBe(0);
  });
});

describe("chargeTime", () => {
  it("banks 80% of the input when nothing is drawing", () => {
    const charge = chargeTime(large, 100);
    expect(charge.netChargeRWmPerMinute).toBe(80);
    expect(charge.minutesToFull).toBe(300); // 24000 / 80
  });

  it("subtracts a load that runs off the battery while it charges", () => {
    const charge = chargeTime(medium, 100, 27);
    expect(charge.netChargeRWmPerMinute).toBe(53);
    expect(charge.minutesToFull).toBeCloseTo(9000 / 53, 6);
  });

  it("never fills when the input only just sustains the load", () => {
    // 20 rW in banks 16 rWm/min, exactly what a 16 rW load takes back out.
    expect(chargeTime(medium, 20, 16)).toEqual({
      netChargeRWmPerMinute: 0,
      minutesToFull: null,
    });
    expect(chargeTime(medium, 20, 20).minutesToFull).toBeNull();
  });

  it("never fills without input", () => {
    expect(chargeTime(small, 0).minutesToFull).toBeNull();
  });
});
