import { describe, expect, it } from "vitest";
import { extractSteamId64FromText } from "./extractSteamId";

describe("extractSteamId64FromText", () => {
  it("finds a SteamID64 alongside other text (e.g. Rust's F7 report screen)", () => {
    expect(extractSteamId64FromText("123\n76561198782182863")).toBe("76561198782182863");
  });

  it("returns null when no 17-digit number is present", () => {
    expect(extractSteamId64FromText("no id here, just 12345")).toBeNull();
  });

  it("ignores numbers that aren't exactly 17 digits", () => {
    expect(extractSteamId64FromText("765611987821828631")).toBeNull(); // 18 digits
    expect(extractSteamId64FromText("7656119878218286")).toBeNull(); // 16 digits
  });

  it("returns the first match when there are multiple 17-digit numbers", () => {
    expect(extractSteamId64FromText("76561198782182863 76561197960287930")).toBe("76561198782182863");
  });
});
