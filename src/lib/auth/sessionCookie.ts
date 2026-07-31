const BASE_NAME = "authjs.session-token";

/**
 * The cookie Auth.js reads the session from.
 *
 * Auth.js applies the `__Secure-` prefix on HTTPS (browsers only accept that prefix on
 * secure origins), so a hardcoded unprefixed name works on localhost and silently breaks in
 * production: the cookie gets written, the browser keeps it, and Auth.js still sees no
 * session because it is looking under the prefixed name.
 *
 * It also uses the cookie name as the JWT salt, so anything issuing a session by hand has to
 * derive both from the same place — which is why this returns one value used for both.
 */
export function sessionCookieName(isSecure: boolean): string {
  return isSecure ? `__Secure-${BASE_NAME}` : BASE_NAME;
}
