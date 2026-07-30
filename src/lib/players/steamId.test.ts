import { describe, expect, it } from "vitest";
import { parseSteamIdInput } from "./steamId";

describe("parseSteamIdInput", () => {
  it("returns null for empty/whitespace input", () => {
    expect(parseSteamIdInput("")).toBeNull();
    expect(parseSteamIdInput("   ")).toBeNull();
  });

  it("recognizes a raw SteamID64", () => {
    expect(parseSteamIdInput("76561197960287930")).toEqual({
      type: "steamId64",
      value: "76561197960287930",
    });
  });

  it("extracts a SteamID64 from a profile URL", () => {
    expect(parseSteamIdInput("https://steamcommunity.com/profiles/76561197960287930")).toEqual({
      type: "steamId64",
      value: "76561197960287930",
    });
    expect(parseSteamIdInput("steamcommunity.com/profiles/76561197960287930/")).toEqual({
      type: "steamId64",
      value: "76561197960287930",
    });
  });

  it("extracts a vanity name from a vanity URL", () => {
    expect(parseSteamIdInput("https://steamcommunity.com/id/GabeLoganNewell")).toEqual({
      type: "vanity",
      value: "GabeLoganNewell",
    });
    expect(parseSteamIdInput("steamcommunity.com/id/GabeLoganNewell/")).toEqual({
      type: "vanity",
      value: "GabeLoganNewell",
    });
  });

  it("treats a bare name as a vanity name", () => {
    expect(parseSteamIdInput("GabeLoganNewell")).toEqual({ type: "vanity", value: "GabeLoganNewell" });
  });

  it("does not misclassify a non-17-digit number as a SteamID64", () => {
    expect(parseSteamIdInput("12345")).toEqual({ type: "vanity", value: "12345" });
  });
});
