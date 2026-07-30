import { NextResponse } from "next/server";
import { getServerSearch } from "@/lib/servers/getServerSearch";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q");
  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Параметр q обов'язковий" }, { status: 400 });
  }

  const result = await getServerSearch(query);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ servers: result.servers, fromCache: result.fromCache });
}
