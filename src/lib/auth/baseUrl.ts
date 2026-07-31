/**
 * Resolves the site's own base URL ("https://example.com", no trailing slash).
 *
 * Explicit `NEXTAUTH_URL` always wins. Without it we derive the origin from the incoming
 * request, which is what makes the Steam OpenID flow work on a freshly deployed domain
 * before anyone has configured anything — and on preview deployments, which each get their
 * own hostname. Deriving matters here specifically because Steam validates that `return_to`
 * lives under `realm`, so both must match the host the user actually came in on; a hardcoded
 * or stale value silently breaks login rather than failing loudly.
 *
 * Trusting the Host header is the same trade-off Auth.js makes behind `AUTH_TRUST_HOST`:
 * it's safe when a platform (Vercel) sets the header from the real request, and it's why
 * an explicit `NEXTAUTH_URL` still takes precedence for setups that terminate elsewhere.
 */
export function getBaseUrl(request: Request): string {
  const configured = process.env.NEXTAUTH_URL;
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}
