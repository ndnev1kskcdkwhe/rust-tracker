import { describe, expect, it } from "vitest";
import { estimateNextWipe, parseWipeCycleFromText } from "./parseWipeSchedule";

describe("parseWipeCycleFromText", () => {
  it("returns null when the name says nothing about a cycle", () => {
    expect(parseWipeCycleFromText("My Cool Rust Server")).toBeNull();
  });

  it("detects weekly", () => {
    expect(parseWipeCycleFromText("EU Weekly Wipe Vanilla")).toBe("weekly");
  });

  it("detects biweekly (with or without a hyphen)", () => {
    expect(parseWipeCycleFromText("NA Biweekly PvP")).toBe("biweekly");
    expect(parseWipeCycleFromText("NA Bi-Weekly PvP")).toBe("biweekly");
  });

  it("detects monthly", () => {
    expect(parseWipeCycleFromText("EU Central Official Monthly")).toBe("monthly");
  });

  it("prefers biweekly over weekly when both substrings could match", () => {
    expect(parseWipeCycleFromText("Biweekly Wipe Server")).toBe("biweekly");
  });
});

describe("estimateNextWipe", () => {
  it("returns null without a last-wipe time or without a detected cycle", () => {
    expect(estimateNextWipe(null, "weekly")).toBeNull();
    expect(estimateNextWipe("2026-07-01T00:00:00.000Z", null)).toBeNull();
  });

  it("adds 7 days for weekly", () => {
    expect(estimateNextWipe("2026-07-01T00:00:00.000Z", "weekly")).toBe("2026-07-08T00:00:00.000Z");
  });

  it("adds 14 days for biweekly", () => {
    expect(estimateNextWipe("2026-07-01T00:00:00.000Z", "biweekly")).toBe("2026-07-15T00:00:00.000Z");
  });

  it("adds 30 days for monthly", () => {
    expect(estimateNextWipe("2026-07-01T00:00:00.000Z", "monthly")).toBe("2026-07-31T00:00:00.000Z");
  });
});
