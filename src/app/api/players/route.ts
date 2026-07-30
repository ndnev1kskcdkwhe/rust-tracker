import { NextResponse } from "next/server";
import { getPlayerProfile } from "@/lib/players/getPlayerProfile";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q");
  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Параметр q обов'язковий" }, { status: 400 });
  }

  const result = await getPlayerProfile(query);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ profile: result.profile, fromCache: result.fromCache });
}
