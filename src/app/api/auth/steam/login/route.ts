import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildSteamLoginUrl } from "@/lib/auth/steamOpenId";
import { getBaseUrl } from "@/lib/auth/baseUrl";

/** `?mode=link` — prompts an already-logged-in (email/password) account to link a Steam
 * account instead of logging in as a separate one. The mode round-trips through Steam's
 * OpenID flow via the return_to URL's own query string (Steam only appends its own
 * openid.* params, it doesn't strip existing ones), so the callback route can tell which
 * flow this is. */
export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);
  const mode = new URL(request.url).searchParams.get("mode");

  if (mode === "link") {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(`${baseUrl}/login`);
    }
  }

  const returnTo =
    mode === "link"
      ? `${baseUrl}/api/auth/steam/callback?mode=link`
      : `${baseUrl}/api/auth/steam/callback`;
  return NextResponse.redirect(buildSteamLoginUrl(returnTo, baseUrl));
}
