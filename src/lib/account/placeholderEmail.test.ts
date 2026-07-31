import { describe, expect, it } from "vitest";
import { hasPlaceholderEmail, steamPlaceholderEmail } from "./placeholderEmail";

describe("steamPlaceholderEmail", () => {
  it("derives the address from the SteamID", () => {
    expect(steamPlaceholderEmail("76561197960287930")).toBe("76561197960287930@steamcommunity.com");
  });
});

describe("hasPlaceholderEmail", () => {
  it("is true for an account still carrying its generated address", () => {
    expect(
      hasPlaceholderEmail({ email: "76561197960287930@steamcommunity.com", steamId: "76561197960287930" })
    ).toBe(true);
  });

  it("is false once a real address is set", () => {
    expect(hasPlaceholderEmail({ email: "player@example.com", steamId: "76561197960287930" })).toBe(false);
  });

  it("is false for accounts with no Steam linked at all", () => {
    expect(hasPlaceholderEmail({ email: "player@example.com", steamId: null })).toBe(false);
  });

  it("does not treat another user's placeholder as this user's", () => {
    // A suffix check would wrongly accept this; the address must match *this* account's id.
    expect(
      hasPlaceholderEmail({ email: "11111111111111111@steamcommunity.com", steamId: "76561197960287930" })
    ).toBe(false);
  });
});
