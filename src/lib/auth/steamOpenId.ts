/**
 * Steam "Sign in with Steam" is OpenID 2.0, not OAuth — Steam has never offered an OAuth
 * login flow. This is a direct implementation of the standard OpenID 2.0 verification dance
 * against steamcommunity.com, used instead of a NextAuth "oauth"-type provider because
 * @auth/core's OAuth handler unconditionally performs a real authorization-code-for-token
 * exchange before any custom hook can run, and Steam's callback never includes a `code`
 * param — confirmed live via `OperationProcessingError: no authorization code in
 * "callbackParameters"` when using the authjs-steam-provider package, which relies on
 * exactly that (now unsupported) trick.
 */

const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const CLAIMED_ID_PATTERN = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

/** Builds the URL to redirect the user to in order to start the Steam login flow. */
export function buildSteamLoginUrl(returnToUrl: string, realm: string): string {
  const url = new URL(STEAM_OPENID_ENDPOINT);
  url.searchParams.set("openid.ns", "http://specs.openid.net/auth/2.0");
  url.searchParams.set("openid.mode", "checkid_setup");
  url.searchParams.set("openid.return_to", returnToUrl);
  url.searchParams.set("openid.realm", realm);
  url.searchParams.set("openid.identity", "http://specs.openid.net/auth/2.0/identifier_select");
  url.searchParams.set("openid.claimed_id", "http://specs.openid.net/auth/2.0/identifier_select");
  return url.toString();
}

/**
 * Verifies a Steam OpenID callback by posting the params back to Steam with
 * `openid.mode=check_authentication`, per the OpenID 2.0 spec. Returns the verified
 * SteamID64, or null if the callback wasn't a genuine, valid Steam response.
 */
export async function verifySteamCallback(params: URLSearchParams): Promise<string | null> {
  if (params.get("openid.ns") !== "http://specs.openid.net/auth/2.0") {
    return null;
  }

  const claimedId = params.get("openid.claimed_id");
  const match = claimedId?.match(CLAIMED_ID_PATTERN);
  if (!match) {
    return null;
  }

  const verificationParams = new URLSearchParams(params);
  verificationParams.set("openid.mode", "check_authentication");

  const res = await fetch(STEAM_OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verificationParams.toString(),
  });
  if (!res.ok) {
    return null;
  }
  const body = await res.text();
  const isValid = body.split("\n").some((line) => line.trim() === "is_valid:true");
  if (!isValid) {
    return null;
  }

  return match[1];
}
