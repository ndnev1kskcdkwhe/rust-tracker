import { describe, expect, it } from "vitest";
import { sessionCookieName } from "./sessionCookie";

describe("sessionCookieName", () => {
  it("uses the __Secure- prefix on https", () => {
    // The bug this guards: a hardcoded unprefixed name works on localhost and silently
    // breaks in production — Steam login wrote the cookie, but Auth.js looked under the
    // prefixed name and saw no session, so the user came back logged out.
    expect(sessionCookieName(true)).toBe("__Secure-authjs.session-token");
  });

  it("drops the prefix on plain http, where browsers reject __Secure-", () => {
    expect(sessionCookieName(false)).toBe("authjs.session-token");
  });
});
