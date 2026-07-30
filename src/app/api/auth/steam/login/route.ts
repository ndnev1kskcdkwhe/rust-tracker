import { NextResponse } from "next/server";
import { buildSteamLoginUrl } from "@/lib/auth/steamOpenId";

export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const returnTo = `${baseUrl}/api/auth/steam/callback`;
  return NextResponse.redirect(buildSteamLoginUrl(returnTo, baseUrl));
}
