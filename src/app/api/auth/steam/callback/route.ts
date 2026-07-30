import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { auth } from "@/auth";
import { verifySteamCallback } from "@/lib/auth/steamOpenId";
import { getPlayerSummary } from "@/lib/external/steam";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "authjs.session-token";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const isLinking = url.searchParams.get("mode") === "link";
  const errorRedirect = isLinking ? `${baseUrl}/account?error=SteamLink` : `${baseUrl}/login?error=SteamAuth`;

  const steamId = await verifySteamCallback(url.searchParams);
  if (!steamId) {
    return NextResponse.redirect(errorRedirect);
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

  if (isLinking) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(`${baseUrl}/login`);
    }

    const takenBy = await prisma.user.findUnique({ where: { steamId } });
    if (takenBy && takenBy.id !== session.user.id) {
      return NextResponse.redirect(`${baseUrl}/account?error=SteamTaken`);
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { steamId, name: profile?.name, avatarUrl: profile?.avatarUrl },
    });

    return NextResponse.redirect(`${baseUrl}/account`);
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
