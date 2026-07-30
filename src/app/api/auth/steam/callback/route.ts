import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { verifySteamCallback } from "@/lib/auth/steamOpenId";
import { getPlayerSummary } from "@/lib/external/steam";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "authjs.session-token";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const loginErrorUrl = `${baseUrl}/login?error=SteamAuth`;

  const steamId = await verifySteamCallback(url.searchParams);
  if (!steamId) {
    return NextResponse.redirect(loginErrorUrl);
  }

  let profile: { name: string; avatarUrl: string } | null = null;
  try {
    const summary = await getPlayerSummary(steamId);
    if (summary) {
      profile = { name: summary.name, avatarUrl: summary.avatarUrl };
    }
  } catch {
    // Steam profile fetch failing shouldn't block login — we still have a verified SteamID.
  }

  const dbUser = await prisma.user.upsert({
    where: { steamId },
    update: {
      name: profile?.name,
      avatarUrl: profile?.avatarUrl,
    },
    create: {
      steamId,
      email: `${steamId}@steamcommunity.com`,
      name: profile?.name,
      avatarUrl: profile?.avatarUrl,
      subscription: { create: {} },
    },
  });

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET must be set");
  }

  const sessionToken = await encode({
    secret,
    salt: SESSION_COOKIE_NAME,
    token: {
      id: dbUser.id,
      sub: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      picture: dbUser.avatarUrl,
    },
  });

  const response = NextResponse.redirect(baseUrl);
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: baseUrl.startsWith("https://"),
  });
  return response;
}
